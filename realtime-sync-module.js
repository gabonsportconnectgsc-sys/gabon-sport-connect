/* ═══════════════════════════════════════════════════════════════
   REALTIME-SYNC-MODULE.JS — Cache temps réel par collection
   Utilisé par admin-controller.js (et potentiellement index.html).
   Expose window.realtimeSync = { start, getCache, onUpdate, stopAll }
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const _cache = {};      // { collectionName: [ {id,...}, ... ] }
  const _unsub = {};      // { collectionName: unsubscribeFn }
  const _listeners = {};  // { collectionName: [callback, ...] }
  let _activeSyncs = 0;

  function setBadge(active) {
    const badge = document.getElementById('gsc-sync-badge');
    if (!badge) return;
    if (active) { badge.style.display = 'flex'; }
    else if (_activeSyncs <= 0) { badge.style.display = 'none'; }
  }

  function startCollection(name) {
    if (_unsub[name]) return; // déjà actif
    if (!window.db) { console.warn('realtimeSync: Firestore (window.db) non disponible pour', name); return; }
    _activeSyncs++;
    setBadge(true);
    try {
      _unsub[name] = window.db.collection(name).onSnapshot(
        (snap) => {
          _cache[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          (_listeners[name] || []).forEach(cb => {
            try { cb(_cache[name]); } catch (e) { console.error('realtimeSync listener error:', e); }
          });
          document.dispatchEvent(new CustomEvent('gsc-data-synced', { detail: { collection: name, data: _cache[name] } }));
          _activeSyncs = Math.max(0, _activeSyncs - 1);
          setBadge(false);
        },
        (err) => {
          console.error('realtimeSync: erreur sur la collection', name, err);
          _activeSyncs = Math.max(0, _activeSyncs - 1);
          setBadge(false);
          // Ne pas laisser les abonnés bloqués indéfiniment : on les notifie
          // avec le cache existant (ou un tableau vide) pour qu'ils puissent
          // au moins retomber sur leur logique de secours (ex: seed côté admin).
          _cache[name] = _cache[name] || [];
          (_listeners[name] || []).forEach(cb => {
            try { cb(_cache[name]); } catch (e) { console.error('realtimeSync listener error:', e); }
          });
          document.dispatchEvent(new CustomEvent('gsc-sync-error', { detail: { collection: name, error: err } }));
        }
      );
    } catch (e) {
      console.error('realtimeSync: impossible de démarrer la sync sur', name, e);
      _activeSyncs = Math.max(0, _activeSyncs - 1);
      setBadge(false);
    }
  }

  function onUpdate(name, cb) {
    _listeners[name] = _listeners[name] || [];
    _listeners[name].push(cb);
    startCollection(name);
    if (_cache[name]) cb(_cache[name]); // valeur immédiate si déjà en cache
  }

  function stopAll() {
    Object.keys(_unsub).forEach(name => { try { _unsub[name](); } catch (e) {} });
    Object.keys(_unsub).forEach(name => delete _unsub[name]);
  }

  window.realtimeSync = {
    start(names) { (names || ['users']).forEach(startCollection); },
    getCache(name) { return _cache[name] || []; },
    onUpdate,
    stopAll
  };

  function bootstrap() {
    window.realtimeSync.start(['users', 'matchs', 'sitesSportifs', 'actualites']);
  }

  if (window._firebaseReady) bootstrap();
  document.addEventListener('firebase-ready', bootstrap);
})();
