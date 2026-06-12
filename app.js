// ============================================================
// app.js — Gabon Sport Connect v4.0 (CORRIGÉ)
// Fix: Photos via Firebase Storage, import setDoc en haut,
//      supporters chargés correctement
// ============================================================

import { auth, db, storage } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, addDoc, getDocs, deleteDoc, updateDoc,
  doc, getDoc, setDoc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ─── ÉTAT GLOBAL ─────────────────────────────────────────
let currentUser = null;
let currentRole = null;
let currentUserData = null;
let currentView = 'accueil';
let sitesMap = null;
let sitesMarkers = [];

const ADMIN_EMAIL = 'gabonsportconnectgsc@gmail.com';
const COLLECTIONS = {
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
  matchs: 'matchs'
};

// ─── SITES SPORTIFS GABONAIS PRÉDÉFINIS ─────────────────
const SITES_GABON_PREDEFINIS = [
  { nom: "Stade de l'Amitié", type: "Stade", ville: "Libreville", adresse: "Boulevard de l'Indépendance", lat: 0.4162, lng: 9.4679, capacite: 30000, contact: "+241 1 76 44 44" },
  { nom: "Stade Omnisports", type: "Stade", ville: "Port-Gentil", adresse: "Port-Gentil", lat: -0.6167, lng: 8.7667, capacite: 15000, contact: "+241 2 55 12 12" },
  { nom: "Gymnase de Libreville", type: "Gymnase", ville: "Libreville", adresse: "Avenue de la Paix", lat: 0.4200, lng: 9.4700, capacite: 5000, contact: "+241 1 76 30 30" },
  { nom: "Piscine Olympique", type: "Piscine", ville: "Libreville", adresse: "Quartier Batavéa", lat: 0.4100, lng: 9.4600, capacite: 2000, contact: "+241 1 76 20 20" },
  { nom: "Stade d'Oyem", type: "Stade", ville: "Oyem", adresse: "Oyem", lat: 1.5833, lng: 11.5667, capacite: 8000, contact: "+241 3 72 15 15" }
];

// ─── INITIALISATION ─────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  checkAuthState();
  initEventListeners();
  initSitesMap();
});

function initEventListeners() {
  // Auth
  document.getElementById('btn-open-login')?.addEventListener('click', openLoginModal);
  document.getElementById('btn-hero-start')?.addEventListener('click', openLoginModal);
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);

  // Profile
  document.getElementById('profile-form')?.addEventListener('submit', handleProfileSave);
  document.getElementById('btn-profile-reset')?.addEventListener('click', loadUserProfile);
  document.getElementById('profile-photo-input')?.addEventListener('change', handleProfilePhotoChange);

  // Supporters
  document.getElementById('btn-new-supporter')?.addEventListener('click', openSupporterModal);
  document.getElementById('supporter-form')?.addEventListener('submit', handleSupporterSave);
  document.getElementById('supporter-modal-close')?.addEventListener('click', closeSupporterModal);
  document.getElementById('supporter-form-cancel')?.addEventListener('click', closeSupporterModal);

  // Sites sportifs
  document.getElementById('btn-new-site')?.addEventListener('click', openSiteModal);
  document.getElementById('site-form')?.addEventListener('submit', handleSiteSave);
  document.getElementById('site-modal-close')?.addEventListener('click', closeSiteModal);
  document.getElementById('site-form-cancel')?.addEventListener('click', closeSiteModal);

  // Menu navigation
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      switchView(view);
      document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// ─── AUTHENTIFICATION ─────────────────────────────────────
function checkAuthState() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData();
      showDashboard();
    } else {
      showLanding();
    }
  });
}

async function loadUserData() {
  try {
    const userRef = doc(db, COLLECTIONS.userProfiles, currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      currentUserData = userSnap.data();
      currentRole = currentUserData.role || 'user';
      updateUIWithUserData();
    } else {
      await createDefaultProfile();
    }
  } catch (e) {
    console.error('Erreur chargement profil:', e);
    showToast('Erreur lors du chargement du profil', 'error');
  }
}

async function createDefaultProfile() {
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
  currentUserData = defaultProfile;
  currentRole = 'user';
  updateUIWithUserData();
}

