/* ═══════════════════════════════════════════════════════════════
   FIREBASE-INIT.JS — Initialisation Firebase (SDK compat)
   Projet partagé avec index.html : gabon-sport-connect
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const FIREBASE_CONFIG = {
    apiKey: ['AIza', 'SyB3pmuvtsBJlvQRJ12GvgA4MKXKiXi', '14VM'].join(''),
    authDomain: "gabon-sport-connect.firebaseapp.com",
    projectId: "gabon-sport-connect",
    storageBucket: "gabon-sport-connect.appspot.com",
    messagingSenderId: "760498266017",
    appId: "1:760498266017:web:ee7a5ed9bf522e34649ee8"
  };

  try {
    if (typeof firebase === 'undefined') {
      throw new Error('SDK Firebase (compat) non chargé — vérifiez les balises <script> firebase-app-compat.js / firebase-firestore-compat.js');
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    window.db = firebase.firestore();
    window.storage = (typeof firebase.storage === 'function') ? firebase.storage() : null;
    window._firebaseReady = true;
    console.log('✅ Firebase initialisé (gabon-sport-connect)');
    document.dispatchEvent(new Event('firebase-ready'));
  } catch (e) {
    console.error('❌ Erreur initialisation Firebase :', e);
    window._firebaseReady = false;
    window.dispatchEvent(new CustomEvent('firebase-init-error', { detail: { error: e.message } }));
  }
})();
