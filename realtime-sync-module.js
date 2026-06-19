/**
 * ═══════════════════════════════════════════════════════════════
 * GABON SPORT CONNECT — Real-Time Sync Module
 * realtime-sync-module.js  |  v1.0  |  19 Juin 2026
 * ═══════════════════════════════════════════════════════════════
 *
 * Ce module fournit la synchronisation en temps réel entre
 * le panel admin (admin.html) et l'app publique (index.html)
 * via Firebase Firestore `onSnapshot`.
 *
 * USAGE:
 *   window.realtimeSync.initialize(db);
 *   window.realtimeSync.watchPlayers(callback);
 *   window.realtimeSync.watchMatches(callback);
 *   await window.realtimeSync.saveDocument('users', id, data);
 *   await window.realtimeSync.deleteDocument('matchs', id);
 */

(function (global) {
  'use strict';

  /* ── Logs ── */
  const logs = [];
  function log(msg, level = 'info') {
    const entry = { ts: new Date().toISOString(), level, msg };
    logs.push(entry);
    if (logs.length > 200) logs.shift();
    const prefix = { info: '🔵', warn: '🟡', error: '🔴', success: '🟢' }[level] || '⚪';
    console[level === 'error' ? 'error' : 'log'](`[GSC-Sync] ${prefix} ${msg}`);
  }
  global.syncLogs = logs;

  /* ── Offline Queue ── */
  const QUEUE_KEY = 'gsc_offline_queue';
  function loadQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function saveQueue(q) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
    catch (e) { log('Queue storage error: ' + e.message, 'warn'); }
  }

  /* ── Status indicator (optionnel) ── */
  function showSyncUI(msg = 'Synchronisation…') {
    let el = document.getElementById('gsc-sync-badge');
    if (!el) return;
    el.style.display = 'flex';
    const span = el.querySelector('.gsc-sync-label');
    if (span) span.textContent = msg;
  }
  function hideSyncUI() {
    const el = document.getElementById('gsc-sync-badge');
    if (el) setTimeout(() => { el.style.display = 'none'; }, 800);
  }

  /* ════════════════════════════════════════════════════════
   *  SyncManager — classe principale
   * ════════════════════════════════════════════════════════ */
  class SyncManager {
    constructor() {
      this.db = null;
      this.listeners = {};   // collection → unsubscribe fn
      this.cache = {};       // collection → Array
      this.offlineQueue = loadQueue();
      this._ready = false;
    }

    /* ── initialize ── */
    initialize(firestoreDb) {
      if (!firestoreDb) { log('initialize() : db requis', 'error'); return; }
      this.db = firestoreDb;
      this._ready = true;
      log('SyncManager initialisé ✓', 'success');

      // Écouter les changements de connectivité
      window.addEventListener('online',  () => this._flushQueue());
      window.addEventListener('offline', () => log('Mode hors-ligne activé', 'warn'));

      // Tenter de vider la queue dès le départ
      if (navigator.onLine) this._flushQueue();
    }

    /* ── watchCollection (générique) ── */
    watchCollection(collection, callback, options = {}) {
      if (!this._ready) { log('Non initialisé — appeler initialize(db) d\'abord', 'error'); return; }
      if (this.listeners[collection]) {
        log(`Listener déjà actif sur "${collection}"`, 'warn');
        return;
      }

      let query = this.db.collection(collection);
      if (options.where)   query = query.where(options.where.field, options.where.op, options.where.value);
      if (options.orderBy) query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
      if (options.limit)   query = query.limit(options.limit);

      log(`Démarrage listener "${collection}"…`);

      const unsubscribe = query.onSnapshot(
        (snapshot) => {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          this.cache[collection] = docs;
          log(`"${collection}" mis à jour — ${docs.length} doc(s)`, 'success');
          try { callback(docs, snapshot); }
          catch (err) { log(`Callback error "${collection}": ${err.message}`, 'error'); }
        },
        (err) => {
          log(`Erreur snapshot "${collection}": ${err.message}`, 'error');
        }
      );

      this.listeners[collection] = unsubscribe;
      return unsubscribe;
    }

    /* ── Raccourcis métier ── */
    watchPlayers(callback) {
      return this.watchCollection('users', callback, {
        orderBy: { field: 'nom', direction: 'asc' }
      });
    }

    watchMatches(callback) {
      return this.watchCollection('matchs', callback, {
        orderBy: { field: 'date', direction: 'desc' }
      });
    }

    watchClubs(callback) {
      return this.watchCollection('clubs', callback);
    }

    watchSports(callback) {
      return this.watchCollection('sports', callback);
    }

    /* ── saveDocument ── */
    async saveDocument(collection, docId, data) {
      const payload = { ...data, updatedAt: new Date().toISOString() };
      delete payload.id; // Firestore n'a pas besoin du champ id

      if (!navigator.onLine || !this._ready) {
        log(`Hors-ligne — document queued: ${collection}/${docId}`, 'warn');
        this._enqueue({ op: 'set', collection, docId, data: payload });
        return { queued: true };
      }

      try {
        showSyncUI('Sauvegarde…');
        const ref = this.db.collection(collection).doc(docId);
        await ref.set(payload, { merge: true });
        log(`Sauvegardé: ${collection}/${docId}`, 'success');
        hideSyncUI();
        return { success: true };
      } catch (err) {
        log(`Erreur save ${collection}/${docId}: ${err.message}`, 'error');
        hideSyncUI();
        throw err;
      }
    }

    /* ── deleteDocument ── */
    async deleteDocument(collection, docId) {
      if (!navigator.onLine || !this._ready) {
        this._enqueue({ op: 'delete', collection, docId });
        return { queued: true };
      }
      try {
        showSyncUI('Suppression…');
        await this.db.collection(collection).doc(docId).delete();
        log(`Supprimé: ${collection}/${docId}`, 'success');
        hideSyncUI();
        return { success: true };
      } catch (err) {
        log(`Erreur delete ${collection}/${docId}: ${err.message}`, 'error');
        hideSyncUI();
        throw err;
      }
    }

    /* ── stopListening ── */
    stopListening(collection) {
      if (collection) {
        if (this.listeners[collection]) {
          this.listeners[collection]();
          delete this.listeners[collection];
          log(`Listener "${collection}" arrêté`);
        }
      } else {
        Object.entries(this.listeners).forEach(([col, unsub]) => {
          unsub();
          log(`Listener "${col}" arrêté`);
        });
        this.listeners = {};
      }
    }

    /* ── forceSync ── */
    forceSync() {
      log('Sync forcée…');
      if (navigator.onLine) this._flushQueue();
      else log('Hors-ligne — sync impossible pour l\'instant', 'warn');
    }

    /* ── getCache ── */
    getCache(collection) {
      return this.cache[collection] || [];
    }

    /* ── Offline queue internals ── */
    _enqueue(op) {
      this.offlineQueue.push({ ...op, queuedAt: new Date().toISOString() });
      saveQueue(this.offlineQueue);
      log(`Opération queued (${this.offlineQueue.length} en attente)`);
    }

    async _flushQueue() {
      if (!this.offlineQueue.length || !this._ready) return;
      log(`Vidage queue — ${this.offlineQueue.length} opération(s)…`);
      const toProcess = [...this.offlineQueue];
      this.offlineQueue = [];
      saveQueue([]);

      for (const op of toProcess) {
        try {
          if (op.op === 'set') {
            await this.db.collection(op.collection).doc(op.docId).set(op.data, { merge: true });
            log(`Queue: set ${op.collection}/${op.docId} ✓`, 'success');
          } else if (op.op === 'delete') {
            await this.db.collection(op.collection).doc(op.docId).delete();
            log(`Queue: delete ${op.collection}/${op.docId} ✓`, 'success');
          }
        } catch (err) {
          log(`Queue error: ${err.message} — remis en queue`, 'error');
          this.offlineQueue.push(op);
        }
      }
      saveQueue(this.offlineQueue);
      if (this.offlineQueue.length === 0) log('Queue vidée avec succès ✓', 'success');
    }
  }

  /* ── Export global ── */
  const instance = new SyncManager();
  global.realtimeSync = instance;
  global.getGSCSync   = () => instance;

  log('realtime-sync-module.js chargé ✓', 'success');

})(window);
