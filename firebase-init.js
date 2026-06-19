/**
 * ═══════════════════════════════════════════════════════════════
 * GABON SPORT CONNECT — Firebase Initialization (Module ESM)
 * config/firebase-init.js  |  v1.0  |  19 Juin 2026
 * ═══════════════════════════════════════════════════════════════
 *
 * Initialise Firebase (SDK v10 ESM) et expose `window.gscDb`.
 * Déclenche l'événement `firebase-ready` une fois prêt,
 * ou `firebase-init-error` en cas d'échec.
 */

(async function () {
  'use strict';

  /* ── Configuration Firebase ── */
  const firebaseConfig = {
    apiKey:            'AIzaSyB3pmuvtsBJlvQRJ12GvgA4MKXKiXi14VM',
    authDomain:        'gabon-sport-connect.firebaseapp.com',
    projectId:         'gabon-sport-connect',
    storageBucket:     'gabon-sport-connect.appspot.com',
    messagingSenderId: '760498266017',
    appId:             '1:760498266017:web:ee7a5ed9bf522e34649ee8'
  };

  try {
    /* ── Import dynamique SDK Firebase ESM ── */
    const { initializeApp }  = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
    const { getFirestore, enableIndexedDbPersistence }
                             = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

    const app = initializeApp(firebaseConfig, 'gsc-public');
    const db  = getFirestore(app);

    /* ── Persistence hors-ligne (best-effort) ── */
    try {
      await enableIndexedDbPersistence(db);
      console.log('[GSC-Firebase] ✅ Persistence offline activée');
    } catch (persistErr) {
      if (persistErr.code === 'failed-precondition') {
        console.warn('[GSC-Firebase] ⚠️ Persistence désactivée (plusieurs onglets)');
      } else if (persistErr.code === 'unimplemented') {
        console.warn('[GSC-Firebase] ⚠️ Persistence non supportée par ce navigateur');
      }
    }

    /* ── Exposer db globalement ── */
    window.gscDb = db;
    window.db    = window.db || db; // compatibilité avec l'ancien code

    console.log('[GSC-Firebase] ✅ Firestore prêt');

    /* ── Déclencher firebase-ready ── */
    window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { db } }));

  } catch (err) {
    console.error('[GSC-Firebase] ❌ Erreur init:', err);
    window.dispatchEvent(new CustomEvent('firebase-init-error', { detail: { error: err } }));
  }
})();
