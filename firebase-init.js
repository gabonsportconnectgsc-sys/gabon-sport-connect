/* ═══════════════════════════════════════════════════════════════
   FIREBASE-INIT.JS — Initialisation Firebase (SDK compat)
   Projet partagé avec index.html : gabon-sport-connect
   ═══════════════════════════════════════════════════════════════
   NOTE SÉCURITÉ :
   La clé API Firebase ci-dessous N'EST PAS un secret. Elle identifie
   le projet Firebase auprès de Google, elle n'authentifie personne.
   Elle est destinée à être publique dans le code d'une app web
   (voir doc officielle Firebase / Google Cloud).
   L'obfuscation par concaténation de chaînes n'apporte AUCUNE
   protection réelle — elle a été retirée pour ne pas donner une
   fausse impression de sécurité.

   La vraie protection contre les abus repose sur DEUX couches :
   1. Restriction de la clé par domaine dans Google Cloud Console
      → API et services → Identifiants (déjà configuré pour ce
      projet : firebaseapp.com, web.app, github.io)
   2. Firestore Security Rules strictes (à vérifier/renforcer dans
      la console Firebase → Firestore → Règles)
   Ne JAMAIS considérer la clé API comme la barrière de sécurité.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyB3pmuvtsBJlvQRJ12GvgA4MKXKiXi14VM",
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
