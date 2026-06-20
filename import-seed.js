#!/usr/bin/env node
/**
 * import-seed.js — Importe les profils fictifs (seed_users.json) dans la
 * collection Firestore "users" du projet Gabon Sport Connect, afin qu'ils
 * apparaissent réellement dans le tableau admin (admin.html) avec leur
 * statut (actif / en attente de validation).
 *
 * ── PRÉREQUIS ──
 *   npm install firebase
 *
 * ── UTILISATION ──
 *   node import-seed.js
 *
 * Le script saute automatiquement tout document dont l'uid existe déjà
 * dans Firestore (pas d'écrasement de données réelles).
 *
 * ── EN CAS D'ERREUR "Missing or insufficient permissions" ──
 * Les règles de sécurité Firestore du projet doivent autoriser l'écriture
 * sur la collection "users" pour ce script (qui n'utilise PAS Firebase
 * Authentication — comme le reste de l'app, qui gère ses comptes "maison"
 * via un PIN stocké dans Firestore, pas via firebase.auth()).
 * Si l'écriture est refusée, il faut temporairement assouplir la règle
 * d'écriture sur /users/{uid} dans la console Firebase, lancer l'import,
 * puis remettre la règle stricte.
 */

const { initializeApp } = require('firebase/app');
const {
  getFirestore, doc, setDoc, getDoc, collection, serverTimestamp,
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB3pmuvtsBJlvQRJ12GvgA4MKXKiXi14VM',
  authDomain: 'gabon-sport-connect.firebaseapp.com',
  projectId: 'gabon-sport-connect',
  storageBucket: 'gabon-sport-connect.appspot.com',
  messagingSenderId: '760498266017',
  appId: '1:760498266017:web:ee7a5ed9bf522e34649ee8',
};

async function main() {
  const seedPath = path.join(__dirname, 'gen', 'seed_users.json');
  if (!fs.existsSync(seedPath)) {
    console.error(`Fichier introuvable : ${seedPath}`);
    process.exit(1);
  }
  const users = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  const app = initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);

  let created = 0, skipped = 0, failed = 0;

  for (const u of users) {
    const { uid, id, ...data } = u;
    try {
      const ref = doc(db, 'users', uid);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        console.log(`⏭️  ${uid} existe déjà — ignoré`);
        skipped++;
        continue;
      }
      await setDoc(ref, {
        ...data,
        uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`✅ ${uid} — ${[data.prenom, data.nom, data.nomOrganisation].filter(Boolean).join(' ')}`);
      created++;
    } catch (e) {
      console.error(`❌ ${uid} — ${e.message}`);
      failed++;
    }
  }

  console.log('\n── Résumé ──');
  console.log(`Créés : ${created}`);
  console.log(`Déjà existants (ignorés) : ${skipped}`);
  console.log(`Échecs : ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Erreur fatale :', e);
  process.exit(1);
});
