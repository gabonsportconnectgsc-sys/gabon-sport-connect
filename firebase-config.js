// ============================================================
// firebase-config.js — Configuration Firebase
// Gabon Sport Connect
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB22T0CQAsm4K3U1mnTGektprj6cEEmfuw",
  authDomain: "gabon-sport-connect.firebaseapp.com",
  projectId: "gabon-sport-connect",
  storageBucket: "gabon-sport-connect.appspot.com",
  messagingSenderId: "760498266017",
  appId: "1:760498266017:web:ee7a5ed9bf522e34649ee8",
  measurementId: "G-RBKPF9KTDE"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log('🔥 Firebase initialisé — Gabon Sport Connect');