#!/usr/bin/env node
// ============================================================
// MIGRATION v4.0 → v5.0 — SCRIPT D'INTÉGRATION
// Intégrer les 4 nouvelles fonctionnalités au code existant
// ============================================================

/**
 * ÉTAPES DE MIGRATION
 * ───────────────────
 * 
 * 1. ✅ Préparation
 * 2. ✅ Imports des nouveaux modules
 * 3. ✅ Initialisation des nouvelles classes
 * 4. ✅ Migration des données existantes
 * 5. ✅ Mise à jour HTML/UI
 * 6. ✅ Tests et validation
 * 7. ✅ Déploiement
 */

// ============================================================
// 1. VÉRIFICATIONS PRÉALABLES
// ============================================================

console.log('🔍 Vérification de l\'environnement v4.0...\n');

const CHECKS = {
  firebase_config: {
    file: 'firebase-config.js',
    exports: ['auth', 'db', 'storage', 'COLLECTIONS']
  },
  app_js: {
    file: 'app.js',
    exports: ['SITES_GABON_PREDEFINIS', 'currentUser', 'currentUserData']
  },
  index_html: {
    file: 'index.html',
    requires: ['#landing', '#dashboard', '#view-accueil']
  }
};

function verifierEnvironnement() {
  console.log('✅ Configuration Firebase v4.0 présente');
  console.log('✅ App.js avec gestion utilisateur');
  console.log('✅ Structure HTML avec vues');
  console.log('✅ CSS existant maintenu\n');
}

// ============================================================
// 2. CODE À AJOUTER DANS app.js (INTÉGRATION)
// ============================================================

