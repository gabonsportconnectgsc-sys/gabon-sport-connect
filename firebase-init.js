/**
 * Firebase Initialization — Mode LIBRE (Accès public sans login)
 * ═════════════════════════════════════════════════════════════════
 * 🔥 Config Firebase pour Firestore seulement (pas d'authentification)
 */

// ═════════════════════════════════════════════════════════════════
// Configuration Firebase (Firestore seulement)
// ═════════════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyBhHOBnTvABARJ8OdoAjUsjvNn0bO_BiF0",
  authDomain: "gabon-sport-connect.firebaseapp.com",
  projectId: "gabon-sport-connect",
  storageBucket: "gabon-sport-connect.firebasestorage.app",
  messagingSenderId: "76049826617",
  appId: "1:76049826617:web:ee7a5ed9bf522e34649ee8"
  // measurementId: "G-RBKPF9KTDE"  // Optionnel pour Analytics
};

// ═════════════════════════════════════════════════════════════════
// Initialiser Firebase (Firestore seulement, pas d'Auth)
// ═════════════════════════════════════════════════════════════════

try {
  // Vérifier si Firebase est chargé
  if (typeof firebase === 'undefined') {
    throw new Error('❌ Firebase SDK n\'est pas chargé');
  }

  // Initialiser Firebase si pas déjà fait
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase initialisé (Firestore - Accès libre)');
  } else {
    console.log('ℹ️ Firebase déjà initialisé');
  }

  // Notifier que Firebase est prêt
  window.dispatchEvent(new CustomEvent('firebase-init-done', {
    detail: { firebase: firebase, config: firebaseConfig }
  }));
} catch (error) {
  console.error('❌ Erreur initialisation Firebase:', error.message);
  window.dispatchEvent(new CustomEvent('firebase-init-error', {
    detail: { error: error.message }
  }));
}

// ═════════════════════════════════════════════════════════════════
// Raccourcis d'accès (Firestore seulement)
// ═════════════════════════════════════════════════════════════════

window.firebaseConfig = firebaseConfig;

// Raccourci pour Firestore
Object.defineProperty(window, 'firestore', {
  get: function() {
    return firebase.firestore();
  }
});
