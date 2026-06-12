// ============================================================
// firebase-config_UPGRADED.js — Configuration Firebase v4.0
// Inclut: Authentication, Firestore, Storage
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// ─────────────────────────────────────────────────────────
// CONFIGURATION FIREBASE — À REMPLACER AVEC VOS VALEURS
// ─────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyB22T0CQAsm4K3U1mnTGektprj6cEEmfuw",
  authDomain: "gabon-sport-connect.firebaseapp.com",
  projectId: "gabon-sport-connect",
  storageBucket: "gabon-sport-connect.appspot.com",
  messagingSenderId: "760498266017",
  appId: "1:760498266017:web:ee7a5ed9bf522e34649ee8",
  measurementId: "G-RBKPF9KTDE"
};

// ─────────────────────────────────────────────────────────
// INITIALISATION FIREBASE
// ─────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// ✅ Note : firestore.settings n'existe plus en Firebase v9 (modular)
// ignoreUndefinedProperties se configure via initializeFirestore() si besoin

// ─────────────────────────────────────────────────────────
// COLLECTIONS CONSTANTES
// ─────────────────────────────────────────────────────────

export const COLLECTIONS = {
  users: 'users',
  userProfiles: 'userProfiles',
  supporters: 'supporters',
  sitesSportifs: 'sitesSportifs',
  federations: 'federations',
  clubs: 'clubs',
  joueurs: 'joueurs',
  arbitres: 'arbitres',
  competitions: 'competitions',
  actualites: 'actualites',
  matchs: 'matchs',
  notifications: 'notifications',
  photos: 'photos'
};

// ─────────────────────────────────────────────────────────
// ROLES ET PERMISSIONS
// ─────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  STAFF: 'staff',
  ARBITRE: 'arbitre',
  JOUEUR: 'joueur',
  SUPPORTER: 'supporter'
};

export const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['read', 'create', 'update', 'delete', 'admin'],
  [ROLES.ADMIN]: ['read', 'create', 'update', 'delete'],
  [ROLES.STAFF]: ['read', 'create', 'update'],
  [ROLES.ARBITRE]: ['read', 'create'],
  [ROLES.JOUEUR]: ['read', 'create'],
  [ROLES.SUPPORTER]: ['read']
};

// ─────────────────────────────────────────────────────────
// CONFIGURATION STORAGE
// ─────────────────────────────────────────────────────────

export const STORAGE_PATHS = {
  PROFILE_PHOTOS: 'profiles/photos',
  SUPPORTER_PHOTOS: 'supporters/photos',
  SITE_PHOTOS: 'sites/photos',
  DOCUMENTS: 'documents'
};

export const STORAGE_LIMITS = {
  PROFILE_PHOTO_SIZE: 5 * 1024 * 1024,  // 5MB
  SUPPORTER_PHOTO_SIZE: 3 * 1024 * 1024, // 3MB
  DOCUMENT_SIZE: 10 * 1024 * 1024        // 10MB
};

// ─────────────────────────────────────────────────────────
// SPORTS DISPONIBLES
// ─────────────────────────────────────────────────────────

export const SPORTS = [
  'Football',
  'Basketball',
  'Volleyball',
  'Athlétisme',
  'Handball',
  'Boxe',
  'Tennis',
  'Natation',
  'Rugby',
  'Judo',
  'Taekwondo',
  'Cyclisme'
];

// ─────────────────────────────────────────────────────────
// TYPES DE SITES SPORTIFS
// ─────────────────────────────────────────────────────────

export const SITE_TYPES = [
  'Stade',
  'Gymnase',
  'Piscine',
  'Court de tennis',
  'Club de boxe',
  'Terrain multisports',
  'Dojo',
  'Piste d\'athlétisme',
  'Terrain de rugby',
  'Salle de handball'
];

// ─────────────────────────────────────────────────────────
// UTILISATEUR ADMIN PAR DÉFAUT
// ─────────────────────────────────────────────────────────

export const ADMIN_USERS = [
  'gabonsportconnectgsc@gmail.com',
  'admin@gabonsportconnect.com'
];

// ─────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────

/**
 * Vérifier si l'utilisateur a les permissions requises
 */
export function hasPermission(userRole, action) {
  const perms = PERMISSIONS[userRole] || [];
  return perms.includes(action);
}

/**
 * Vérifier si l'utilisateur est administrateur
 */
export function isAdmin(userRole) {
  return [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(userRole);
}

/**
 * Formatter les erreurs Firebase
 */
export function formatFirebaseError(error) {
  const errorMessages = {
    'auth/user-not-found': 'Utilisateur non trouvé',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/email-already-in-use': 'Email déjà utilisé',
    'auth/weak-password': 'Mot de passe faible (min 6 caractères)',
    'auth/invalid-email': 'Email invalide',
    'permission-denied': 'Accès refusé - permissions insuffisantes',
    'not-found': 'Document non trouvé'
  };

  return errorMessages[error.code] || error.message || 'Erreur inconnue';
}

// ─────────────────────────────────────────────────────────
// LOGS ET MONITORING
// ─────────────────────────────────────────────────────────

console.log('%c🔥 Firebase v4.0 Initialisé', 'color: #FF6D00; font-weight: bold;');
console.log('📊 Firestore:', db);
console.log('🔐 Authentication:', auth);
console.log('💾 Storage:', storage);

if (import.meta.env?.MODE === 'development') {
  console.log('🔧 Mode Développement activé');
}

// ─────────────────────────────────────────────────────────
// EXPORT PAR DÉFAUT
// ─────────────────────────────────────────────────────────

export default {
  app,
  auth,
  db,
  storage,
  analytics,
  COLLECTIONS,
  ROLES,
  PERMISSIONS,
  SPORTS,
  SITE_TYPES,
  ADMIN_USERS,
  hasPermission,
  isAdmin,
  formatFirebaseError
};
