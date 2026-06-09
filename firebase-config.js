import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB22T0CQAsm4K3U1mnTGektprj6cEEmfuw",
  authDomain: "gabon-sport-connect.firebaseapp.com",
  projectId: "gabon-sport-connect",
  storageBucket: "gabon-sport-connect.firebasestorage.app",
  messagingSenderId: "76049826617",
  appId: "1:76049826617:web:ee7a5ed9bf522e34649ee8",
  measurementId: "G-RBKPF9KTDE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
