/**
 * ═══════════════════════════════════════════════════════════════
 * GABON SPORT CONNECT — Sync Config (App Publique)
 * config/gsc-sync-config.js  |  v1.0  |  19 Juin 2026
 * ═══════════════════════════════════════════════════════════════
 *
 * Démarre les listeners Firestore temps réel pour l'app publique
 * (index.html) et expose les données via l'événement
 * `gsc-data-synced`.
 *
 * Dépend de :
 *   • config/firebase-init.js  →  déclenche `firebase-ready`
 *   • realtime-sync-module.js  →  window.realtimeSync
 */

(function () {
  'use strict';

  /* ── Collections à surveiller ── */
  const COLLECTIONS = ['sports', 'clubs', 'championships', 'users', 'players', 'documents', 'matchs'];

  /* ── Cache partagé ── */
  const _cache = {};

  /* ── Dispatcher d'événement ── */
  function dispatch() {
    window.dispatchEvent(new CustomEvent('gsc-data-synced', {
      detail: {
        sports:        _cache.sports        || [],
        clubs:         _cache.clubs         || [],
        championships: _cache.championships || [],
        actors:        _cache.users         || [],
        players:       _cache.players       || [],
        documents:     _cache.documents     || [],
        matches:       _cache.matchs        || [],
        config:        {}
      }
    }));
  }

  /* ── Démarrer après Firebase ── */
  window.addEventListener('firebase-ready', function (evt) {
    const db = evt.detail?.db || window.gscDb;
    if (!db) {
      console.error('[GSC-SyncConfig] Firestore db non disponible');
      return;
    }

    /* Initialiser le module de sync s'il est chargé */
    if (window.realtimeSync) {
      window.realtimeSync.initialize(db);
    }

    /* Démarrer un listener par collection */
    COLLECTIONS.forEach(col => {
      try {
        let query = db.collection(col);

        /* Options par collection */
        if (col === 'users')   query = query.where('status', '!=', 'deleted');
        if (col === 'matchs')  query = query.orderBy('date', 'desc');
        if (col === 'players') query = query.orderBy('nom',  'asc');

        query.onSnapshot(
          snapshot => {
            _cache[col] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            console.log(`[GSC-Sync] 🔄 "${col}" → ${_cache[col].length} doc(s)`);
            dispatch();
          },
          err => {
            /* Certaines collections peuvent ne pas exister — ignorer silencieusement */
            if (err.code !== 'permission-denied' && err.code !== 'not-found') {
              console.warn(`[GSC-Sync] ⚠️ "${col}": ${err.message}`);
            }
          }
        );
      } catch (e) {
        console.warn(`[GSC-Sync] Impossible d'écouter "${col}": ${e.message}`);
      }
    });

    /* Signaler que le SyncManager est prêt */
    window.dispatchEvent(new CustomEvent('gsc-sync-ready', {
      detail: { sync: window.realtimeSync || null }
    }));

    console.log('[GSC-SyncConfig] ✅ Tous les listeners démarrés');
  });

})();