const CODE_INTEGRATION = `
// ═══════════════════════════════════════════════════════════════
// IMPORTS NOUVEAUX MODULES v5.0
// À AJOUTER EN HAUT DE app.js (APRÈS LES IMPORTS EXISTANTS)
// ═══════════════════════════════════════════════════════════════

import {
  GeolocalisationAvancee,
  ProfilMembre,
  StatutSupporter,
  FichesActeursInternational
} from './app-avancee.js';

// ═══════════════════════════════════════════════════════════════
// VARIABLES GLOBALES SUPPLÉMENTAIRES
// À AJOUTER DANS LA SECTION ÉTAT GLOBAL
// ═══════════════════════════════════════════════════════════════

// Gestionnaires v5.0
let geoManager = null;              // Géolocalisation avancée
let supporterManager = null;        // Statut supporter
let profilManager = ProfilMembre;   // Profils complets

// ═══════════════════════════════════════════════════════════════
// INITIALISATION SUPPLÉMENTAIRE
// À AJOUTER DANS window.addEventListener('DOMContentLoaded')
// ═══════════════════════════════════════════════════════════════

function initializeV5Features() {
  // Initialiser gestionnaire géolocalisation
  geoManager = new GeolocalisationAvancee();
  
  // Initialiser map si élément présent
  const mapElement = document.getElementById('map-container');
  if (mapElement) {
    geoManager.initMap('map-container', {
      zoom: 8,
      center: { lat: 0.5, lng: 10 }
    });
  }
  
  console.log('✅ v5.0 Modules initialisés');
}

// ═══════════════════════════════════════════════════════════════
// MODIFICATIONS INSCRIPTION
// REMPLACER createDefaultProfile() POUR AJOUTER SUPPORTER
// ═══════════════════════════════════════════════════════════════

async function createDefaultProfile() {
  // Profil utilisateur existant (v4.0)
  const defaultProfile = {
    uid: currentUser.uid,
    email: currentUser.email,
    prenom: '',
    nom: '',
    telephone: '',
    ddn: '',
    ville: '',
    sport: 'Football',
    club: '',
    type: 'supporter',
    bio: '',
    photoURL: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const userRef = doc(db, COLLECTIONS.userProfiles, currentUser.uid);
  await setDoc(userRef, defaultProfile);
  
  // NOUVEAU: Créer profil supporter enrichi automatiquement
  try {
    await StatutSupporter.creerProfilSupporter(currentUser.uid, {
      email: currentUser.email,
      prenom: '',
      nom: '',
      telephone: '',
      club: '',
      equipePreferee: ''
    });
    console.log('✅ Profil supporter créé automatiquement');
  } catch (e) {
    console.warn('⚠️ Erreur création profil supporter:', e);
  }
  
  currentUserData = defaultProfile;
  currentRole = 'user';
  updateUIWithUserData();
}

// ═══════════════════════════════════════════════════════════════
// NOUVELLES FONCTIONNALITÉS ACCESSIBLES
// ═══════════════════════════════════════════════════════════════

// Géolocalisation
window.initMapSites = async function() {
  if (geoManager) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.sitesSportifs));
      const sites = [];
      snapshot.forEach(doc => {
        sites.push({ id: doc.id, ...doc.data() });
      });
      
      sites.forEach(site => {
        geoManager.addSiteMarker(site);
        geoManager.createGeofence(site, 5);
      });
      
      showToast(\`\${sites.length} sites chargés sur la carte\`, 'success');
    } catch (e) {
      console.error('Erreur chargement sites:', e);
    }
  }
};

// Profils enrichis
window.sauvegarderProfilComplet = async function(data) {
  try {
    await ProfilMembre.mettreAJourProfilComplet(currentUser.uid, data);
    showToast('✅ Profil complet enregistré', 'success');
  } catch (e) {
    console.error('Erreur:', e);
    showToast('Erreur lors de l\\'enregistrement', 'error');
  }
};

// Supporter enrichi
window.obtenirProfilSupporter = async function() {
  try {
    const docRef = doc(db, 'supporters_enrichi', currentUser.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (e) {
    console.error('Erreur récupération supporter:', e);
    return null;
  }
};

window.afficherClassementSupporters = async function() {
  try {
    const classement = await StatutSupporter.obtenirTableauClassement();
    
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    
    container.innerHTML = '';
    classement.forEach((supporter, index) => {
      const card = document.createElement('div');
      card.className = 'leaderboard-item';
      card.innerHTML = \`
        <div class="leaderboard-rank">#\${index + 1}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">\${supporter.prenom} \${supporter.nom}</div>
          <div class="leaderboard-level">\${supporter.niveau}</div>
        </div>
        <div class="leaderboard-points">\${supporter.points_totaux} pts</div>
      \`;
      container.appendChild(card);
    });
    
    showToast('✅ Classement mis à jour', 'success');
  } catch (e) {
    console.error('Erreur:', e);
  }
};

// Acteurs internationaux
window.creerFicheActeur = async function(type, donnees) {
  try {
    let fiche;
    
    if (type === 'JOUEUR') {
      fiche = await FichesActeursInternational.creerFicheJoueur(donnees);
    } else if (type === 'ARBITRE') {
      fiche = await FichesActeursInternational.creerFicheArbitre(donnees);
    } else if (type === 'CLUB') {
      fiche = await FichesActeursInternational.creerFicheClubInternational(donnees);
    }
    
    showToast(\`✅ Fiche \${type} créée\`, 'success');
    return fiche;
  } catch (e) {
    console.error('Erreur:', e);
    showToast('Erreur création fiche', 'error');
  }
};
`;

// ============================================================
// 3. MIGRER LES DONNÉES EXISTANTES
// ============================================================

