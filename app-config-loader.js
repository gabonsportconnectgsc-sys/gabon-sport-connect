/* ═══════════════════════════════════════════════════════════════
   APP-CONFIG-LOADER.JS — Pont CMS entre admin.html et index.html
   v3 — Synchronisation Firestore (cloud) + localStorage (cache local)

   STRATÉGIE "cache-first, cloud-second" :
   1. Applique immédiatement le cache localStorage (zéro latence)
   2. Dès que Firebase est prêt, écoute appConfig en temps réel
   3. Toute modification dans admin.html se propage partout en <1s
   4. localStorage reste la copie de secours si offline
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const STORAGE_KEY     = 'gsc_cms_config';
  const FIRESTORE_DOC   = 'appConfig/main';   // collection/document
  const STORAGE_VERSION = 3;

  /* ── Valeurs par défaut ── */
  const DEFAULTS = {
    version: STORAGE_VERSION,
    colorPrimary:    '#009E60',
    colorPrimaryDk:  '#007a47',
    colorPrimaryLt:  '#e6f7ef',
    colorYellow:     '#FFD700',
    colorNavy:       '#0A1628',
    colorNavyMd:     '#1a2d4a',
    colorDanger:     '#ef4444',
    colorWarn:       '#f59e0b',
    colorBlue:       '#3b82f6',
    fontDisplay:     'Syne',
    fontBody:        'Inter',
    radiusSm:        '8',
    radiusMd:        '14',
    radiusLg:        '22',
    appName:         'Gabon Sport Connect',
    appSubtitle:     'Plateforme Nationale du Sport',
    appEmoji:        '⚽',
    timezone:        'Africa/Libreville',
    language:        'fr',
    showSearchBar:   true,
    showNotifBell:   true,
    showBottomNav:   true,
    showWeather:     true,
    showTaxi:        true,
    showNews:        true,
    showMap:         true,
    maintenanceMode: false,
    maintenanceMsg:  'Application temporairement indisponible. Revenez bientôt.',
    updatedAt:       null,
    updatedBy:       'system'
  };

  /* ════════════════════════════════════════════════
     LECTURE / ÉCRITURE LOCALE
  ════════════════════════════════════════════════ */
  function readLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      if ((parsed.version || 1) < STORAGE_VERSION) {
        const merged = { ...DEFAULTS, ...parsed, version: STORAGE_VERSION };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return { ...DEFAULTS, ...parsed };
    } catch (e) {
      console.warn('[CMS] Erreur lecture locale:', e);
      return { ...DEFAULTS };
    }
  }

  function writeLocal(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch (e) {
      console.warn('[CMS] Erreur écriture locale:', e);
    }
  }

  /* ════════════════════════════════════════════════
     APPLICATION DU THÈME & DE LA CONFIG
  ════════════════════════════════════════════════ */
  function applyTheme(cfg) {
    const r = document.documentElement;
    r.style.setProperty('--green',        cfg.colorPrimary);
    r.style.setProperty('--green-dk',     cfg.colorPrimaryDk);
    r.style.setProperty('--green-lt',     cfg.colorPrimaryLt);
    r.style.setProperty('--yellow',       cfg.colorYellow);
    r.style.setProperty('--navy',         cfg.colorNavy);
    r.style.setProperty('--navy-md',      cfg.colorNavyMd);
    r.style.setProperty('--danger',       cfg.colorDanger);
    r.style.setProperty('--warn',         cfg.colorWarn);
    r.style.setProperty('--blue',         cfg.colorBlue);
    r.style.setProperty('--font-display', `'${cfg.fontDisplay}',sans-serif`);
    r.style.setProperty('--font-body',    `'${cfg.fontBody}',sans-serif`);
    r.style.setProperty('--radius-sm',    cfg.radiusSm + 'px');
    r.style.setProperty('--radius-md',    cfg.radiusMd + 'px');
    r.style.setProperty('--radius-lg',    cfg.radiusLg + 'px');
    const mt = document.querySelector('meta[name="theme-color"]');
    if (mt) mt.setAttribute('content', cfg.colorPrimary);
  }

  function applyAppMeta(cfg) {
    document.title = cfg.appName + ' — ' + cfg.appSubtitle;
    const set = () => {
      const logo = document.querySelector('.topnav-logo');
      if (logo) {
        const spans = logo.querySelectorAll('span');
        if (spans.length) {
          const words = cfg.appName.split(' ');
          logo.childNodes[0] && (logo.childNodes[0].textContent = words.slice(0,-1).join(' ') + ' ');
          spans[0].textContent = words[words.length - 1];
        }
      }
      const em = document.querySelector('.topnav-logo-emoji');
      if (em) em.textContent = cfg.appEmoji;
    };
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', set)
      : set();
  }

  function applyMaintenance(cfg) {
    // Retire l'écran si maintenance désactivée
    const existing = document.getElementById('cms-maintenance-screen');
    if (!cfg.maintenanceMode) {
      if (existing) existing.remove();
      return;
    }
    if (window.location.pathname.includes('admin')) return;
    if (existing) { existing.querySelector('.cms-maint-msg').textContent = cfg.maintenanceMsg; return; }
    const show = () => {
      const el = document.createElement('div');
      el.id = 'cms-maintenance-screen';
      el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#0A1628,#0d3a1f);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#fff;text-align:center;padding:24px;';
      el.innerHTML = `
        <div style="font-size:64px">🔧</div>
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800">${cfg.appName}</div>
        <div style="font-size:15px;font-weight:600;color:#FFD700">Maintenance en cours</div>
        <div class="cms-maint-msg" style="font-size:14px;opacity:.7;max-width:400px;line-height:1.6">${cfg.maintenanceMsg}</div>
        <div style="font-size:11px;opacity:.4;margin-top:8px">Panneau admin accessible sur admin.html</div>`;
      document.body.appendChild(el);
    };
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', show)
      : show();
  }

  function applyVisibility(cfg) {
    const rules = [
      { sel: '.search-panel,#search-panel,[data-cms="search"]', key: 'showSearchBar' },
      { sel: '#notif-btn,.notif-btn,[data-cms="notif"]',        key: 'showNotifBell' },
      { sel: '.bottom-nav,#bottom-nav,[data-cms="bottom-nav"]', key: 'showBottomNav' },
      { sel: '[data-cms="weather"],.weather-widget',             key: 'showWeather' },
      { sel: '[data-cms="taxi"],.taxi-section',                  key: 'showTaxi' },
      { sel: '[data-cms="news"],.news-section',                  key: 'showNews' },
      { sel: '[data-cms="map"],.map-section',                    key: 'showMap' },
    ];
    const apply = () => rules.forEach(({ sel, key }) =>
      document.querySelectorAll(sel).forEach(el => { el.style.display = cfg[key] ? '' : 'none'; })
    );
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', apply)
      : apply();
  }

  function applyConfig(cfg) {
    applyTheme(cfg);
    applyAppMeta(cfg);
    applyMaintenance(cfg);
    applyVisibility(cfg);
    document.dispatchEvent(new CustomEvent('gsc-config-applied', { detail: cfg }));
  }

  /* ════════════════════════════════════════════════
     SYNCHRONISATION FIRESTORE (TEMPS RÉEL)
  ════════════════════════════════════════════════ */
  let _firestoreUnsub = null;

  function startFirestoreSync() {
    if (_firestoreUnsub || !window.db) return;
    try {
      _firestoreUnsub = window.db.doc(FIRESTORE_DOC).onSnapshot(
        (snap) => {
          if (!snap.exists) return; // document pas encore créé
          const data = snap.data();
          const cfg  = { ...DEFAULTS, ...data, version: STORAGE_VERSION };
          writeLocal(cfg);          // met à jour le cache local
          applyConfig(cfg);         // applique sur cette page
          document.dispatchEvent(new CustomEvent('gsc-cms-updated', { detail: cfg }));
          console.info('[CMS] ☁️ Config Firestore reçue');
        },
        (err) => {
          console.warn('[CMS] Firestore écoute échouée, fallback localStorage:', err.message);
        }
      );
      console.info('[CMS] ☁️ Écoute Firestore démarrée sur', FIRESTORE_DOC);
    } catch (e) {
      console.warn('[CMS] Impossible de démarrer la sync Firestore:', e);
    }
  }

  function stopFirestoreSync() {
    if (_firestoreUnsub) { _firestoreUnsub(); _firestoreUnsub = null; }
  }

  /* ════════════════════════════════════════════════
     ÉCRITURE FIRESTORE (appelée par admin-cms.js)
  ════════════════════════════════════════════════ */
  async function saveToFirestore(cfg) {
    if (!window.db) {
      console.warn('[CMS] Firestore non disponible — sauvegarde locale uniquement');
      return false;
    }
    try {
      await window.db.doc(FIRESTORE_DOC).set(cfg, { merge: true });
      console.info('[CMS] ☁️ Config sauvegardée dans Firestore');
      return true;
    } catch (e) {
      console.error('[CMS] Erreur sauvegarde Firestore:', e);
      return false;
    }
  }

  /* ════════════════════════════════════════════════
     BOOTSTRAP FIREBASE
  ════════════════════════════════════════════════ */
  function onFirebaseReady() {
    startFirestoreSync();
  }

  // Firebase peut être déjà prêt (si ce script est chargé après firebase-ready)
  if (window._firebaseReady || window.db) {
    onFirebaseReady();
  }
  document.addEventListener('firebase-ready', onFirebaseReady);

  // Fallback si Firebase ne démarre jamais (réseau coupé, etc.)
  setTimeout(() => {
    if (!_firestoreUnsub) {
      console.info('[CMS] Firebase non disponible après 5s — mode localStorage uniquement');
    }
  }, 5000);

  /* ════════════════════════════════════════════════
     ÉCOUTE CROSS-TAB (même appareil, Firebase absent)
  ════════════════════════════════════════════════ */
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    applyConfig(readLocal());
  });

  /* ════════════════════════════════════════════════
     API PUBLIQUE window.GSC_CMS
  ════════════════════════════════════════════════ */
  window.GSC_CMS = {
    read:         readLocal,
    apply:        applyConfig,
    defaults:     DEFAULTS,
    STORAGE_KEY,
    FIRESTORE_DOC,

    /**
     * Sauvegarde une config partielle.
     * 1. Applique immédiatement (local)
     * 2. Écrit dans localStorage (cache)
     * 3. Écrit dans Firestore (cloud) → propagation à tous les appareils
     */
    async save(partial) {
      const current = readLocal();
      const next = {
        ...current, ...partial,
        version:   STORAGE_VERSION,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin'
      };
      writeLocal(next);
      applyConfig(next);
      document.dispatchEvent(new CustomEvent('gsc-cms-updated', { detail: next }));
      const saved = await saveToFirestore(next);
      return { config: next, cloud: saved };
    },

    /** Réinitialise aux valeurs par défaut (local + cloud) */
    async reset() {
      const fresh = { ...DEFAULTS, updatedAt: new Date().toISOString(), updatedBy: 'admin' };
      writeLocal(fresh);
      applyConfig(fresh);
      await saveToFirestore(fresh);
      return fresh;
    },

    /** Status de la connexion cloud */
    isCloudConnected() {
      return !!_firestoreUnsub;
    },

    stopSync: stopFirestoreSync
  };

  /* ── Application immédiate depuis le cache local (zéro latence) ── */
  const cached = readLocal();
  applyConfig(cached);
  console.info('[CMS] v3 chargé ✓ | App:', cached.appName, '| Cloud:', !!window.db);
})();