function updateUIWithUserData() {
  const userName = currentUserData.prenom
    ? `${currentUserData.prenom} ${currentUserData.nom}`
    : 'Utilisateur';
  document.getElementById('user-name').textContent = userName;
  document.getElementById('user-role').textContent = currentUserData.type || 'Membre';

  const avatar = document.getElementById('user-avatar');
  if (currentUserData.photoURL) {
    avatar.innerHTML = `<img src="${currentUserData.photoURL}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    avatar.textContent = '📋';
  }

  const welcomeEl = document.getElementById('welcome-message');
  if (welcomeEl) {
    welcomeEl.textContent = `Bienvenue ${currentUserData.prenom || 'utilisateur'} ! 👋`;
  }
}

function handleLogout() {
  signOut(auth).then(() => {
    currentUser = null;
    currentUserData = null;
    showLanding();
    showToast('Déconnecté avec succès', 'success');
  }).catch(e => {
    console.error('Erreur déconnexion:', e);
    showToast('Erreur lors de la déconnexion', 'error');
  });
}

// ─── GESTION DU PROFIL ─────────────────────────────────────
async function loadUserProfile() {
  if (!currentUserData) return;

  document.getElementById('profile-prenom').value = currentUserData.prenom || '';
  document.getElementById('profile-nom').value = currentUserData.nom || '';
  document.getElementById('profile-email').value = currentUserData.email || '';
  document.getElementById('profile-telephone').value = currentUserData.telephone || '';
  document.getElementById('profile-ddn').value = currentUserData.ddn || '';
  document.getElementById('profile-ville').value = currentUserData.ville || '';
  document.getElementById('profile-sport').value = currentUserData.sport || 'Football';
  document.getElementById('profile-club').value = currentUserData.club || '';
  document.getElementById('profile-type').value = currentUserData.type || 'supporter';
  document.getElementById('profile-bio').value = currentUserData.bio || '';

  const photoDisplay = document.getElementById('profile-photo-display');
  photoDisplay.src = currentUserData.photoURL || 'https://via.placeholder.com/180?text=Photo+Profil';

  if (currentUserData.createdAt) {
    try {
      const createdDate = new Date(currentUserData.createdAt.toDate()).toLocaleDateString('fr-FR');
      document.getElementById('profile-inscrit-depuis').textContent = createdDate;
    } catch {}
  }
  if (currentUserData.updatedAt) {
    try {
      const updatedDate = new Date(currentUserData.updatedAt.toDate()).toLocaleDateString('fr-FR');
      document.getElementById('profile-modifie-le').textContent = updatedDate;
    } catch {}
  }
}

async function handleProfileSave(e) {
  e.preventDefault();

  const updatedData = {
    prenom: document.getElementById('profile-prenom').value,
    nom: document.getElementById('profile-nom').value,
    telephone: document.getElementById('profile-telephone').value,
    ddn: document.getElementById('profile-ddn').value,
    ville: document.getElementById('profile-ville').value,
    sport: document.getElementById('profile-sport').value,
    club: document.getElementById('profile-club').value,
    type: document.getElementById('profile-type').value,
    bio: document.getElementById('profile-bio').value,
    updatedAt: serverTimestamp()
  };

  try {
    const userRef = doc(db, COLLECTIONS.userProfiles, currentUser.uid);
    await updateDoc(userRef, updatedData);
    currentUserData = { ...currentUserData, ...updatedData };
    updateUIWithUserData();
    showToast('✅ Profil mis à jour avec succès !', 'success');
  } catch (e) {
    console.error('Erreur sauvegarde profil:', e);
    showToast('Erreur lors de la sauvegarde', 'error');
  }
}

// ─── UPLOAD PHOTO VERS FIREBASE STORAGE ─────────────────────
// FIX PRINCIPAL : on stocke la photo dans Storage, pas en base64 dans Firestore
async function uploadPhotoToStorage(file, path) {
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  return url;
}

async function handleProfilePhotoChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('La photo doit faire moins de 5MB', 'error');
    return;
  }

  showToast('⏳ Upload en cours...', 'success');

  try {
    // Upload vers Storage (pas base64 dans Firestore !)
    const path = `profiles/photos/${currentUser.uid}`;
    const url = await uploadPhotoToStorage(file, path);

    // Sauvegarder uniquement l'URL dans Firestore
    const userRef = doc(db, COLLECTIONS.userProfiles, currentUser.uid);
    await updateDoc(userRef, {
      photoURL: url,
      updatedAt: serverTimestamp()
    });

    currentUserData.photoURL = url;
    document.getElementById('profile-photo-display').src = url;
    updateUIWithUserData();
    showToast('✅ Photo de profil mise à jour !', 'success');
  } catch (e) {
    console.error('Erreur upload photo:', e);
    showToast('Erreur lors de l\'upload de la photo', 'error');
  }
}

// ─── GESTION SUPPORTERS ─────────────────────────────────────
function openSupporterModal() {
  document.getElementById('supporter-id').value = '';
  document.getElementById('supporter-form').reset();
  document.getElementById('supporter-modal').classList.remove('hidden');
}

function closeSupporterModal() {
  document.getElementById('supporter-modal').classList.add('hidden');
}

async function handleSupporterSave(e) {
  e.preventDefault();

  const supporterId = document.getElementById('supporter-id').value;

  const supporterData = {
    nom: document.getElementById('supporter-nom').value,
    email: document.getElementById('supporter-email').value,
    telephone: document.getElementById('supporter-telephone').value,
    club: document.getElementById('supporter-club').value,
    dateInscription: document.getElementById('supporter-date-inscription').value,
    createdBy: currentUser.uid,
    updatedAt: serverTimestamp()
  };

  const photoInput = document.getElementById('supporter-photo');
  const file = photoInput.files[0];

  try {
    showToast('⏳ Enregistrement...', 'success');

    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        showToast('Photo max 3MB', 'error');
        return;
      }
      // Upload photo vers Storage
      const path = `supporters/photos/${currentUser.uid}_${Date.now()}`;
      supporterData.photoURL = await uploadPhotoToStorage(file, path);
    }

    if (supporterId) {
      // Mise à jour
      await updateDoc(doc(db, COLLECTIONS.supporters, supporterId), supporterData);
      showToast('✅ Supporter mis à jour !', 'success');
    } else {
      // Nouveau
      supporterData.createdAt = serverTimestamp();
      await addDoc(collection(db, COLLECTIONS.supporters), supporterData);
      showToast('✅ Supporter enregistré !', 'success');
    }

    closeSupporterModal();
    loadSupporters();
  } catch (e) {
    console.error('Erreur sauvegarde supporter:', e);
    showToast('Erreur lors de l\'enregistrement', 'error');
  }
}

async function loadSupporters() {
  const container = document.getElementById('supporters-list');
  if (!container) return;

  container.innerHTML = '<p style="text-align:center;color:var(--text-3);">⏳ Chargement...</p>';

  try {
    const q = query(collection(db, COLLECTIONS.supporters), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-3);">Aucun supporter enregistré</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="supporter-card">
          <img
            src="${data.photoURL || 'https://via.placeholder.com/64?text=👤'}"
            class="supporter-photo"
            alt="${data.nom}"
            onerror="this.src='https://via.placeholder.com/64?text=👤'"
          >
          <div class="supporter-info">
            <div class="supporter-name">${data.nom}</div>
            <div class="supporter-club">📍 ${data.club || 'Non spécifié'}</div>
            <div class="supporter-meta">
              <strong>Email:</strong> ${data.email || '--'}<br>
              <strong>Tél:</strong> ${data.telephone || '--'}
            </div>
          </div>
        </div>
        <div class="card-actions">
          <button class="card-btn" onclick="editSupporter('${docSnap.id}')">✏️ Éditer</button>
          <button class="card-btn danger" onclick="deleteSupporter('${docSnap.id}')">🗑️ Supprimer</button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error('Erreur chargement supporters:', e);
    container.innerHTML = '<p style="text-align:center;color:red;">Erreur de chargement</p>';
  }
}

window.editSupporter = async function(id) {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.supporters, id));
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('supporter-id').value = id;
      document.getElementById('supporter-nom').value = data.nom || '';
      document.getElementById('supporter-email').value = data.email || '';
      document.getElementById('supporter-telephone').value = data.telephone || '';
      document.getElementById('supporter-club').value = data.club || '';
      document.getElementById('supporter-date-inscription').value = data.dateInscription || '';
      openSupporterModal();
    }
  } catch (e) {
    showToast('Erreur lors du chargement', 'error');
  }
};

window.deleteSupporter = async function(id) {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce supporter ?')) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.supporters, id));
      showToast('✅ Supporter supprimé', 'success');
      loadSupporters();
    } catch (e) {
      console.error('Erreur suppression:', e);
      showToast('Erreur lors de la suppression', 'error');
    }
  }
};

// ─── GESTION SITES SPORTIFS ─────────────────────────────────
function initSitesMap() {
  if (window.google && window.google.maps) {
    const mapElement = document.getElementById('sites-map');
    if (mapElement) {
      sitesMap = new google.maps.Map(mapElement, {
        zoom: 6,
        center: { lat: 0.5, lng: 10 },
        mapTypeId: 'roadmap'
      });
    }
  }
}

function openSiteModal() {
  document.getElementById('site-id').value = '';
  document.getElementById('site-form').reset();
  document.getElementById('site-modal').classList.remove('hidden');
}

function closeSiteModal() {
  document.getElementById('site-modal').classList.add('hidden');
}

window.captureSiteGPS = function() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        document.getElementById('site-lat').value = position.coords.latitude.toFixed(6);
        document.getElementById('site-lng').value = position.coords.longitude.toFixed(6);
        showToast('📍 Position capturée avec succès !', 'success');
      },
      () => showToast('Impossible d\'accéder à votre position', 'error')
    );
  } else {
    showToast('La géolocalisation n\'est pas supportée', 'error');
  }
};

window.openSiteOnMaps = function() {
  const lat = document.getElementById('site-lat').value;
  const lng = document.getElementById('site-lng').value;
  if (lat && lng) {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
  } else {
    showToast('Veuillez d\'abord capturer une position GPS', 'error');
  }
};

async function handleSiteSave(e) {
  e.preventDefault();

  const siteData = {
    nom: document.getElementById('site-nom').value,
    type: document.getElementById('site-type').value,
    ville: document.getElementById('site-ville').value,
    adresse: document.getElementById('site-adresse').value,
    lat: parseFloat(document.getElementById('site-lat').value) || 0,
    lng: parseFloat(document.getElementById('site-lng').value) || 0,
    capacite: parseInt(document.getElementById('site-capacite').value) || 0,
    contact: document.getElementById('site-contact').value,
    description: document.getElementById('site-description').value,
    createdBy: currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, COLLECTIONS.sitesSportifs), siteData);
    showToast('✅ Site sportif enregistré !', 'success');
    closeSiteModal();
    loadSites();
  } catch (e) {
    console.error('Erreur sauvegarde site:', e);
    showToast('Erreur lors de l\'enregistrement', 'error');
  }
}

async function loadSites() {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.sitesSportifs));
    const sites = [...SITES_GABON_PREDEFINIS];
    snapshot.forEach(docSnap => {
      sites.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (sitesMap) {
      sitesMarkers.forEach(marker => marker.setMap(null));
      sitesMarkers = [];
      sites.forEach(site => {
        const marker = new google.maps.Marker({
          position: { lat: site.lat, lng: site.lng },
          map: sitesMap,
          title: site.nom,
          animation: google.maps.Animation.DROP
        });
        marker.addListener('click', () => {
          new google.maps.InfoWindow({
            content: `<strong>${site.nom}</strong><br>${site.type}<br>📞 ${site.contact || '--'}`
          }).open(sitesMap, marker);
        });
        sitesMarkers.push(marker);
      });
    }

    const container = document.getElementById('sites-list');
    if (!container) return;
    container.innerHTML = '';

    sites.forEach(site => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="site-header">
          <span class="site-type">${site.type}</span>
          <div class="site-name">${site.nom}</div>
        </div>
        <div class="site-details">
          <div class="site-detail"><strong>🏙️ Ville:</strong> ${site.ville}</div>
          <div class="site-detail"><strong>📍 GPS:</strong> ${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}</div>
          <div class="site-detail"><strong>👥 Capacité:</strong> ${site.capacite || '--'} places</div>
          <div class="site-detail"><strong>📞 Contact:</strong> ${site.contact || '--'}</div>
        </div>
        <div class="card-actions">
          <button class="card-btn" onclick="window.open('https://maps.google.com/?q=${site.lat},${site.lng}', '_blank')">🗺️ Voir Maps</button>
          ${site.id ? `<button class="card-btn danger" onclick="deleteSite('${site.id}')">🗑️ Supprimer</button>` : ''}
        </div>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error('Erreur chargement sites:', e);
  }
}

window.deleteSite = async function(id) {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce site ?')) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.sitesSportifs, id));
      showToast('✅ Site supprimé', 'success');
      loadSites();
    } catch (e) {
      console.error('Erreur suppression:', e);
      showToast('Erreur lors de la suppression', 'error');
    }
  }
};

// ─── NAVIGATION ET VUES ─────────────────────────────────────
function switchView(viewName) {
  currentView = viewName;
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const viewElement = document.getElementById(`view-${viewName}`);
  if (viewElement) {
    viewElement.classList.remove('hidden');
    if (viewName === 'mon-profil') loadUserProfile();
    else if (viewName === 'supporters') loadSupporters();
    else if (viewName === 'sites-sportifs') loadSites();
  }
}

function showDashboard() {
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  switchView('accueil');
}

function showLanding() {
  document.getElementById('landing').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

// ─── TOAST ─────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── LOGIN ──────────────────────────────────────────────────
function openLoginModal() {
  const email = prompt('Email:');
  const password = prompt('Mot de passe:');
  if (email && password) {
    signInWithEmailAndPassword(auth, email, password)
      .catch(e => showToast(`Erreur: ${e.message}`, 'error'));
  }
}

window.signUpUser = function(email, password) {
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => showToast('✅ Compte créé avec succès !', 'success'))
    .catch(e => showToast(`❌ Erreur: ${e.message}`, 'error'));
};

console.log('✅ App v4.0 chargée — Photos via Firebase Storage activé');