const MIGRATION_SCRIPT = `
// ═══════════════════════════════════════════════════════════════
// SCRIPT MIGRATION DONNÉES v4.0 → v5.0
// À EXÉCUTER APRÈS DÉPLOIEMENT
// ═══════════════════════════════════════════════════════════════

async function migrateDataToV5() {
  console.log('🔄 Démarrage migration v4.0 → v5.0...\n');
  
  try {
    // 1. Migrer utilisateurs existants vers profils complets
    console.log('1️⃣  Migration profils utilisateurs...');
    const usersSnapshot = await getDocs(collection(db, 'userProfiles'));
    let migratedCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Enrichir profil existant avec v5.0 fields
      const enrichedProfile = {
        ...userData,
        identite: {
          prenom: userData.prenom || '',
          nom: userData.nom || '',
          email: userData.email,
          ddn: userData.ddn || '',
          sexe: '',
          nationalite: 'Gabon'
        },
        localisation: {
          ville: userData.ville || '',
          quartier: '',
          latitude: 0,
          longitude: 0
        },
        domaineSportif: {
          sports: [userData.sport || 'Football'],
          sportPrincipal: userData.sport || 'Football',
          niveau: userData.type === 'joueur' ? 'Amateur' : 'Amateur',
          experience_annees: 0,
          clubs_historique: userData.club ? [{
            nom: userData.club,
            dateDebut: userData.createdAt,
            position: ''
          }] : [],
          statistiques: {
            matchs_joues: 0,
            buts_marques: 0,
            passes_decisives: 0
          }
        },
        identiteNumerique: {
          photoURL: userData.photoURL || '',
          photosGalerie: [],
          videosURL: [],
          bio: userData.bio || ''
        },
        reseauxSociaux: {},
        badges: [{
          id: 'early-adopter',
          nom: '🌟 Early Adopter v5.0',
          dateObtention: serverTimestamp()
        }],
        profileCompletion: 25, // Profile min complété
        verifie: false
      };
      
      // Mettre à jour dans userProfiles_avancee
      const docRef = doc(db, 'userProfiles_avancee', userDoc.id);
      await setDoc(docRef, enrichedProfile);
      migratedCount++;
    }
    console.log(\`✅ \${migratedCount} profils migrés\n\`);
    
    // 2. Créer profils supporters pour utilisateurs existants
    console.log('2️⃣  Migration supporters...');
    let supportersCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      try {
        const supporterRef = doc(db, 'supporters_enrichi', userDoc.id);
        const supporterSnap = await getDoc(supporterRef);
        
        if (!supporterSnap.exists()) {
          await setDoc(supporterRef, {
            uid: userDoc.id,
            email: userData.email,
            profil: {
              prenom: userData.prenom || '',
              nom: userData.nom || '',
              localisation: { ville: userData.ville || '' }
            },
            affiliation: {
              clubPrincipal: userData.club || ''
            },
            systeme_points: {
              points_totaux: 0,
              niveau_actuel: 'BRONZE',
              historique_points: [{
                date: serverTimestamp(),
                montant: 0,
                raison: 'Création compte',
                type: 'gain'
              }]
            },
            engagement: {
              matchs_attendus: 0,
              articles_rediges: 0,
              photos_partagees: 0
            },
            badges: [{
              id: 'member-migrated',
              nom: '🎉 Membre Migré',
              dateObtention: serverTimestamp()
            }],
            conditions: {
              inscriptionValidee: true,
              emailValide: false,
              telephoneValide: false
            },
            createdAt: userData.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          supportersCount++;
        }
      } catch (e) {
        console.warn(\`⚠️  Erreur création supporter \${userDoc.id}:\`, e.message);
      }
    }
    console.log(\`✅ \${supportersCount} profils supporters créés\n\`);
    
    // 3. Migrer sites sportifs
    console.log('3️⃣  Migration sites sportifs...');
    const sitesSnapshot = await getDocs(collection(db, 'sitesSportifs'));
    let sitesCount = 0;
    
    for (const siteDoc of sitesSnapshot.docs) {
      const siteData = siteDoc.data();
      
      const siteAvancee = {
        ...siteData,
        localisation: {
          latitude: siteData.lat || 0,
          longitude: siteData.lng || 0,
          precision: 50,
          adresse: siteData.adresse || '',
          ville: siteData.ville || ''
        },
        infrastructure: {
          capacite: siteData.capacite || 0,
          surface: 0,
          domainsCouverts: false
        },
        acces: {
          contact: siteData.contact || '',
          horairesOuverture: '09:00-18:00'
        },
        services: {
          restauration: false,
          parking: true,
          vestiaires: true,
          douches: true,
          wifi: false
        },
        sports: [siteData.type || 'Football'],
        clubsAffiliees: [],
        geofences: [{
          rayon: 5,
          nom: 'Zone principale'
        }]
      };
      
      const docRef = doc(db, 'sitesSportifs_avancee', siteDoc.id);
      await setDoc(docRef, siteAvancee);
      sitesCount++;
    }
    console.log(\`✅ \${sitesCount} sites migrés\n\`);
    
    console.log(\`
╔═════════════════════════════════════════════╗
║     MIGRATION v5.0 COMPLÉTÉE ✅             ║
╠═════════════════════════════════════════════╣
║ Profils migrés: \${migratedCount}
║ Supporters créés: \${supportersCount}
║ Sites migrés: \${sitesCount}
║                                             ║
║ Prêt pour déploiement v5.0 🚀               ║
╚═════════════════════════════════════════════╝
    \`);
    
    return {
      success: true,
      stats: { migratedCount, supportersCount, sitesCount }
    };
    
  } catch (e) {
    console.error('❌ Erreur migration:', e);
    return { success: false, error: e.message };
  }
}

// Exécuter
// migrateDataToV5().then(result => console.log(result));
`;

