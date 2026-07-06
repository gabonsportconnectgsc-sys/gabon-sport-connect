/**
 * ══════════════════════════════════════════════════════════════════════
 *  STRUCTURES-MANAGER.JS — Gestionnaire de persistance des structures
 *  Gabon Sport Connect · Module 3/7 · 2026
 *
 *  Dépendances : firebase-init.js (window.db, window.storage),
 *  realtime-sync-module.js (window.realtimeSync), disciplines-config.js.
 *
 *  Expose window.structuresManager, interface attendue par
 *  structures-form-builder.js :
 *    .create(data)        -> Promise<id>
 *    .update(id, data)    -> Promise<void>
 *    .remove(id)          -> Promise<void>   (archivage soft-delete)
 *    .get(id)             -> Promise<structure|null>
 *    .list()              -> structure[]     (cache temps réel)
 *    .onUpdate(cb)         -> abonnement aux mises à jour de liste
 *    .uploadLogo(id, file) -> Promise<url>
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const COLLECTION = 'structuresSportives';
  let _cache = [];
  const _listeners = [];

  /* ══════════════════════════════════════════════════════════════════
   * 1. AUTHENTIFICATION (alignement avec le reste de l'app)
   * ══════════════════════════════════════════════════════════════════ */
  async function withAuth(fn) {
    if (typeof window.ensureFirebaseAuthViaSupabase === 'function') {
      try { await window.ensureFirebaseAuthViaSupabase(); } catch (e) { /* best effort */ }
    }
    return fn();
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. CRUD
   * ══════════════════════════════════════════════════════════════════ */
  async function create(data) {
    if (!window.db) throw new Error('Firestore (window.db) indisponible');
    return withAuth(async () => {
      const ref = window.db.collection(COLLECTION).doc();
      const payload = {
        ...data,
        status: data.status || 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        addedBy: (window.firebase && window.firebase.auth && window.firebase.auth().currentUser)
          ? window.firebase.auth().currentUser.uid : null
      };
      await ref.set(payload);
      return ref.id;
    });
  }

  async function update(id, data) {
    if (!window.db) throw new Error('Firestore (window.db) indisponible');
    if (!id) throw new Error('id requis pour update()');
    return withAuth(async () => {
      await window.db.collection(COLLECTION).doc(id).set({
        ...data,
        updatedAt: new Date()
      }, { merge: true });
    });
  }

  async function remove(id) {
    if (!window.db) throw new Error('Firestore (window.db) indisponible');
    return withAuth(async () => {
      await window.db.collection(COLLECTION).doc(id).update({
        status: 'deleted',
        deletedAt: new Date()
      });
    });
  }

  async function get(id) {
    if (!window.db) return null;
    try {
      const doc = await window.db.collection(COLLECTION).doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (err) {
      console.error('[structuresManager] get() erreur:', err);
      return null;
    }
  }

  function list() {
    return _cache.slice();
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. UPLOAD LOGO / PHOTO
   * ══════════════════════════════════════════════════════════════════ */
  async function uploadLogo(id, file) {
    if (!window.storage) throw new Error('Firebase Storage indisponible');
    return withAuth(async () => {
      const path = `structures/${id}/logo_${Date.now()}_${file.name}`;
      const ref = window.storage.ref(path);
      const snapshot = await ref.put(file);
      const url = await snapshot.ref.getDownloadURL();
      await update(id, { logoUrl: url });
      return url;
    });
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. TEMPS RÉEL — synchronisation avec realtime-sync-module.js
   * ══════════════════════════════════════════════════════════════════ */
  function notifyListeners() {
    _listeners.forEach(cb => { try { cb(_cache.slice()); } catch (e) { console.error(e); } });
  }

  function onUpdate(cb) {
    if (typeof cb === 'function') _listeners.push(cb);
    // Renvoie immédiatement l'état courant si déjà disponible
    if (_cache.length) cb(_cache.slice());
  }

  function bootstrapSync() {
    if (!window.realtimeSync) {
      console.warn('[structuresManager] realtimeSync indisponible — pas de synchronisation temps réel');
      return;
    }
    window.realtimeSync.onUpdate(COLLECTION, (docs) => {
      _cache = (docs || []).filter(d => d.status !== 'deleted');
      notifyListeners();
    });
    // Récupère le cache déjà chargé par realtimeSync si disponible
    const existing = window.realtimeSync.getCache && window.realtimeSync.getCache(COLLECTION);
    if (Array.isArray(existing) && existing.length) {
      _cache = existing.filter(d => d.status !== 'deleted');
      notifyListeners();
    }
  }

  if (window._firebaseReady) bootstrapSync();
  document.addEventListener('firebase-ready', bootstrapSync);
  // Sécurité : réessaye après un court délai si realtimeSync se charge après ce module
  setTimeout(() => { if (!_listeners.length === false && !_cache.length) bootstrapSync(); }, 800);

  /* ══════════════════════════════════════════════════════════════════
   * 5. STATISTIQUES
   * ══════════════════════════════════════════════════════════════════ */
  function stats() {
    const byDiscipline = {}, byType = {};
    _cache.forEach(s => {
      if (s.discipline) byDiscipline[s.discipline] = (byDiscipline[s.discipline] || 0) + 1;
      if (s.type) byType[s.type] = (byType[s.type] || 0) + 1;
    });
    return { total: _cache.length, byDiscipline, byType };
  }

  function countByState() {
    let linked = 0, orphaned = 0;
    _cache.forEach(s => {
      if (s.linkedUserId) linked++;
      else orphaned++;
    });
    return { linked, orphaned, total: _cache.length };
  }

  /* ══════════════════════════════════════════════════════════════════
   * 6. EXPORT
   * ══════════════════════════════════════════════════════════════════ */
  window.structuresManager = {
    create, update, remove, get, list,
    uploadLogo, onUpdate, stats, countByState
  };

})(window);
