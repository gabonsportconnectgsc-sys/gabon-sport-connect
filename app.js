// ============================================================
// app-avancee.js — v5.0 COMPLET
// 4 GRANDES FONCTIONNALITÉS INTÉGRÉES :
//   1️⃣  Géolocalisation avancée des sites
//   2️⃣  Profils complets enrichis des membres  
//   3️⃣  Statut supporter enrichi depuis l'inscription
//   4️⃣  Fiches acteurs à l'international
// ============================================================

import { auth, db, storage } from './firebase-config.js';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, addDoc, getDocs, deleteDoc, updateDoc, doc, getDoc, setDoc, 
  serverTimestamp, query, orderBy, where, limit, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ──────────────────────────────────────────────────────────
// ① GÉOLOCALISATION AVANCÉE DES SITES
// ──────────────────────────────────────────────────────────

class GeolocalisationAvancee {
  constructor() {
    this.map = null;
    this.markers = [];
    this.userLocation = null;
    this.geofences = [];
    this.searchRadius = 50; // km
  }

  /**
   * Initialiser la carte Google Maps avec options avancées
   */
  initMap(elementId, options = {}) {
    const defaultOptions = {
      zoom: 8,
      center: { lat: 0.5, lng: 10 },
      mapTypeId: 'roadmap',
      gestureHandling: 'greedy',
      fullscreenControl: true,
      mapTypeControl: true,
      streetViewControl: true,
      zoomControl: true
    };

    this.map = new google.maps.Map(
      document.getElementById(elementId),
      { ...defaultOptions, ...options }
    );

    this.initGeolocation();
    return this.map;
  }