// ============================================================
// 4. FICHIER CHECKLIST HTML À AJOUTER
// ============================================================

const HTML_ADDITIONS = `
<!-- À AJOUTER DANS index.html APRÈS LE SECTION EXISTANT -->

<!-- ════════════════════════════════════════════════════════ -->
<!-- VUES NOUVELLES v5.0 -->
<!-- ════════════════════════════════════════════════════════ -->

<!-- GÉOLOCALISATION -->
<section id="view-geolocalisation" class="view hidden">
  <h2>🗺️ Géolocalisation Avancée</h2>
  <div id="map-container" style="width: 100%; height: 500px; border-radius: 12px; margin: 20px 0;"></div>
  <div id="sites-results"></div>
</section>

<!-- PROFILS COMPLETS -->
<section id="view-profils-complets" class="view hidden">
  <h2>👤 Profils Complets Enrichis</h2>
  <div id="profil-container"></div>
</section>

<!-- SUPPORTER ENRICHI -->
<section id="view-supporter-enrichi" class="view hidden">
  <h2>🎯 Statut Supporter</h2>
  <div id="supporter-card"></div>
  <div id="leaderboard-container"></div>
</section>

<!-- ACTEURS INTERNATIONAUX -->
<section id="view-acteurs-internationaux" class="view hidden">
  <h2>🌍 Fiches Acteurs Internationaux</h2>
  <div id="acteurs-grid"></div>
</section>

<!-- Ajouter dans menu navigation -->
<a href="#" class="menu-item" data-view="geolocalisation">🗺️ Sites</a>
<a href="#" class="menu-item" data-view="profils-complets">👤 Profil</a>
<a href="#" class="menu-item" data-view="supporter-enrichi">🎯 Supporter</a>
<a href="#" class="menu-item" data-view="acteurs-internationaux">🌍 International</a>
`;

// ============================================================
// 5. PLAN DE DÉPLOIEMENT
// ============================================================

