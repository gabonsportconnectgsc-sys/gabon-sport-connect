/* ═══════════════════════════════════════════════════════════════
   GSC-OFFLINE-CACHE.JS — Cache des données réelles (IndexedDB)
   ═══════════════════════════════════════════════════════════════
   Ce script vient compléter le Service Worker : celui-ci met en cache
   le CODE de l'app (HTML/JS/CSS/tuiles carte), mais pas les DONNÉES
   (acteurs, sites, actualités) qui viennent de Firestore.

   Sans ce fichier, l'app s'ouvre bien hors ligne (grâce au SW) mais
   loadActors()/loadSites()/loadNewsFromDb() retombent uniquement sur
   les données "seed" statiques (GSC_SEED_ACTORS, GSC_SITES_DATA,
   GSC_SEED_NEWS) — ce qui masque les vraies données déjà vues par
   l'utilisateur.

   Ce script surcharge ces 3 fonctions pour :
   1) sauvegarder silencieusement le résultat dans IndexedDB à chaque
      chargement réussi en ligne ;
   2) réafficher ces dernières données connues quand l'utilisateur est
      hors ligne, au lieu du seed seul ;
   3) resynchroniser automatiquement dès le retour de connexion.

   IMPORTANT : ce fichier doit être chargé APRÈS les scripts qui
   définissent loadActors, loadSites, loadNewsFromDb, allActors,
   allSites, newsDb, searchAnnuaire, applySiteFilters, renderNewsFiltered
   (donc juste avant la fermeture de </body>, comme les autres scripts
   d'intégration GSC).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  if (!('indexedDB' in window)) {
    console.warn('[GSC Offline] IndexedDB non supporté — cache de données désactivé.');
    return;
  }

  const DB_NAME = 'gsc-offline-db';
  const STORE = 'kv';
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function cacheSet(key, value) {
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({ value, savedAt: Date.now() }, key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) { console.warn('[GSC Offline] Échec écriture cache', key, e); }
  }

  async function cacheGet(key) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) { console.warn('[GSC Offline] Échec lecture cache', key, e); return null; }
  }

  window.GSCOfflineCache = { get: cacheGet, set: cacheSet };

  /* ── ACTEURS ─────────────────────────────────────────────────── */
  function renderActorsStatsFrom(list) {
    const activeAll = list.filter(u => u.status === 'active' || u.status === undefined);
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('stat-total-acteurs', activeAll.length);
    set('stat-total-joueurs', activeAll.filter(u => ['joueur', 'athlete'].includes(u.role)).length);
    if (typeof computeUnifiedOrgCount === 'function') {
      computeUnifiedOrgCount(activeAll, ['club', 'association']).then(n => set('stat-total-clubs', n));
    }
    set('stat-total-arbitres', activeAll.filter(u => u.role === 'arbitre').length);
    set('stat-total-entraineurs', activeAll.filter(u => u.role === 'entraineur').length);
    set('stat-total-federations', activeAll.filter(u => u.role === 'federation').length);
    set('stat-total-organisateurs', activeAll.filter(u => u.role === 'organisateur').length);
    set('stat-total-independants', activeAll.filter(u => u.role === 'independant').length);
    set('stat-total-etudiants', activeAll.filter(u => u.role === 'eleve_etudiant').length);
    set('stat-total-etrangers', activeAll.filter(u => u.role === 'sportif_etranger').length);
    set('stat-total-handisport', activeAll.filter(u => u.role === 'handisport').length);
    set('stat-total-anciens', activeAll.filter(u => u.role === 'ancien_sportif').length);
    set('stat-total-formateurs', activeAll.filter(u => u.role === 'formateur').length);
  }

  if (typeof window.loadActors === 'function') {
    const _origLoadActors = window.loadActors;
    window.loadActors = async function (onlyPending) {
      if (!navigator.onLine) {
        const cached = await cacheGet('actors');
        if (cached && cached.length) {
          allActors = cached;
          if (typeof searchAnnuaire === 'function') searchAnnuaire();
          renderActorsStatsFrom(allActors);
          return;
        }
        // Rien en cache : on laisse la fonction d'origine retomber sur le seed.
      }
      const result = await _origLoadActors(onlyPending);
      if (navigator.onLine && Array.isArray(window.allActors) && window.allActors.length) {
        cacheSet('actors', window.allActors);
      }
      return result;
    };
  }

  /* ── SITES ────────────────────────────────────────────────────── */
  if (typeof window.loadSites === 'function') {
    const _origLoadSites = window.loadSites;
    window.loadSites = async function () {
      if (!navigator.onLine) {
        const cached = await cacheGet('sites');
        if (cached && cached.length) {
          allSites = cached;
          if (typeof applySiteFilters === 'function') applySiteFilters();
          const el = document.getElementById('admin-total-sites');
          if (el) el.textContent = allSites.length;
          return;
        }
      }
      const result = await _origLoadSites();
      if (navigator.onLine && Array.isArray(window.allSites) && window.allSites.length) {
        cacheSet('sites', window.allSites);
      }
      return result;
    };
  }

  /* ── ACTUALITÉS ───────────────────────────────────────────────── */
  if (typeof window.loadNewsFromDb === 'function') {
    const _origLoadNewsFromDb = window.loadNewsFromDb;
    window.loadNewsFromDb = async function () {
      if (!navigator.onLine) {
        const cached = await cacheGet('news');
        if (cached && cached.length) {
          newsDb = cached;
          allNewsItems = [...newsDb];
          const seen = new Set();
          allNewsItems = allNewsItems.filter(n => {
            const k = (n.title || '').substring(0, 40);
            if (seen.has(k)) return false;
            seen.add(k); return true;
          });
          if (typeof renderNewsFiltered === 'function') renderNewsFiltered();
          return;
        }
      }
      const result = await _origLoadNewsFromDb();
      if (navigator.onLine && Array.isArray(window.newsDb) && window.newsDb.length) {
        cacheSet('news', window.newsDb);
      }
      return result;
    };
  }

  /* ── INDICATEUR VISUEL HORS-LIGNE + RESYNC AUTO ──────────────────
     Reprend les couleurs déjà définies dans :root (--green / --danger)
     pour rester cohérent avec l'identité GSC, plutôt qu'une bannière
     générique. */
  function ensureBanner() {
    let bar = document.getElementById('gsc-connection-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'gsc-connection-bar';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:3px;z-index:2000;transition:background .3s ease;pointer-events:none;';
      document.body.appendChild(bar);
    }
    return bar;
  }

  function showToast(message, kind) {
    let box = document.getElementById('gsc-offline-toast-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'gsc-offline-toast-box';
      box.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2001;display:flex;flex-direction:column;gap:8px;pointer-events:none;width:min(92vw,380px);';
      document.body.appendChild(box);
    }
    const bg = kind === 'success' ? 'var(--green,#009E60)' : 'var(--danger,#ef4444)';
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `background:${bg};color:#fff;padding:10px 16px;border-radius:var(--radius-md,14px);box-shadow:var(--shadow-md,0 4px 20px rgba(0,0,0,.1));font-family:var(--font-body,sans-serif);font-size:13px;font-weight:600;text-align:center;opacity:0;transition:opacity .25s ease;`;
    box.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function updateConnectionUI(isOnline) {
    const bar = ensureBanner();
    bar.style.background = isOnline ? 'var(--green,#009E60)' : 'var(--danger,#ef4444)';
    bar.style.opacity = isOnline ? '0' : '1';
  }

  function resyncAllData() {
    if (typeof window.loadActors === 'function') window.loadActors();
    if (typeof window.loadSites === 'function') window.loadSites();
    if (typeof window.loadNewsFromDb === 'function') window.loadNewsFromDb();
  }

  window.addEventListener('offline', () => {
    updateConnectionUI(false);
    showToast('📴 Mode hors ligne — affichage des dernières données synchronisées', 'error');
  });

  window.addEventListener('online', () => {
    updateConnectionUI(true);
    showToast('✅ Connexion rétablie — actualisation des données…', 'success');
    resyncAllData();
  });

  // État initial au chargement de la page.
  document.addEventListener('DOMContentLoaded', () => {
    updateConnectionUI(navigator.onLine);
    if (!navigator.onLine) {
      showToast('📴 Mode hors ligne — affichage des dernières données synchronisées', 'error');
    }
  });

  console.log('[GSC Offline] Cache de données activé (acteurs, sites, actualités).');
})();