  /**
   * Obtenir la géolocalisation actuelle de l'utilisateur
   */
  initGeolocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date()
          };
          this.centerMapOnUser();
          this.addUserMarker();
        },
        (error) => console.error('Erreur géolocalisation:', error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }

  /**
   * Centrer la carte sur la position utilisateur
   */
  centerMapOnUser() {
    if (this.userLocation && this.map) {
      this.map.setCenter({
        lat: this.userLocation.lat,
        lng: this.userLocation.lng
      });
      this.map.setZoom(12);
    }
  }

  /**
   * Ajouter un marqueur pour la position de l'utilisateur
   */
  addUserMarker() {
    if (!this.userLocation || !this.map) return;
    
    const userMarker = new google.maps.Marker({
      position: { lat: this.userLocation.lat, lng: this.userLocation.lng },
      map: this.map,
      title: 'Votre position',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2
      }
    });
  }

  /**
   * Calculer distance entre deux points (Haversine)
   */
  calculerDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Rayon Terre en km
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
  }

  /**
   * Ajouter un site sur la carte avec clustering intelligent
   */
  addSiteMarker(site, color = '#009E60') {
    if (!this.map) return null;

    const marker = new google.maps.Marker({
      position: { lat: site.lat, lng: site.lng },
      map: this.map,
      title: site.nom,
      icon: this.createMarkerIcon(color),
      animation: google.maps.Animation.DROP
    });

    // Distance à l'utilisateur
    let distanceText = '';
    if (this.userLocation) {
      const dist = this.calculerDistance(
        this.userLocation.lat, this.userLocation.lng,
        site.lat, site.lng
      );
      distanceText = `<br><strong>📍 Distance:</strong> ${dist.toFixed(1)} km`;
    }

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="site-info-bubble">
          <h3>${site.nom}</h3>
          <p><strong>Type:</strong> ${site.type}</p>
          <p><strong>Ville:</strong> ${site.ville}</p>
          <p><strong>Capacité:</strong> ${site.capacite || '--'} places</p>
          <p><strong>📞 Contact:</strong> ${site.contact || 'N/A'}</p>
          ${distanceText}
          <p style="margin-top: 10px;">
            <button class="btn-mini" onclick="window.open('https://maps.google.com/?q=${site.lat},${site.lng}', '_blank')">
              🗺️ Voir sur Maps
            </button>
          </p>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(this.map, marker);
    });

    this.markers.push({ marker, site, infoWindow });
    return marker;
  }

  /**
   * Créer une icône personnalisée pour le marqueur
   */
  createMarkerIcon(color) {
    return {
      path: 'M 0,0 C -2,-2.6 -5,-4 -5,-7 C -5,-10.04 -2.46,-12.5 0.54,-12.5 C 3.54,-12.5 6,-10.04 6,-7 C 6,-4 3,1.95 0,0 Z',
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2,
      scale: 2
    };
  }

  /**
   * Créer des géofences circulaires autour des sites
   */
  createGeofence(site, radiusKm = 5) {
    if (!this.map) return null;

    const circle = new google.maps.Circle({
      strokeColor: site.couleur || '#009E60',
      strokeOpacity: 0.3,
      strokeWeight: 2,
      fillColor: site.couleur || '#009E60',
      fillOpacity: 0.1,
      map: this.map,
      center: { lat: site.lat, lng: site.lng },
      radius: radiusKm * 1000 // convertir km en mètres
    });

    this.geofences.push({ circle, site, radiusKm });
    return circle;
  }

  /**
   * Vérifier si l'utilisateur est dans une géofence
   */
  verifierGeofence() {
    if (!this.userLocation) return [];

    const sitesProches = [];
    for (const { circle, site, radiusKm } of this.geofences) {
      const distance = this.calculerDistance(
        this.userLocation.lat, this.userLocation.lng,
        site.lat, site.lng
      );
      if (distance <= radiusKm) {
        sitesProches.push({ site, distance });
      }
    }
    return sitesProches;
  }

  /**
   * Filtrer les sites par critères avancés
   */
  filtrerSites(sites, criteres) {
    return sites.filter(site => {
      if (criteres.type && site.type !== criteres.type) return false;
      if (criteres.ville && site.ville !== criteres.ville) return false;
      if (criteres.capaciteMin && site.capacite < criteres.capaciteMin) return false;
      if (criteres.rayon && this.userLocation) {
        const dist = this.calculerDistance(
          this.userLocation.lat, this.userLocation.lng,
          site.lat, site.lng
        );
        if (dist > criteres.rayon) return false;
      }
      return true;
    });
  }

  /**
   * Générer un rapport KML pour export GIS
   */
  exporterKML(sites) {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Sites Sportifs Gabon</name>
`;
    sites.forEach(site => {
      kml += `
    <Placemark>
      <name>${site.nom}</name>
      <description>${site.type} - ${site.ville}</description>
      <Point>
        <coordinates>${site.lng},${site.lat}</coordinates>
      </Point>
    </Placemark>`;
    });
    kml += `
  </Document>
</kml>`;
    return kml;
  }
}

// ──────────────────────────────────────────────────────────
// ② PROFILS COMPLETS ENRICHIS DES MEMBRES
// ──────────────────────────────────────────────────────────

class ProfilMembre {
  static CHAMPS_PROFIL_COMPLET = {
    // Identité
    prenom: String,
    nom: String,
    email: String,
    telephone: String,
    ddn: String,
    sexe: String, // M/F/Autre
    
    // Localisation
    ville: String,
    quartier: String,
    latitude: Number,
    longitude: Number,
    adresseComplete: String,
    
    // Professionnel/Sport
    sport: String,
    clubs: Array, // [{ nom, position, dates }]
    experience: Number, // années
    niveau: String, // Amateur/Semi-pro/Pro
    specialites: Array,
    
    // Média & Présence
    photoURL: String,
    photosGalerie: Array, // [{ url, date, description }]
    videos: Array, // [{ url, titre, date }]
    bio: String,
    biographieDetaillee: String,
    
    // Réseaux & Contact
    reseauxSociaux: Object, // { instagram, facebook, twitter, linkedin }
    site: String,
    
    // Préférences
    publiquement: Boolean,
    accepteMessages: Boolean,
    notifications: Object,
    
    // Statistiques
    matchsJoues: Number,
    buts: Number,
    passes: Number,
    cartons: { jaune: Number, rouge: Number },
    classement: Number,
    
    // Badges & Achievements
    badges: Array,
    certifications: Array,
    
    // Metadata
    createdAt: Timestamp,
    updatedAt: Timestamp,
    lastActiveAt: Timestamp,
    verifie: Boolean
  };

  static async creerProfilComplet(uid, donnees) {
    const profil = {
      uid,
      ...donnees,
      clubs: donnees.clubs || [],
      photosGalerie: donnees.photosGalerie || [],
      videos: donnees.videos || [],
      reseauxSociaux: donnees.reseauxSociaux || {},
      cartons: donnees.cartons || { jaune: 0, rouge: 0 },
      badges: donnees.badges || [],
      certifications: donnees.certifications || [],
      matchsJoues: donnees.matchsJoues || 0,
      buts: donnees.buts || 0,
      passes: donnees.passes || 0,
      classement: donnees.classement || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
      verifie: false
    };

    const docRef = doc(db, 'userProfiles', uid);
    await setDoc(docRef, profil);
    return profil;
  }

  static async obtenirProfilComplet(uid) {
    const docRef = doc(db, 'userProfiles', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  static async mettreAJourProfilComplet(uid, donnees) {
    const docRef = doc(db, 'userProfiles', uid);
    await updateDoc(docRef, {
      ...donnees,
      updatedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp()
    });
  }

  static async ajouterClub(uid, club) {
    const profil = await this.obtenirProfilComplet(uid);
    const clubs = profil?.clubs || [];
    clubs.push({
      ...club,
      dateAjout: serverTimestamp()
    });
    await this.mettreAJourProfilComplet(uid, { clubs });
  }

  static async ajouterPhotoGalerie(uid, photoData) {
    const profil = await this.obtenirProfilComplet(uid);
    const photos = profil?.photosGalerie || [];
    photos.push({
      ...photoData,
      dateAjout: serverTimestamp()
    });
    await this.mettreAJourProfilComplet(uid, { photosGalerie: photos });
  }

  static async ajouterBadge(uid, badge) {
    const profil = await this.obtenirProfilComplet(uid);
    const badges = profil?.badges || [];
    badges.push(badge);
    await this.mettreAJourProfilComplet(uid, { badges });
  }

  static async enregistrerStatistiques(uid, stats) {
    const docRef = doc(db, 'userProfiles', uid);
    await updateDoc(docRef, {
      matchsJoues: (stats.matchsJoues || 0),
      buts: (stats.buts || 0),
      passes: (stats.passes || 0),
      cartons: stats.cartons || { jaune: 0, rouge: 0 },
      classement: stats.classement || 0,
      updatedAt: serverTimestamp()
    });
  }
}

// ──────────────────────────────────────────────────────────
// ③ STATUT SUPPORTER ENRICHI DEPUIS L'INSCRIPTION
// ──────────────────────────────────────────────────────────

class StatutSupporter {
  static NIVEAUX_SUPPORTER = {
    BRONZE: { nom: 'Bronze', points: 0, avantages: [] },
    ARGENT: { nom: 'Argent', points: 500, avantages: ['reduction_10%', 'priorite_tickets'] },
    OR: { nom: 'Or', points: 2000, avantages: ['reduction_20%', 'priorite_tickets', 'acces_vip'] },
    PLATINE: { nom: 'Platine', points: 5000, avantages: ['reduction_30%', 'priorite_tickets', 'acces_vip', 'rencontre_joueurs'] }
  };

  static async creerProfilSupporter(uid, donnees) {
    const profilSupporter = {
      uid,
      email: donnees.email,
      prenom: donnees.prenom,
      nom: donnees.nom,
      telephone: donnees.telephone,
      
      // Supporter spécifique
      club: donnees.club || '',
      equipePreferee: donnees.equipePreferee || '',
      joueursPreferees: donnees.joueursPreferees || [],
      
      // Niveau & Points
      niveau: 'BRONZE',
      points: 0,
      pointsHistorique: [],
      
      // Engagements
      matchsAttendus: 0,
      matchsAttendues: [],
      
      // Contributions
      articlesRediges: 0,
      photosPartagees: 0,
      commentairesPostes: 0,
      
      // Récompenses
      badges: [
        {
          id: 'supporter-inscrit',
          nom: '🌟 Nouveau Supporter',
          date: serverTimestamp()
        }
      ],
      
      // Préférences Supporter
      notificationsMatchs: true,
      notificationsClub: true,
      notificationsActualites: true,
      abonnementsMails: true,
      
      // Métadonnées
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      inscriptionValidee: false,
      emailValide: false,
      telephoneValide: false
    };

    const docRef = doc(db, 'supporters', uid);
    await setDoc(docRef, profilSupporter);
    return profilSupporter;
  }

  static async gainerPoints(uid, montantPoints, raison) {
    const docRef = doc(db, 'supporters', uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const pointsActuels = (data.points || 0) + montantPoints;
    const nouveauNiveau = this.determinerNiveau(pointsActuels);

    const historique = data.pointsHistorique || [];
    historique.push({
      date: serverTimestamp(),
      montant: montantPoints,
      raison,
      soldeAvant: data.points || 0,
      soldeApres: pointsActuels
    });

    await updateDoc(docRef, {
      points: pointsActuels,
      pointsHistorique: historique,
      niveau: nouveauNiveau,
      updatedAt: serverTimestamp()
    });

    return { pointsActuels, nouveauNiveau };
  }

  static determinerNiveau(points) {
    if (points >= 5000) return 'PLATINE';
    if (points >= 2000) return 'OR';
    if (points >= 500) return 'ARGENT';
    return 'BRONZE';
  }

  static async ajouterMatchAttend(uid, matchId, details) {
    const docRef = doc(db, 'supporters', uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return;

    const matchsAttendues = docSnap.data().matchsAttendues || [];
    matchsAttendues.push({
      matchId,
      dateAjout: serverTimestamp(),
      ...details
    });

    await updateDoc(docRef, {
      matchsAttendues,
      matchsAttendus: (docSnap.data().matchsAttendus || 0) + 1,
      updatedAt: serverTimestamp()
    });

    // Gagner des points
    await this.gainerPoints(uid, 10, `Inscription au match: ${details.nomMatch}`);
  }

  static async obtenirTableauClassement() {
    const q = query(
      collection(db, 'supporters'),
      orderBy('points', 'desc'),
      limit(100)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  static async ajouterBadgeSupporter(uid, badge) {
    const docRef = doc(db, 'supporters', uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return;

    const badges = docSnap.data().badges || [];
    badges.push({
      ...badge,
      dateAjout: serverTimestamp()
    });

    await updateDoc(docRef, {
      badges,
      updatedAt: serverTimestamp()
    });
  }

  static async validerEmail(uid) {
    await updateDoc(doc(db, 'supporters', uid), {
      emailValide: true,
      updatedAt: serverTimestamp()
    });
    await this.gainerPoints(uid, 25, 'Email validé');
  }

  static async validerTelephone(uid) {
    await updateDoc(doc(db, 'supporters', uid), {
      telephoneValide: true,
      updatedAt: serverTimestamp()
    });
    await this.gainerPoints(uid, 25, 'Téléphone validé');
  }
}

// ──────────────────────────────────────────────────────────
// ④ FICHES ACTEURS À L'INTERNATIONAL
// ──────────────────────────────────────────────────────────

class FichesActeursInternational {
  static async creerFicheJoueur(donnees) {
    const fiche = {
      typeActeur: 'JOUEUR',
      
      // Identité
      nom: donnees.nom,
      prenom: donnees.prenom,
      nationalite: donnees.nationalite || 'Gabon',
      ddn: donnees.ddn,
      sexe: donnees.sexe,
      taille: donnees.taille,
      poids: donnees.poids,
      
      // Carrière
      position: donnees.position,
      numero: donnees.numero,
      pied: donnees.pied, // Droit/Gauche
      club: donnees.club,
      saison: donnees.saison,
      dateSignature: donnees.dateSignature,
      contratExpire: donnees.contratExpire,
      
      // Palmarès
      selections: donnees.selections || 0,
      buts: donnees.buts || 0,
      passes: donnees.passes || 0,
      trophees: donnees.trophees || [],
      
      // Marché
      valeurMarche: donnees.valeurMarche || 0,
      devise: 'EUR',
      tendance: donnees.tendance || 'STABLE',
      
      // Média
      photoURL: donnees.photoURL,
      videos: donnees.videos || [],
      statistiques: donnees.statistiques || {},
      
      // International
      selectionNationale: donnees.selectionNationale || false,
      equipes: donnees.equipes || [],
      competitionsInter: donnees.competitionsInter || [],
      
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      verifie: false
    };

    const docRef = await addDoc(collection(db, 'joueursInternational'), fiche);
    return { id: docRef.id, ...fiche };
  }

  static async creerFicheArbitre(donnees) {
    const fiche = {
      typeActeur: 'ARBITRE',
      
      // Identité
      nom: donnees.nom,
      prenom: donnees.prenom,
      nationalite: donnees.nationalite || 'Gabon',
      ddn: donnees.ddn,
      sexe: donnees.sexe,
      
      // Certification
      niveau: donnees.niveau, // National/Continental/Mondial
      sports: donnees.sports || [],
      dateAcreditationDebut: donnees.dateAcreditationDebut,
      dateAcreditationFin: donnees.dateAcreditationFin,
      acrediteAuNiveau: donnees.acrediteAuNiveau,
      
      // Expérience
      matchsArbbitres: donnees.matchsArbbitres || 0,
      competitionsOfficielles: donnees.competitionsOfficielles || [],
      
      // Évaluations
      notePerformance: donnees.notePerformance || 5,
      evaluationsRecentes: donnees.evaluationsRecentes || [],
      incidents: donnees.incidents || [],
      
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      verifie: false
    };

    const docRef = await addDoc(collection(db, 'arbitresInternational'), fiche);
    return { id: docRef.id, ...fiche };
  }

  static async creerFicheClubInternational(donnees) {
    const fiche = {
      typeActeur: 'CLUB',
      
      // Identité
      nom: donnees.nom,
      nomCourt: donnees.nomCourt,
      pays: donnees.pays,
      ville: donnees.ville,
      
      // Structure
      fondationAnnee: donnees.fondationAnnee,
      stade: donnees.stade,
      capaciteStade: donnees.capaciteStade,
      president: donnees.president,
      entraineur: donnees.entraineur,
      
      // Sport(s)
      sports: donnees.sports || ['Football'],
      feminin: donnees.feminin || false,
      
      // Palmarès
      trophees: donnees.trophees || [],
      ligueActuelle: donnees.ligueActuelle,
      positionnement: donnees.positionnement,
      
      // International
      competitionsEuropeennes: donnees.competitionsEuropeennes || [],
      palmareInternational: donnees.palmareInternational || {},
      
      // Média
      logoURL: donnees.logoURL,
      reseauxSociaux: donnees.reseauxSociaux || {},
      sitesOfficiels: donnees.sitesOfficiels || [],
      
      // Effectif
      effectifTotal: donnees.effectifTotal || 0,
      joueursActuels: donnees.joueursActuels || [],
      
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      verifie: false
    };

    const docRef = await addDoc(collection(db, 'clubsInternational'), fiche);
    return { id: docRef.id, ...fiche };
  }

  static async rechercherActeursInternational(type, criteres) {
    let collectionName = '';
    
    if (type === 'JOUEUR') collectionName = 'joueursInternational';
    else if (type === 'ARBITRE') collectionName = 'arbitresInternational';
    else if (type === 'CLUB') collectionName = 'clubsInternational';
    
    let q = collection(db, collectionName);
    if (criteres.nationalite) {
      q = query(q, where('nationalite', '==', criteres.nationalite));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  static async obtenirFicheActeur(id, type) {
    let collectionName = '';
    if (type === 'JOUEUR') collectionName = 'joueursInternational';
    else if (type === 'ARBITRE') collectionName = 'arbitresInternational';
    else if (type === 'CLUB') collectionName = 'clubsInternational';
    
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }

  static async exporterFicheActeur(acteur, format = 'json') {
    if (format === 'json') {
      return JSON.stringify(acteur, null, 2);
    } else if (format === 'csv') {
      const keys = Object.keys(acteur);
      const header = keys.join(',');
      const values = keys.map(k => `"${acteur[k]}"`).join(',');
      return `${header}\n${values}`;
    }
    return acteur;
  }
}

// ──────────────────────────────────────────────────────────
// EXPORT & INTÉGRATION GÉNÉRALE
// ──────────────────────────────────────────────────────────

window.GeolocalisationAvancee = GeolocalisationAvancee;
window.ProfilMembre = ProfilMembre;
window.StatutSupporter = StatutSupporter;
window.FichesActeursInternational = FichesActeursInternational;

// Variables globales
let geoManager = null;

// Initialiser au chargement
window.addEventListener('DOMContentLoaded', () => {
  geoManager = new GeolocalisationAvancee();
  console.log('✅ App Avancée v5.0 chargée — 4 fonctionnalités actives');
});

export { 
  GeolocalisationAvancee, 
  ProfilMembre, 
  StatutSupporter, 
  FichesActeursInternational 
};