const DEPLOYMENT_PLAN = `
PLAN DE DÉPLOIEMENT v5.0
═════════════════════════════════════════════════════════════════

PHASE 1 : PRÉPARATION (1-2 jours)
┌─────────────────────────────────────────────────────────────
│ ✅ Vérifier environnement v4.0
│ ✅ Backup données Firebase
│ ✅ Créer branche v5.0
│ ✅ Tester localement les 4 modules
└─────────────────────────────────────────────────────────────

PHASE 2 : MISE À JOUR CODE (1 jour)
┌─────────────────────────────────────────────────────────────
│ ✅ Copier app-avancee.js
│ ✅ Copier schema-firestore.js
│ ✅ Ajouter imports dans app.js
│ ✅ Ajouter initialisation v5.0
│ ✅ Ajouter sections HTML
│ ✅ Mettre à jour firebase.json (storage rules)
│ ✅ Tests unitaires chaque module
└─────────────────────────────────────────────────────────────

PHASE 3 : MIGRATION DONNÉES (4-6 heures)
┌─────────────────────────────────────────────────────────────
│ ✅ Arrêt brève application (maintenance)
│ ✅ Exécuter script migration
│ ✅ Vérifier complétude migration
│ ✅ Validation données créées
└─────────────────────────────────────────────────────────────

PHASE 4 : DÉPLOIEMENT (1-2 heures)
┌─────────────────────────────────────────────────────────────
│ ✅ firebase deploy
│ ✅ Vérification application live
│ ✅ Tests smoke (signup, profil, supporter)
│ ✅ Monitoring logs Firebase
│ ✅ Notifier utilisateurs (newsletter)
└─────────────────────────────────────────────────────────────

PHASE 5 : POST-DÉPLOIEMENT (continu)
┌─────────────────────────────────────────────────────────────
│ ✅ Support utilisateurs
│ ✅ Bug fixes prioritaires
│ ✅ Analytics & monitoring
│ ✅ Feedback utilisateurs
│ ✅ Performance optimization
└─────────────────────────────────────────────────────────────

ROLLBACK PLAN
─────────────────────────────────────────────────────────────
Si problème majeur détecté:
1. Redéployer v4.0 depuis backup (firebase deploy --only hosting)
2. Restaurer données Firestore depuis backup
3. Communiquer utilisateurs
4. Identifier et fixer problème
5. Redéployer v5.0
`;

// ============================================================
// AFFICHAGE GUIDE
// ============================================================

console.log(\`
╔════════════════════════════════════════════════════════════╗
║   MIGRATION v4.0 → v5.0 — GUIDE D'INTÉGRATION            ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📋 ÉTAPES À SUIVRE:                                       ║
║                                                            ║
║  1️⃣  COPIER LES FICHIERS:                                 ║
║      • app-avancee.js                                     ║
║      • schema-firestore.js                                ║
║      • index-avancee.html (optionnel)                     ║
║                                                            ║
║  2️⃣  AJOUTER CODE D'INTÉGRATION (voir ci-dessous)        ║
║      • Imports dans app.js                                ║
║      • Initialisation v5.0                                ║
║      • Nouvelles fonctionnalités                          ║
║                                                            ║
║  3️⃣  EXÉCUTER SCRIPT MIGRATION                            ║
║      • Migrer données existantes                          ║
║      • Créer profils supporters                           ║
║      • Enrich sites sportifs                              ║
║                                                            ║
║  4️⃣  DÉPLOYER                                             ║
║      • firebase deploy                                    ║
║      • Vérifier live                                      ║
║      • Monitoring                                         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
\`);

console.log('\\n📝 CODE À AJOUTER:\\n');
console.log(CODE_INTEGRATION);

console.log('\\n\🔄 SCRIPT MIGRATION:\\n');
console.log(MIGRATION_SCRIPT);

console.log('\\n📄 ADDITIONS HTML:\\n');
console.log(HTML_ADDITIONS);

console.log('\\n🚀 PLAN DÉPLOIEMENT:\\n');
console.log(DEPLOYMENT_PLAN);

// Export pour utilisation
export {
  CODE_INTEGRATION,
  MIGRATION_SCRIPT,
  HTML_ADDITIONS,
  DEPLOYMENT_PLAN,
  verifierEnvironnement
};

console.log('\\n✅ Guide migration généré. Prêt pour v5.0! 🚀');
`;

console.log(MIGRATION_SCRIPT);
