/**
 * ═══════════════════════════════════════════════════════════════
 * GABON SPORT CONNECT — Firebase Initialization
 * config/firebase-init.js  |  v1.1 (corrigé)  |  19 Juin 2026
 * ═══════════════════════════════════════════════════════════════
 *
 * Initialise Firebase (SDK compat) et expose `window.gscDb`.
 * Déclenche l'événement `firebase-ready` une fois prêt,
 * ou `firebase-init-error` en cas d'échec.
 *
 * ─────────────────────────────────────────────────────────────
 * CORRECTIF (v1.1) :
 * La version précédente utilisait le SDK modulaire ESM
 * (`getFirestore()` via `import()` dynamique), qui NE fournit PAS
 * la méthode `.collection()`. Or realtime-sync-module.js et
 * gsc-sync-config.js utilisent tous les deux l'API "compat"
 * (`db.collection(...).onSnapshot(...)`). Ce mélange provoquait
 * l'échec silencieux de toute la synchronisation temps réel.
 * → Ce fichier utilise maintenant le SDK compat, cohérent avec
 *   le reste du code existant (aucune autre modification requise).
 *
 * IMPORTANT : ce fichier doit être chargé en <script> classique
 * (pas type="module"), APRÈS les 2 scripts compat Firebase :
 *   <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>
 *   <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js"></script>
 *   <script src="config/firebase-init.js"></script>
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /* ── Configuration Firebase (réelle, projet gabon-sport-connect) ── */
  const firebaseConfig = {
    apiKey:            'AIzaSyB3pmuvtsBJlvQRJ12GvgA4MKXKiXi14VM',
    authDomain:        'gabon-sport-connect.firebaseapp.com',
    projectId:         'gabon-sport-connect',
    storageBucket:     'gabon-sport-connect.appspot.com',
    messagingSenderId: '760498266017',
    appId:             '1:760498266017:web:ee7a5ed9bf522e34649ee8'
  };

  try {
    if (typeof firebase === 'undefined') {
      throw new Error('SDK Firebase (compat) non chargé — vérifie les balises <script> avant firebase-init.js');
    }

    /* ── Initialisation (API compat, synchrone) ── */
    const app = firebase.initializeApp(firebaseConfig);
    const db  = firebase.firestore();

    /* ── Persistence hors-ligne (best-effort) ── */
    try {
      db.enablePersistence({ synchronizeTabs: true });
      console.log('[GSC-Firebase] ✅ Persistence offline activée');
    } catch (persistErr) {
      if (persistErr.code === 'failed-precondition') {
        console.warn('[GSC-Firebase] ⚠️ Persistence désactivée (plusieurs onglets ouverts)');
      } else if (persistErr.code === 'unimplemented') {
        console.warn('[GSC-Firebase] ⚠️ Persistence non supportée par ce navigateur');
      }
    }

    /* ── Exposer db globalement ── */
    window.gscDb = db;
    window.db    = window.db || db; // compatibilité avec l'ancien code

    console.log('[GSC-Firebase] ✅ Firestore prêt (projet: ' + firebaseConfig.projectId + ')');

    /* ── Déclencher firebase-ready (async pour ne pas rater les listeners tardifs) ── */
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { db } }));
    }, 0);

  } catch (err) {
    console.error('[GSC-Firebase] ❌ Erreur init:', err);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('firebase-init-error', { detail: { error: err } }));
    }, 0);
  }
})();
