// ============================================================
// migration-script.js — Migration v3.x → v4.0
// Convertir les données existantes vers la nouvelle structure
// ============================================================

import { db } from './firebase-config.js';
import {
  collection, getDocs, addDoc, updateDoc, doc, 
  batch, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * SCRIPT DE MIGRATION COMPLET
 * À exécuter une seule fois au passage de v3.x à v4.0
 */

// ─────────────────────────────────────────────────────────
// 1. MIGRER LES UTILISATEURS VERS userProfiles
// ─────────────────────────────────────────────────────────

export async function migrateUsersToProfiles() {
  console.log('🚀 Début migration: users → userProfiles');
  
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let count = 0;
    
    snapshot.forEach(async (userDoc) => {
      const userData = userDoc.data();
      
      // Créer le profil transformé
      const profileData = {
        uid: userDoc.id,
        email: userData.email,
        prenom: userData.prenom || '',
        nom: userData.nom || '',
        telephone: userData.telephone || '',
        ddn: userData.ddn || '',
        ville: userData.ville || '',
        sport: userData.sport || 'Football',
        club: userData.club || '',
        type: userData.type || 'supporter',
        bio: userData.bio || '',
        photoURL: userData.photoURL || null,
        createdAt: userData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        migrated: true,
        migratedAt: new Date().toISOString()
      };
      
      // Sauvegarder dans la nouvelle collection
      const profileRef = doc(db, 'userProfiles', userDoc.id);
      await setDoc(profileRef, profileData);
      
      count++;
      console.log(`✅ Migré: ${userData.email}`);
    });
    
    console.log(`✅ Migration complète: ${count} utilisateurs convertis`);
    return { success: true, migratedCount: count };
    
  } catch (error) {
    console.error('❌ Erreur migration users:', error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────
// 2. INITIALISER LES COLLECTIONS VIDES
// ─────────────────────────────────────────────────────────

const EMPTY_COLLECTIONS = [
  'supporters',
  'sitesSportifs',
  'photos'
];

export async function initializeEmptyCollections() {
  console.log('🚀 Initialisation des collections vides');
  
  for (const collectionName of EMPTY_COLLECTIONS) {
    try {
      const ref = collection(db, collectionName);
      const snapshot = await getDocs(ref);
      
      if (snapshot.empty) {
        console.log(`✅ ${collectionName}: Vide (prêt pour nouvelles données)`);
      } else {
        console.log(`⚠️ ${collectionName}: ${snapshot.size} documents existants`);
      }
    } catch (error) {
      console.log(`⚠️ ${collectionName}: ${error.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────────
// 3. AJOUTER LES SITES SPORTIFS PRÉDÉFINIS
// ─────────────────────────────────────────────────────────

const SITES_PREDEFINIS = [
  {
    nom: "Stade de l'Amitié",
    type: "Stade",
    ville: "Libreville",
    adresse: "Boulevard de l'Indépendance",
    lat: 0.4162,
    lng: 9.4679,
    capacite: 30000,
    contact: "+241 (0)1 76 44 44",
    description: "Principal stade du Gabon, capacité 30 000 spectateurs"
  },
  {
    nom: "Stade Omnisports",
    type: "Stade",
    ville: "Port-Gentil",
    adresse: "Quartier Oloumi",
    lat: -0.6167,
    lng: 8.7667,
    capacite: 15000,
    contact: "+241 (0)2 55 12 12",
    description: "Stade omnisports de Port-Gentil"
  },
  {
    nom: "Gymnase de Libreville",
    type: "Gymnase",
    ville: "Libreville",
    adresse: "Avenue de la Paix",
    lat: 0.4200,
    lng: 9.4700,
    capacite: 5000,
    contact: "+241 (0)1 76 30 30",
    description: "Gymnase municipal"
  },
  {
    nom: "Piscine Olympique",
    type: "Piscine",
    ville: "Libreville",
    adresse: "Quartier Batavéa",
    lat: 0.4100,
    lng: 9.4600,
    capacite: 2000,
    contact: "+241 (0)1 76 20 20",
    description: "Piscine olympique"
  },
  {
    nom: "Stade d'Oyem",
    type: "Stade",
    ville: "Oyem",
    adresse: "Centre-ville",
    lat: 1.5833,
    lng: 11.5667,
    capacite: 8000,
    contact: "+241 (0)3 72 15 15",
    description: "Stade provincial"
  },
  {
    nom: "Terrain de Hockey - Libreville",
    type: "Terrain multisports",
    ville: "Libreville",
    adresse: "Zone Scientifique",
    lat: 0.4150,
    lng: 9.4750,
    capacite: 1000,
    contact: "+241 (0)1 76 10 10",
    description: "Terrain multisports"
  },
  {
    nom: "Club de Boxe Central",
    type: "Club de boxe",
    ville: "Libreville",
    adresse: "Quartier Glass",
    lat: 0.4050,
    lng: 9.4650,
    capacite: 500,
    contact: "+241 (0)1 76 05 05",
    description: "Club de boxe agréé"
  },
  {
    nom: "Dojo Municipal",
    type: "Dojo",
    ville: "Libreville",
    adresse: "Kinguélé",
    lat: 0.4100,
    lng: 9.4580,
    capacite: 300,
    contact: "+241 (0)1 75 90 90",
    description: "Dojo de judo et taekwondo"
  },
  {
    nom: "Piste d'Athlétisme - Stade de l'Amitié",
    type: "Piste d'athlétisme",
    ville: "Libreville",
    adresse: "Boulevard de l'Indépendance",
    lat: 0.4162,
    lng: 9.4679,
    capacite: 30000,
    contact: "+241 (0)1 76 44 44",
    description: "Piste d'athlétisme standard"
  },
  {
    nom: "Terrain de Rugby - Akanda",
    type: "Terrain de rugby",
    ville: "Akanda",
    adresse: "Zone d'Akanda",
    lat: 0.5500,
    lng: 9.3000,
    capacite: 2000,
    contact: "+241 (0)1 76 33 33",
    description: "Terrain de rugby international"
  }
];

export async function addPredefinedSites() {
  console.log('🚀 Ajout des sites sportifs prédéfinis');
  
  try {
    const sitesRef = collection(db, 'sitesSportifs');
    const snapshot = await getDocs(sitesRef);
    
    // Vérifier si des sites existent déjà
    if (snapshot.size > 0) {
      console.log('⚠️ Des sites existent déjà. Abandon de l\'ajout des prédéfinis.');
      return { success: false, message: 'Sites already exist' };
    }
    
    // Ajouter les sites
    for (const site of SITES_PREDEFINIS) {
      const siteData = {
        ...site,
        predefined: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(sitesRef, siteData);
      console.log(`✅ Ajouté: ${site.nom}`);
    }
    
    console.log(`✅ ${SITES_PREDEFINIS.length} sites prédéfinis ajoutés`);
    return { success: true, addedCount: SITES_PREDEFINIS.length };
    
  } catch (error) {
    console.error('❌ Erreur ajout sites:', error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────
// 4. METTRE À JOUR LES FÉDÉRATIONS
// ─────────────────────────────────────────────────────────

const UPDATED_FEDERATIONS = [
  {
    nom: 'Fédération Gabonaise de Football (FEGAFOOT)',
    sport: 'Football',
    statut: 'Validée',
    affiliation: 'FIFA',
    president: 'À compléter',
    contact: '+241 (0)1 76 44 44',
    email: 'contact@fegafoot.ga'
  },
  {
    nom: 'Fédération Gabonaise de Basketball (FEGABASKET)',
    sport: 'Basketball',
    statut: 'Validée',
    affiliation: 'FIBA',
    president: 'À compléter',
    contact: '+241 (0)1 76 50 50',
    email: 'contact@fegabasket.ga'
  },
  {
    nom: 'Fédération Gabonaise de Volleyball (FEGAVOL)',
    sport: 'Volleyball',
    statut: 'Validée',
    affiliation: 'FIVB',
    president: 'À compléter',
    contact: '+241 (0)1 76 55 55',
    email: 'contact@fegavol.ga'
  },
  {
    nom: 'Fédération Gabonaise d\'Athlétisme (FÉGATH)',
    sport: 'Athlétisme',
    statut: 'Validée',
    affiliation: 'World Athletics',
    president: 'À compléter',
    contact: '+241 (0)1 76 60 60',
    email: 'contact@fegath.ga'
  },
  {
    nom: 'Fédération Gabonaise de Handball (FEGAHAND)',
    sport: 'Handball',
    statut: 'Validée',
    affiliation: 'IHF',
    president: 'À compléter',
    contact: '+241 (0)1 76 65 65',
    email: 'contact@fegahand.ga'
  },
  {
    nom: 'Fédération Gabonaise de Boxe',
    sport: 'Boxe',
    statut: 'Validée',
    affiliation: 'IBO',
    president: 'À compléter',
    contact: '+241 (0)1 76 70 70',
    email: 'contact@boxegabon.ga'
  },
  {
    nom: 'Fédération Gabonaise de Judo',
    sport: 'Judo',
    statut: 'Validée',
    affiliation: 'IJF',
    president: 'À compléter',
    contact: '+241 (0)1 76 75 75',
    email: 'contact@judogabon.ga'
  },
  {
    nom: 'Fédération Gabonaise de Taekwondo',
    sport: 'Taekwondo',
    statut: 'Validée',
    affiliation: 'WT',
    president: 'À compléter',
    contact: '+241 (0)1 76 80 80',
    email: 'contact@tkdgabon.ga'
  },
  {
    nom: 'Fédération Gabonaise de Natation',
    sport: 'Natation',
    statut: 'Validée',
    affiliation: 'FINA',
    president: 'À compléter',
    contact: '+241 (0)1 76 85 85',
    email: 'contact@nataogabon.ga'
  },
  {
    nom: 'Fédération Gabonaise de Cyclisme',
    sport: 'Cyclisme',
    statut: 'Validée',
    affiliation: 'UCI',
    president: 'À compléter',
    contact: '+241 (0)1 76 90 90',
    email: 'contact@cyclogabon.ga'
  },
  {
    nom: 'Fédération Gabonaise de Rugby',
    sport: 'Rugby',
    statut: 'Validée',
    affiliation: 'World Rugby',
    president: 'À compléter',
    contact: '+241 (0)1 76 95 95',
    email: 'contact@rugbygabon.ga'
  }
];

export async function updateFederations() {
  console.log('🚀 Mise à jour des fédérations');
  
  try {
    const fedRef = collection(db, 'federations');
    const snapshot = await getDocs(fedRef);
    
    // Supprimer les anciens documents
    const deletePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, UPDATED_FEDERATIONS[0] || {})
    );
    await Promise.all(deletePromises);
    
    // Ajouter les nouvelles données
    for (const fed of UPDATED_FEDERATIONS) {
      const fedData = {
        ...fed,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(fedRef, fedData);
      console.log(`✅ Mise à jour: ${fed.nom}`);
    }
    
    console.log(`✅ ${UPDATED_FEDERATIONS.length} fédérations mises à jour`);
    return { success: true, updatedCount: UPDATED_FEDERATIONS.length };
    
  } catch (error) {
    console.error('❌ Erreur mise à jour fédérations:', error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────
// 5. EXÉCUTER TOUTE LA MIGRATION
// ─────────────────────────────────────────────────────────

export async function runFullMigration() {
  console.log('\n');
  console.log('═════════════════════════════════════════');
  console.log('  🚀 MIGRATION COMPLÈTE v3.x → v4.0');
  console.log('═════════════════════════════════════════\n');
  
  const results = {
    users: null,
    sites: null,
    federations: null,
    errors: []
  };
  
  try {
    // 1. Migrer les utilisateurs
    console.log('📝 Étape 1: Migrer les utilisateurs...');
    results.users = await migrateUsersToProfiles();
    if (!results.users.success) {
      results.errors.push(`Erreur users: ${results.users.error}`);
    }
    
    // 2. Initialiser les collections
    console.log('\n📝 Étape 2: Vérifier les collections...');
    await initializeEmptyCollections();
    
    // 3. Ajouter les sites
    console.log('\n📝 Étape 3: Ajouter les sites sportifs prédéfinis...');
    results.sites = await addPredefinedSites();
    if (!results.sites.success) {
      results.errors.push(`Erreur sites: ${results.sites.error}`);
    }
    
    // 4. Mettre à jour les fédérations
    console.log('\n📝 Étape 4: Mettre à jour les fédérations...');
    results.federations = await updateFederations();
    if (!results.federations.success) {
      results.errors.push(`Erreur fédérations: ${results.federations.error}`);
    }
    
    // Résumé
    console.log('\n═════════════════════════════════════════');
    console.log('  ✅ MIGRATION COMPLÈTE');
    console.log('═════════════════════════════════════════\n');
    
    console.log('📊 Résumé:');
    console.log(`  ✅ Utilisateurs migrés: ${results.users?.migratedCount || 0}`);
    console.log(`  ✅ Sites ajoutés: ${results.sites?.addedCount || 0}`);
    console.log(`  ✅ Fédérations mises à jour: ${results.federations?.updatedCount || 0}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ Erreurs:');
      results.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Erreur migration globale:', error);
    return { ...results, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────
// 6. COMMANDE POUR EXÉCUTER (À TAPER DANS CONSOLE)
// ─────────────────────────────────────────────────────────

/**
 * INSTRUCTIONS:
 * 1. Ouvrir la console du navigateur (F12)
 * 2. Dans l'onglet Console, taper:
 *    await runFullMigration()
 * 3. Attendre la fin
 * 4. Vérifier les résultats sur Firestore
 */

console.log('%c🔄 Script de migration chargé', 'color: #4CAF50; font-weight: bold;');
console.log('Pour exécuter la migration, entrez: await runFullMigration()');

// Export pour utilisation
export default {
  migrateUsersToProfiles,
  initializeEmptyCollections,
  addPredefinedSites,
  updateFederations,
  runFullMigration
};
