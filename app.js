// ============================================================
// app.js — Gabon Sport Connect v3.0 — CORRIGÉ
// Tous les bugs corrigés + fonctions globales exposées
// ============================================================

import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, updateDoc, setDoc, getDoc,
  serverTimestamp, query, orderBy, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── État global ─────────────────────────────────────────────
let currentUser = null;
let currentRole = null;
let currentUserData = null;
let currentView = 'accueil';

const ADMIN_EMAIL = 'gabonsportconnectgsc@gmail.com';

// ─── Collections ─────────────────────────────────────────────
const COLLECTIONS = {
  users: 'users',
  federations: 'federations',
  clubs: 'clubs',
  joueurs: 'joueurs',
  arbitres: 'arbitres',
  competences: 'competences',
  actualites: 'actualites',
  matchs: 'matchs',
  notifications: 'notifications',
  supporters: 'supporters'
};

// ─── Fédérations gabonaises officielles ──────────────────────
const FEDERATIONS_GABON = [
  { nom: 'Fédération Gabonaise de Football (FEGAFOOT)', sport: 'Football', statut: 'Validée', affiliation: 'FIFA', president: '', contact: '', email: '' },
  { nom: 'Fédération Gabonaise de Basketball (FEGABASKET)', sport: 'Basketball', statut: 'Validée', affiliation: 'FIBA', president: '', contact: '', email: '' },
  { nom: 'Fédération Gabonaise de Volleyball (FEGAVOL)', sport: 'Volleyball', statut: 'Validée', affiliation: 'FIVB', president: '', contact: '', email: '' },
  { nom: 'Fédération Gabonaise d\'Athlétisme (FÉGATH)', sport: 'Athlétisme', statut: 'Validée', affiliation: 'IAAF', president: '', contact: '', email: '' },
  { nom: 'Fédération Gabonaise de Handball (FEGAHAND)', sport: 'Handball', statut: 'Validée', affiliation: 'Autre', president: '', contact: '', email: '' },
  { nom: 'Fédération Gabonaise de Natation (FEGANAT)', sport: 'Natation', statut: 'Validée', affiliation: 'Autre', president: '', contact: '', email: '' },
  { nom: 'Fédération Gabonaise de Boxe (FEGABOX)', sport: 'Boxe', statut: 'Validée', affiliation: 'Autre', president: '', contact: '', email: '' },
  { nom: 'Fédération Gabonaise de Tennis (FÉGATEN)', sport: 'Tennis', statut: 'Validée', affiliation: 'Autre', president: '', contact: '', email: '' },
  { nom: 'Fédération Gabonaise de Judo (FEGAJUDO)', sport: 'Judo', statut: 'Validée', affiliation: 'Autre', president: '', contact: '', email: '' },
  { nom: 'Fédération Gabonaise de Cyclisme (FEGACYCLO)', sport: 'Cyclisme', statut: 'Validée', affiliation: 'Autre', president: '', contact: '', email: '' },
  { nom: 'Fédération Gabonaise de Taekwondo (FEGATK)', sport: 'Taekwondo', statut: 'Validée', affiliation: 'Autre', president: '', contact: '', email: '' },
  { nom: 'Fédération Gabonaise de Rugby (FEGARUGBY)', sport: 'Rugby', statut: 'Validée', affiliation: 'Autre', president: '', contact: '', email: '' },
];

// ─── Initialiser les fédérations dans Firestore si absent ────
async function initFederationsIfEmpty() {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.federations));
    if (snap.empty) {
      console.log('🏛️ Initialisation des fédérations gabonaises...');
      for (const fed of FEDERATIONS_GABON) {
        await addDoc(collection(db, COLLECTIONS.federations), {
          ...fed,
          annee: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      console.log('✅ Fédérations initialisées');
      showToast('✅ Fédérations gabonaises chargées !');
    }
  } catch (e) {
    console.warn('Init fédérations:', e);
  }
}

// ─── Fonctions globales (inline onclick) ─────────────────────
window.editFederation = editFederation;
window.deleteFederation = deleteFederation;
window.editClub = editClub;
window.deleteClub = deleteClub;
window.editJoueur = editJoueur;
window.deleteJoueur = deleteJoueur;
window.editArbitre = editArbitre;
window.deleteArbitre = deleteArbitre;
window.editComp = editComp;
window.deleteComp = deleteComp;
window.editNews = editNews;
window.deleteNews = deleteNews;
window.editSupporter = editSupporter;
window.deleteSupporter = deleteSupporter;

// ─── Toast ───────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3600);
}

// ─── Auth state ──────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  try {
    if (user) {
      currentUser = user;
      if (user.email === ADMIN_EMAIL) {
        currentRole = 'super-admin';
        currentUserData = { role: 'super-admin', email: user.email, nom: 'Administrateur' };
        const ref = doc(db, COLLECTIONS.users, user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { role: 'super-admin', email: user.email, nom: 'Administrateur', createdAt: serverTimestamp() });
        }
        // Initialiser les fédérations gabonaises si la base est vide
        await initFederationsIfEmpty();
      } else {
        try {
          const userDoc = await getDoc(doc(db, COLLECTIONS.users, user.uid));
          if (userDoc.exists()) {
            currentUserData = userDoc.data();
            currentRole = currentUserData.role || 'joueur';
          } else {
            currentRole = 'joueur';
            currentUserData = { role: 'joueur', email: user.email, nom: user.email.split('@')[0] };
          }
        } catch (e) {
          currentRole = 'joueur';
          currentUserData = { role: 'joueur', email: user.email, nom: user.email.split('@')[0] };
        }
      }
      showDashboard(user);
    } else {
      currentUser = null;
      currentRole = null;
      currentUserData = null;
      showLanding();
    }
  } catch (e) {
    // En cas d'erreur inattendue, s'assurer que le splash disparaît quand même
    console.error('Erreur auth state:', e);
    hideSplash();
    showLanding();
  }
});

function showLanding() {
  hideSplash();
  document.getElementById('landing').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard(user) {
  hideSplash();

  document.getElementById('landing').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');

  const email = user.email || '';
  // Avatar admin = logo GSC, autres = initiales
  const avatarEl = document.getElementById('user-avatar-text');
  if (currentRole === 'super-admin') {
    avatarEl.innerHTML = '<span style="font-size:18px;font-weight:900;letter-spacing:-1px;">GSC</span>';
    avatarEl.style.background = 'linear-gradient(135deg, #009E60, #FCD116)';
    avatarEl.style.fontSize = '11px';
  } else {
    const nom = currentUserData?.nom || email.split('@')[0];
    avatarEl.textContent = nom.slice(0, 2).toUpperCase();
    avatarEl.style.background = 'linear-gradient(135deg, #3b82f6, #a855f7)';
    avatarEl.style.fontSize = '';
  }

  document.getElementById('user-name-text').textContent = currentUserData?.nom || email.split('@')[0];
  document.getElementById('user-email-text').textContent = email;
  document.getElementById('user-role-badge').textContent = getRoleLabel(currentRole);
  // Afficher téléphone si disponible
  const phoneEl = document.getElementById('user-phone-text');
  if (phoneEl && currentUserData?.telephone) {
    phoneEl.textContent = '📞 ' + currentUserData.telephone;
    phoneEl.style.display = '';
  } else if (phoneEl) {
    phoneEl.style.display = 'none';
  }

  applyRoleUI();
  loadDashboardStats();
  navigateTo('accueil');
}

// ─── Appliquer le rôle à l'interface ─────────────────────────
function applyRoleUI() {
  const role = currentRole;
  document.querySelectorAll('.nav-admin-only').forEach(el => {
    el.style.display = role === 'super-admin' ? '' : 'none';
  });
  document.querySelectorAll('.nav-fédération-only').forEach(el => {
    el.style.display = role === 'fédération' ? '' : 'none';
  });
  document.querySelectorAll('.nav-club-only').forEach(el => {
    el.style.display = role === 'club' ? '' : 'none';
  });
  document.querySelectorAll('.nav-joueur-only').forEach(el => {
    el.style.display = role === 'joueur' ? '' : 'none';
  });
  document.querySelectorAll('.nav-arbitre-only').forEach(el => {
    el.style.display = role === 'arbitre' ? '' : 'none';
  });
  document.querySelectorAll('.nav-supporter-only').forEach(el => {
    el.style.display = role === 'supporter' ? '' : 'none';
  });
}

function getRoleLabel(role) {
  const labels = {
    'super-admin': '👑 Super Admin',
    'fédération': '🏛️ Fédération',
    'club': '🏟️ Club',
    'joueur': '⚽ Joueur',
    'arbitre': '👨‍⚖️ Arbitre',
    'organisation': '📊 Organisation',
    'supporter': '🎽 Supporter'
  };
  return labels[role] || 'Utilisateur';
}

// ─── Auth handlers ───────────────────────────────────────────
document.getElementById('login-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Connexion…';
  btn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    document.getElementById('auth-modal').classList.add('hidden');
  } catch (error) {
    let msg = 'Erreur de connexion';
    if (error.code === 'auth/user-not-found') msg = 'Aucun compte avec cet email';
    else if (error.code === 'auth/wrong-password') msg = 'Mot de passe incorrect';
    else if (error.code === 'auth/invalid-email') msg = 'Email invalide';
    else if (error.code === 'auth/invalid-credential') msg = 'Email ou mot de passe incorrect';
    showToast(msg, 'error');
  } finally {
    btn.textContent = 'Se connecter';
    btn.disabled = false;
  }
});

document.getElementById('register-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const nom = document.getElementById('reg-nom').value.trim();
  const telephone = document.getElementById('reg-telephone').value.trim();
  const role = document.getElementById('reg-role').value;

  if (!role) { showToast('Veuillez sélectionner un rôle', 'error'); return; }
  if (!telephone) { showToast('Le numéro de téléphone est requis', 'error'); return; }
  if (password.length < 6) { showToast('Le mot de passe doit faire au moins 6 caractères', 'error'); return; }

  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Inscription…';
  btn.disabled = true;
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, COLLECTIONS.users, userCred.user.uid), {
      role, email, nom, telephone, createdAt: serverTimestamp()
    });
    showToast('✅ Inscription réussie ! Bienvenue ' + nom);
    document.getElementById('auth-modal').classList.add('hidden');
  } catch (error) {
    let msg = 'Erreur inscription';
    if (error.code === 'auth/email-already-in-use') msg = 'Cet email est déjà utilisé';
    else if (error.code === 'auth/weak-password') msg = 'Mot de passe trop faible';
    showToast(msg, 'error');
  } finally {
    btn.textContent = "S'inscrire";
    btn.disabled = false;
  }
});

// ─── Logout ──────────────────────────────────────────────────
document.getElementById('btn-logout')?.addEventListener('click', async () => {
  await signOut(auth);
  showLanding();
});

// ─── Auth modal ──────────────────────────────────────────────
document.getElementById('btn-open-login')?.addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('auth-modal').classList.remove('hidden');
});

document.getElementById('btn-hero-start')?.addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('auth-modal').classList.remove('hidden');
});

document.getElementById('modal-close')?.addEventListener('click', () => {
  document.getElementById('auth-modal').classList.add('hidden');
});

// Auth tabs
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    tab.classList.add('active');
    if (tabName === 'login') {
      document.getElementById('login-form').classList.remove('hidden');
    } else {
      document.getElementById('register-form').classList.remove('hidden');
    }
  });
});

// ─── Navigation ──────────────────────────────────────────────
function navigateTo(view) {
  if (!currentUser) return;
  currentView = view;

  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.remove('hidden');

  // Mettre à jour nav actif
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });

  const titles = {
    'accueil': 'Tableau de bord',
    'fédérations': 'Gestion des fédérations',
    'clubs': 'Gestion des clubs',
    'joueurs': 'Gestion des joueurs',
    'arbitres': 'Gestion des arbitres',
    'compétitions': 'Gestion des compétitions',
    'féminin': 'Football féminin',
    'amateur': 'Football amateur',
    'supporters': 'Supporters',
    'supporter-profil': 'Mon profil supporter',
    'actualités': 'Actualités sportives',
    'rapports': 'Rapports imprimables'
  };
  document.getElementById('content-title').textContent = titles[view] || 'Tableau de bord';

  if (view === 'accueil') loadDashboardStats();
  else if (view === 'fédérations') loadFederations();
  else if (view === 'clubs') loadClubs();
  else if (view === 'joueurs') loadJoueurs(null, 'list-joueurs');
  else if (view === 'féminin') loadJoueurs('Féminin', 'list-féminin');
  else if (view === 'amateur') loadJoueurs('Amateur', 'list-amateur');
  else if (view === 'supporters') loadSupporters();
  else if (view === 'supporter-profil') loadSupporterProfil();
  else if (view === 'arbitres') loadArbitres();
  else if (view === 'compétitions') loadCompetences();
  else if (view === 'actualités') loadActualites();

  // Fermer sidebar mobile
  document.getElementById('sidebar')?.classList.remove('open');
}

// Navigation via boutons sidebar
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if (item.dataset.view) navigateTo(item.dataset.view);
  });
});

// Dashboard stats cards cliquables
document.querySelectorAll('.stat-card[data-nav]').forEach(card => {
  card.addEventListener('click', () => {
    navigateTo(card.dataset.nav);
  });
  card.style.cursor = 'pointer';
});

// ─── Menu mobile ─────────────────────────────────────────────
document.getElementById('btn-menu-toggle')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.toggle('open');
});

// ─── Cache mémoire léger (TTL 60 s) ──────────────────────────
const _cache = {};
function cacheGet(key) {
  const entry = _cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > 60_000) { delete _cache[key]; return null; }
  return entry.data;
}
function cacheSet(key, data) { _cache[key] = { data, ts: Date.now() }; }
function cacheClear(key) { if (key) delete _cache[key]; else Object.keys(_cache).forEach(k => delete _cache[k]); }

// ─── Dashboard Stats ─────────────────────────────────────────
async function loadDashboardStats() {
  try {
    // Utiliser le cache si disponible (TTL 60 s)
    let stats = cacheGet('dashStats');
    if (!stats) {
      const [fedSnap, clubSnap, jouSnap, arbSnap] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.federations)),
        getDocs(collection(db, COLLECTIONS.clubs)),
        getDocs(collection(db, COLLECTIONS.joueurs)),
        getDocs(collection(db, COLLECTIONS.arbitres))
      ]);
      stats = { fed: fedSnap.size, club: clubSnap.size, jou: jouSnap.size, arb: arbSnap.size };
      cacheSet('dashStats', stats);
    }

    const fedEl = document.getElementById('stat-fédérations');
    const clubEl = document.getElementById('stat-clubs');
    const jouEl = document.getElementById('stat-joueurs');
    const arbEl = document.getElementById('stat-arbitres');

    if (fedEl) fedEl.textContent = stats.fed;
    if (clubEl) clubEl.textContent = stats.club;
    if (jouEl) jouEl.textContent = stats.jou;
    if (arbEl) arbEl.textContent = stats.arb;
  } catch (e) {
    console.error('Erreur stats', e);
  }
}

// ═════════════════════════════════════════════════════════════
// GESTION DES FÉDÉRATIONS
// ═════════════════════════════════════════════════════════════

document.getElementById('btn-add-federation')?.addEventListener('click', () => {
  document.getElementById('federation-id').value = '';
  document.getElementById('federation-form').reset();
  document.querySelector('#federation-modal .form-modal-title').textContent = 'Nouvelle fédération';
  document.getElementById('federation-modal').classList.remove('hidden');
});

document.getElementById('federation-modal-close')?.addEventListener('click', () => {
  document.getElementById('federation-modal').classList.add('hidden');
});
document.getElementById('federation-modal-cancel')?.addEventListener('click', () => {
  document.getElementById('federation-modal').classList.add('hidden');
});

document.getElementById('federation-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (currentRole !== 'super-admin') { showToast('Accès refusé', 'error'); return; }
  const docId = document.getElementById('federation-id').value;
  const data = {
    nom: document.getElementById('fed-nom').value,
    sport: document.getElementById('fed-sport').value,
    statut: document.getElementById('fed-statut').value,
    president: document.getElementById('fed-president')?.value || '',
    contact: document.getElementById('fed-contact')?.value || '',
    email: document.getElementById('fed-email')?.value || '',
    affiliation: document.getElementById('fed-affiliation')?.value || '',
    annee: document.getElementById('fed-annee')?.value || '',
    updatedAt: serverTimestamp()
  };
  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.federations, docId), data);
      showToast('✅ Fédération mise à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.federations), { ...data, createdAt: serverTimestamp() });
      showToast('✅ Fédération créée');
    }
    cacheClear('dashStats');
    document.getElementById('federation-modal').classList.add('hidden');
    loadFederations();
  } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
});

async function loadFederations() {
  const container = document.getElementById('list-fédérations');
  if (!container) return;
  container.innerHTML = '<div class="loading-state">⏳ Chargement…</div>';
  try {
    const qry = query(collection(db, COLLECTIONS.federations), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(qry);
    if (snapshot.empty) {
      // Afficher les fédérations gabonaises connues localement
      container.innerHTML = FEDERATIONS_GABON.map((fed, i) => `
        <div class="data-card">
          <div class="card-header">
            <h3>🏛️ ${fed.nom}</h3>
            <span class="badge badge-success">${fed.statut}</span>
          </div>
          <div class="card-content">
            <p><strong>Sport:</strong> ${fed.sport} · <strong>Affiliation:</strong> ${fed.affiliation}</p>
          </div>
          <div class="card-actions">
            ${currentRole === 'super-admin' ? `<small style="color:#9ca3af;">Cliquez "Nouvelle fédération" pour enrichir les données</small>` : ''}
          </div>
        </div>`).join('');
      return;
    }
    container.innerHTML = snapshot.docs.map(d => {
      const data = d.data();
      return `
        <div class="data-card">
          <div class="card-header">
            <h3>🏛️ ${data.nom}</h3>
            <span class="badge ${data.statut === 'Validée' ? 'badge-success' : data.statut === 'Suspendue' ? 'badge-danger' : 'badge-warning'}">${data.statut}</span>
          </div>
          <div class="card-content">
            <p><strong>Sport(s):</strong> ${data.sport}</p>
            ${data.ville ? `<p><strong>Ville:</strong> ${data.ville}</p>` : ''}
            ${data.presNom ? `<p><strong>Président:</strong> ${data.presPrenom} ${data.presNom}</p>` : ''}
            ${data.tel ? `<p><strong>Tél:</strong> ${data.tel}</p>` : ''}
          </div>
          <div class="card-actions">
            ${currentRole === 'super-admin' ? `
              <button class="btn-small" onclick="editFederation('${d.id}')">✏️ Éditer</button>
              <button class="btn-small btn-danger" onclick="deleteFederation('${d.id}')">🗑️ Supprimer</button>
            ` : ''}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state error-state">❌ Erreur chargement<br><small>${err.message}</small></div>`;
  }
}

async function editFederation(id) {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.federations, id));
    const data = snap.data();
    document.getElementById('federation-id').value = id;
    document.getElementById('fed-nom').value = data.nom || '';
    document.getElementById('fed-sport').value = data.sport || '';
    document.getElementById('fed-statut').value = data.statut || 'En attente';
    const presEl = document.getElementById('fed-president');
    if (presEl) presEl.value = data.president || '';
    const contactEl = document.getElementById('fed-contact');
    if (contactEl) contactEl.value = data.contact || '';
    const emailEl = document.getElementById('fed-email');
    if (emailEl) emailEl.value = data.email || '';
    const affEl = document.getElementById('fed-affiliation');
    if (affEl) affEl.value = data.affiliation || '';
    const anneeEl = document.getElementById('fed-annee');
    if (anneeEl) anneeEl.value = data.annee || '';
    document.querySelector('#federation-modal .form-modal-title').textContent = 'Modifier fédération';
    document.getElementById('federation-modal').classList.remove('hidden');
  } catch (e) { showToast('Erreur chargement', 'error'); }
}

async function deleteFederation(id) {
  if (!confirm('Supprimer cette fédération ?')) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.federations, id));
    cacheClear('dashStats');
    showToast('✅ Fédération supprimée');
    loadFederations();
  } catch (e) { showToast('Erreur suppression', 'error'); }
}

// ═════════════════════════════════════════════════════════════
// GESTION DES CLUBS
// ═════════════════════════════════════════════════════════════

async function populateFedSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Sélectionner une fédération --</option>';
  try {
    const fedSnapshot = await getDocs(collection(db, COLLECTIONS.federations));
    if (!fedSnapshot.empty) {
      fedSnapshot.docs.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.data().nom;
        sel.appendChild(opt);
      });
    } else {
      // Fallback : afficher les fédérations connues localement
      FEDERATIONS_GABON.forEach((fed, i) => {
        const opt = document.createElement('option');
        opt.value = 'local_' + i;
        opt.textContent = fed.nom;
        sel.appendChild(opt);
      });
    }
  } catch (e) {
    console.warn('Erreur chargement fédérations pour select:', e);
    // Fallback même en cas d'erreur
    FEDERATIONS_GABON.forEach((fed, i) => {
      const opt = document.createElement('option');
      opt.value = 'local_' + i;
      opt.textContent = fed.nom;
      sel.appendChild(opt);
    });
  }
}

document.getElementById('btn-add-club')?.addEventListener('click', async () => {
  await populateFedSelect('club-fédération');
  document.getElementById('club-id').value = '';
  document.getElementById('club-form').reset();
  document.querySelector('#club-modal .form-modal-title').textContent = 'Nouveau club';
  document.getElementById('club-modal').classList.remove('hidden');
});

document.getElementById('club-modal-close')?.addEventListener('click', () => document.getElementById('club-modal').classList.add('hidden'));
document.getElementById('club-modal-cancel')?.addEventListener('click', () => document.getElementById('club-modal').classList.add('hidden'));

document.getElementById('club-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const docId = document.getElementById('club-id').value;
  const data = {
    nom: document.getElementById('club-nom').value,
    ville: document.getElementById('club-ville').value || '',
    province: document.getElementById('club-province').value || '',
    sport: document.getElementById('club-sport').value,
    division: document.getElementById('club-division')?.value || 'D1',
    statut: document.getElementById('club-statut')?.value || 'Actif',
    stadeNom: document.getElementById('club-stade-nom')?.value || '',
    gpsLat: document.getElementById('club-gps-lat')?.value || '',
    gpsLng: document.getElementById('club-gps-lng')?.value || '',
    fédération: document.getElementById('club-fédération')?.value || '',
    updatedAt: serverTimestamp()
  };
  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.clubs, docId), data);
      showToast('✅ Club mis à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.clubs), { ...data, createdAt: serverTimestamp() });
      showToast('✅ Club créé');
    }
    cacheClear('dashStats');
    document.getElementById('club-modal').classList.add('hidden');
    loadClubs();
  } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
});

async function loadClubs() {
  const container = document.getElementById('list-clubs');
  if (!container) return;
  container.innerHTML = '<div class="loading-state">⏳ Chargement…</div>';
  try {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.clubs), orderBy('createdAt', 'desc')));
    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">🏟️ Aucun club enregistré</div>';
      return;
    }
    container.innerHTML = snapshot.docs.map(d => {
      const data = d.data();
      return `
        <div class="data-card">
          <div class="card-header">
            <h3>🏟️ ${data.nom}</h3>
            <span class="badge">${data.division}</span>
          </div>
          <div class="card-content">
            <p><strong>Sport:</strong> ${data.sport} ${data.division ? '· <strong>Division:</strong> '+data.division : ''}</p>
            <p><strong>Ville:</strong> ${data.ville || '—'} ${data.province ? '· ' + data.province : ''}</p>
            ${data.stadeNom ? `<p><strong>Stade:</strong> ${data.stadeNom}</p>` : ''}
            ${data.gpsLat && data.gpsLng ? `<p><a href="https://maps.google.com/?q=${data.gpsLat},${data.gpsLng}" target="_blank" style="color:var(--green);font-size:12px;font-weight:600;">📍 Voir sur Maps</a> &nbsp; <a href="https://wa.me/?text=${encodeURIComponent('📍 '+data.nom+'\nhttps://maps.google.com/?q='+data.gpsLat+','+data.gpsLng)}" target="_blank" style="color:#25D366;font-size:12px;font-weight:600;">📲 WhatsApp</a></p>` : '<p style="color:#9ca3af;font-size:12px;">📍 Non géolocalisé</p>'}
          </div>
          <div class="card-actions">
            <button class="btn-small" onclick="editClub('${d.id}')">✏️ Éditer</button>
            ${currentRole === 'super-admin' ? `<button class="btn-small btn-danger" onclick="deleteClub('${d.id}')">🗑️ Supprimer</button>` : ''}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state error-state">❌ ${err.message}</div>`;
  }
}

async function editClub(id) {
  try {
    await populateFedSelect('club-fédération');
    const snap = await getDoc(doc(db, COLLECTIONS.clubs, id));
    const data = snap.data();
    document.getElementById('club-id').value = id;
    document.getElementById('club-nom').value = data.nom || '';
    document.getElementById('club-ville').value = data.ville || '';
    document.getElementById('club-province').value = data.province || '';
    document.getElementById('club-sport').value = data.sport || 'Football';
    const divEl = document.getElementById('club-division');
    if (divEl) divEl.value = data.division || 'D1';
    const statEl = document.getElementById('club-statut');
    if (statEl) statEl.value = data.statut || 'Actif';
    document.querySelector('#club-modal .form-modal-title').textContent = 'Modifier club';
    document.getElementById('club-modal').classList.remove('hidden');
  } catch (e) { showToast('Erreur chargement', 'error'); }
}

async function deleteClub(id) {
  if (!confirm('Supprimer ce club ?')) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.clubs, id));
    cacheClear('dashStats');
    showToast('✅ Club supprimé');
    loadClubs();
  } catch (e) { showToast('Erreur suppression', 'error'); }
}

// ═════════════════════════════════════════════════════════════
// GESTION DES JOUEURS
// ═════════════════════════════════════════════════════════════

async function populateClubSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Sélectionner un club --</option>';
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.clubs));
    snap.docs.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.data().nom;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.warn('Erreur chargement clubs pour select:', e);
  }
}

document.getElementById('btn-add-joueur')?.addEventListener('click', async () => {
  await populateClubSelect('joueur-club');
  document.getElementById('joueur-id').value = '';
  document.getElementById('joueur-form').reset();
  // genre par défaut masculin
  const genreEl = document.getElementById('joueur-genre');
  if (genreEl) genreEl.value = 'Masculin';
  document.querySelector('#joueur-modal .form-modal-title').textContent = 'Nouveau joueur';
  document.getElementById('joueur-modal').classList.remove('hidden');
});

document.getElementById('btn-add-joueur-f')?.addEventListener('click', async () => {
  await populateClubSelect('joueur-club');
  document.getElementById('joueur-id').value = '';
  document.getElementById('joueur-form').reset();
  const genreEl = document.getElementById('joueur-genre');
  if (genreEl) genreEl.value = 'Féminin';
  document.querySelector('#joueur-modal .form-modal-title').textContent = 'Nouvelle joueuse';
  const modal = document.getElementById('joueur-modal');
  modal.classList.remove('hidden');
  // Remonter en haut du modal
  const modalBody = modal.querySelector('.form-modal');
  if (modalBody) modalBody.scrollTop = 0;
});

document.getElementById('btn-add-joueur-a')?.addEventListener('click', async () => {
  await populateClubSelect('joueur-club');
  document.getElementById('joueur-id').value = '';
  document.getElementById('joueur-form').reset();
  document.querySelector('#joueur-modal .form-modal-title').textContent = 'Nouveau joueur amateur';
  document.getElementById('joueur-modal').classList.remove('hidden');
});

document.getElementById('joueur-modal-close')?.addEventListener('click', () => document.getElementById('joueur-modal').classList.add('hidden'));
document.getElementById('joueur-modal-cancel')?.addEventListener('click', () => document.getElementById('joueur-modal').classList.add('hidden'));

document.getElementById('joueur-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const docId = document.getElementById('joueur-id').value;
  const photoInput = document.getElementById('joueur-photo-input');
  const data = {
    nom: document.getElementById('joueur-nom').value,
    prenom: document.getElementById('joueur-prenom').value,
    dateNaissance: document.getElementById('joueur-date-naissance').value,
    nationalité: (document.getElementById('joueur-nationalite') || document.getElementById('joueur-nationalité'))?.value || 'Gabonaise',
    position: document.getElementById('joueur-position').value,
    club: document.getElementById('joueur-club').value,
    statut: document.getElementById('joueur-statut').value,
    genre: document.getElementById('joueur-genre')?.value || 'Masculin',
    telephone: document.getElementById('joueur-telephone')?.value.trim() || '',
    updatedAt: serverTimestamp()
  };
  if (photoInput?._base64) data.photo = photoInput._base64;
  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.joueurs, docId), data);
      showToast('✅ Joueur mis à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.joueurs), { ...data, userId: currentUser?.uid || '', createdAt: serverTimestamp() });
      showToast('✅ Joueur enregistré');
    }
    cacheClear('dashStats');
    document.getElementById('joueur-modal').classList.add('hidden');
    // Recharger la vue actuelle
    if (currentView === 'joueurs') loadJoueurs(null, 'list-joueurs');
    else if (currentView === 'féminin') loadJoueurs('Féminin', 'list-féminin');
    else if (currentView === 'amateur') loadJoueurs('Amateur', 'list-amateur');
  } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
});

async function loadJoueurs(filter = null, containerId = 'list-joueurs') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="loading-state">⏳ Chargement…</div>';
  try {
    let qry;
    // On évite where+orderBy ensemble (nécessite index composite Firestore)
    // On filtre côté client après récupération
    if (filter === 'Féminin' || filter === 'Amateur') {
      qry = query(collection(db, COLLECTIONS.joueurs), where('genre', '==', filter));
    } else {
      qry = query(collection(db, COLLECTIONS.joueurs), orderBy('createdAt', 'desc'));
    }
    const snapshot = await getDocs(qry);
    if (snapshot.empty) {
      container.innerHTML = `<div class="empty-state">⚽ Aucun joueur enregistré</div>`;
      return;
    }
    container.innerHTML = snapshot.docs.map(d => {
      const data = d.data();
      const age = calcAge(data.dateNaissance);
      const statusClass = data.statut === 'Actif' ? 'badge-success' : data.statut === 'Blessé' ? 'badge-danger' : 'badge-warning';
      const isOwner = currentUser?.uid === data.userId || currentRole === 'super-admin';
      const avatarHtml = data.photo
        ? `<img src="${data.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" />`
        : `<span style="font-size:20px;">${data.genre === 'Féminin' ? '👩' : '👨'}</span>`;
      return `
        <div class="data-card">
          <div class="card-header-with-avatar">
            <div class="card-avatar">${avatarHtml}</div>
            <div>
              <h3 style="font-size:15px;font-weight:700;">⚽ ${data.prenom} ${data.nom}</h3>
              <p style="font-size:12px;color:var(--text-3);">${data.genre || '—'} · ${age ? age + ' ans' : '—'} · ${data.position || '—'}</p>
            </div>
            <span class="badge ${statusClass}" style="margin-left:auto;">${data.statut}</span>
          </div>
          <div class="card-content">
            <p><strong>Nationalité :</strong> ${data.nationalité || data.nationalite || '—'}</p>
            <p><strong>Naissance :</strong> ${data.dateNaissance || '—'} ${age ? `(${age} ans)` : ''}</p>
            ${data.telephone ? `<p><strong>📞 Tél :</strong> <a href="tel:${data.telephone}" style="color:var(--green);font-weight:600;">${data.telephone}</a></p>` : ''}
          </div>
          <div class="card-actions">
            ${isOwner ? `<button class="btn-small" onclick="editJoueur('${d.id}')">✏️ Éditer</button>` : ''}
            ${currentRole === 'super-admin' ? `<button class="btn-small btn-danger" onclick="deleteJoueur('${d.id}')">🗑️ Supprimer</button>` : ''}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state error-state">❌ ${err.message}</div>`;
  }
}

async function editJoueur(id) {
  try {
    await populateClubSelect('joueur-club');
    const snap = await getDoc(doc(db, COLLECTIONS.joueurs, id));
    const data = snap.data();
    document.getElementById('joueur-id').value = id;
    document.getElementById('joueur-nom').value = data.nom || '';
    document.getElementById('joueur-prenom').value = data.prenom || '';
    document.getElementById('joueur-date-naissance').value = data.dateNaissance || '';
    const natEl = document.getElementById('joueur-nationalite') || document.getElementById('joueur-nationalité');
    if (natEl) natEl.value = data.nationalité || data.nationalite || '';
    document.getElementById('joueur-position').value = data.position || 'Attaquant';
    document.getElementById('joueur-statut').value = data.statut || 'Actif';
    if (document.getElementById('joueur-genre')) document.getElementById('joueur-genre').value = data.genre || 'Masculin';
    const telEl = document.getElementById('joueur-telephone');
    if (telEl) telEl.value = data.telephone || '';
    // Restore photo preview
    if (data.photo) {
      const prev = document.getElementById('joueur-photo-preview');
      if (prev) {
        let img = prev.querySelector('img');
        if (!img) { img = document.createElement('img'); prev.appendChild(img); }
        img.src = data.photo;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
        const sp = document.getElementById('joueur-photo-placeholder'); if(sp) sp.style.display='none';
      }
    }
    document.querySelector('#joueur-modal .form-modal-title').textContent = 'Modifier joueur';
    document.getElementById('joueur-modal').classList.remove('hidden');
  } catch (e) { showToast('Erreur chargement', 'error'); }
}

async function deleteJoueur(id) {
  if (!confirm('Supprimer ce joueur ?')) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.joueurs, id));
    cacheClear('dashStats');
    showToast('✅ Joueur supprimé');
    if (currentView === 'joueurs') loadJoueurs(null, 'list-joueurs');
    else if (currentView === 'féminin') loadJoueurs('Féminin', 'list-féminin');
    else loadJoueurs('Amateur', 'list-amateur');
  } catch (e) { showToast('Erreur suppression', 'error'); }
}

// ═════════════════════════════════════════════════════════════
// GESTION DES ARBITRES
// ═════════════════════════════════════════════════════════════

document.getElementById('btn-add-arbitre')?.addEventListener('click', async () => {
  await populateFedSelect('arbitre-fédération');
  document.getElementById('arbitre-id').value = '';
  document.getElementById('arbitre-form').reset();
  document.querySelector('#arbitre-modal .form-modal-title').textContent = 'Nouvel arbitre';
  document.getElementById('arbitre-modal').classList.remove('hidden');
});

document.getElementById('arbitre-modal-close')?.addEventListener('click', () => document.getElementById('arbitre-modal').classList.add('hidden'));
document.getElementById('arbitre-modal-cancel')?.addEventListener('click', () => document.getElementById('arbitre-modal').classList.add('hidden'));

document.getElementById('arbitre-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const docId = document.getElementById('arbitre-id').value;
  const photoInput = document.getElementById('arbitre-photo-input');
  const data = {
    nom: document.getElementById('arbitre-nom').value,
    prenom: document.getElementById('arbitre-prenom').value,
    grade: document.getElementById('arbitre-grade').value,
    niveau: document.getElementById('arbitre-niveau').value,
    statut: document.getElementById('arbitre-statut').value,
    dateNaissance: document.getElementById('arbitre-date-naissance').value || '',
    nationalité: document.getElementById('arbitre-nationalité')?.value || 'Gabonaise',
    genre: document.getElementById('arbitre-genre')?.value || 'Masculin',
    fédération: document.getElementById('arbitre-fédération')?.value || '',
    telephone: document.getElementById('arbitre-telephone')?.value.trim() || '',
    updatedAt: serverTimestamp()
  };
  if (photoInput?._base64) data.photo = photoInput._base64;
  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.arbitres, docId), data);
      showToast('✅ Arbitre mis à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.arbitres), { ...data, createdAt: serverTimestamp() });
      showToast('✅ Arbitre enregistré');
    }
    cacheClear('dashStats');
    document.getElementById('arbitre-modal').classList.add('hidden');
    loadArbitres();
  } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
});

async function loadArbitres() {
  const container = document.getElementById('list-arbitres');
  if (!container) return;
  container.innerHTML = '<div class="loading-state">⏳ Chargement…</div>';
  try {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.arbitres), orderBy('createdAt', 'desc')));
    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">👨‍⚖️ Aucun arbitre enregistré</div>';
      return;
    }
    container.innerHTML = snapshot.docs.map(d => {
      const data = d.data();
      const age = calcAge(data.dateNaissance);
      const statusClass = data.statut === 'Actif' ? '' : data.statut === 'Suspendu' ? 'badge-red' : 'badge-yellow';
      const avatarHtml = data.photo
        ? `<img src="${data.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" />`
        : `<span style="font-size:20px;">${data.genre === 'Féminin' ? '👩‍⚖️' : '👨‍⚖️'}</span>`;
      return `
        <div class="data-card">
          <div class="card-header-with-avatar">
            <div class="card-avatar">${avatarHtml}</div>
            <div>
              <h3 style="font-size:15px;font-weight:700;">${data.prenom} ${data.nom}</h3>
              <p style="font-size:12px;color:var(--text-3);">${data.genre || '—'} · ${age ? age + ' ans' : '—'}</p>
            </div>
            <span class="badge" style="margin-left:auto;">${data.grade}</span>
          </div>
          <div class="card-content">
            <p><strong>Niveau :</strong> ${data.niveau}</p>
            <p><strong>Statut :</strong> <span class="badge ${statusClass}">${data.statut}</span></p>
            ${data.dateNaissance ? `<p><strong>Naissance :</strong> ${data.dateNaissance}${age ? ` (${age} ans)` : ''}</p>` : ''}
            ${data.telephone ? `<p><strong>📞 Tél :</strong> <a href="tel:${data.telephone}" style="color:var(--green);font-weight:600;">${data.telephone}</a></p>` : ''}
          </div>
          <div class="card-actions">
            <button class="btn-small" onclick="editArbitre('${d.id}')">✏️ Éditer</button>
            <button class="btn-small btn-danger" onclick="deleteArbitre('${d.id}')">🗑️ Supprimer</button>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state error-state">❌ ${err.message}</div>`;
  }
}

async function editArbitre(id) {
  try {
    await populateFedSelect('arbitre-fédération');
    const snap = await getDoc(doc(db, COLLECTIONS.arbitres, id));
    const data = snap.data();
    document.getElementById('arbitre-id').value = id;
    document.getElementById('arbitre-nom').value = data.nom || '';
    document.getElementById('arbitre-prenom').value = data.prenom || '';
    document.getElementById('arbitre-grade').value = data.grade || 'National';
    document.getElementById('arbitre-niveau').value = data.niveau || 'Amateur';
    document.getElementById('arbitre-statut').value = data.statut || 'Actif';
    document.getElementById('arbitre-date-naissance').value = data.dateNaissance || '';
    const genreEl = document.getElementById('arbitre-genre');
    if (genreEl) genreEl.value = data.genre || 'Masculin';
    const natEl = document.getElementById('arbitre-nationalité');
    if (natEl) natEl.value = data.nationalité || 'Gabonaise';
    const fedEl = document.getElementById('arbitre-fédération');
    if (fedEl && data.fédération) fedEl.value = data.fédération;
    const arbTelEl = document.getElementById('arbitre-telephone');
    if (arbTelEl) arbTelEl.value = data.telephone || '';
    // Photo
    if (data.photo) {
      const prev = document.getElementById('arbitre-photo-preview');
      if (prev) {
        let img = prev.querySelector('img');
        if (!img) { img = document.createElement('img'); prev.appendChild(img); }
        img.src = data.photo;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
        const sp = document.getElementById('arbitre-photo-placeholder'); if(sp) sp.style.display='none';
      }
    }
    document.querySelector('#arbitre-modal .form-modal-title').textContent = 'Modifier arbitre';
    document.getElementById('arbitre-modal').classList.remove('hidden');
  } catch (e) { showToast('Erreur chargement', 'error'); }
}

async function deleteArbitre(id) {
  if (!confirm('Supprimer cet arbitre ?')) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.arbitres, id));
    cacheClear('dashStats');
    showToast('✅ Arbitre supprimé');
    loadArbitres();
  } catch (e) { showToast('Erreur suppression', 'error'); }
}

// ═════════════════════════════════════════════════════════════
// GESTION DES COMPÉTITIONS
// ═════════════════════════════════════════════════════════════

document.getElementById('btn-add-comp')?.addEventListener('click', async () => {
  await populateFedSelect('comp-fédération');
  const arbSnap = await getDocs(collection(db, COLLECTIONS.arbitres));
  const arbSelect = document.getElementById('comp-arbitre-assigné');
  if (arbSelect) {
    arbSelect.innerHTML = '<option value="">-- Aucun assigné --</option>';
    arbSnap.docs.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.data().prenom} ${d.data().nom}`;
      arbSelect.appendChild(opt);
    });
  }
  document.getElementById('comp-id').value = '';
  document.getElementById('comp-form').reset();
  document.querySelector('#comp-modal .form-modal-title').textContent = 'Nouvelle compétition';
  document.getElementById('comp-modal').classList.remove('hidden');
});

document.getElementById('comp-modal-close')?.addEventListener('click', () => document.getElementById('comp-modal').classList.add('hidden'));
document.getElementById('comp-modal-cancel')?.addEventListener('click', () => document.getElementById('comp-modal').classList.add('hidden'));

document.getElementById('comp-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const docId = document.getElementById('comp-id').value;
  const data = {
    nom: document.getElementById('comp-nom').value,
    sport: document.getElementById('comp-sport').value,
    saison: document.getElementById('comp-saison').value || '',
    dateDebut: document.getElementById('comp-date-debut').value || '',
    dateFin: document.getElementById('comp-date-fin').value || '',
    statut: document.getElementById('comp-statut').value,
    fédération: document.getElementById('comp-fédération')?.value || '',
    arbitreAssigné: document.getElementById('comp-arbitre-assigné')?.value || '',
    updatedAt: serverTimestamp()
  };
  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.competences, docId), data);
      showToast('✅ Compétition mise à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.competences), { ...data, createdAt: serverTimestamp() });
      showToast('✅ Compétition créée');
    }
    document.getElementById('comp-modal').classList.add('hidden');
    loadCompetences();
  } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
});

async function loadCompetences() {
  const container = document.getElementById('list-compétitions');
  if (!container) return;
  container.innerHTML = '<div class="loading-state">⏳ Chargement…</div>';
  try {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.competences), orderBy('createdAt', 'desc')));
    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">🏆 Aucune compétition enregistrée</div>';
      return;
    }
    container.innerHTML = snapshot.docs.map(d => {
      const data = d.data();
      const statusClass = data.statut === 'En cours' ? 'badge-success' : data.statut === 'Terminée' ? 'badge-warning' : '';
      return `
        <div class="data-card">
          <div class="card-header">
            <h3>🏆 ${data.nom}</h3>
            <span class="badge ${statusClass}">${data.statut}</span>
          </div>
          <div class="card-content">
            <p><strong>Sport:</strong> ${data.sport} ${data.saison ? '· Saison: ' + data.saison : ''}</p>
            ${data.dateDebut ? `<p><strong>Dates:</strong> ${data.dateDebut} → ${data.dateFin || '?'}</p>` : ''}
          </div>
          <div class="card-actions">
            <button class="btn-small" style="background:var(--blue);color:white;" onclick="openCalendrierComp('${d.id}','${data.nom.replace(/'/g,"\\'")}')">📅 Calendrier</button>
            <button class="btn-small" onclick="editComp('${d.id}')">✏️ Éditer</button>
            ${currentRole === 'super-admin' ? `<button class="btn-small btn-danger" onclick="deleteComp('${d.id}')">🗑️ Supprimer</button>` : ''}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state error-state">❌ ${err.message}</div>`;
  }
}

async function editComp(id) {
  try {
    await populateFedSelect('comp-fédération');
    const snap = await getDoc(doc(db, COLLECTIONS.competences, id));
    const data = snap.data();
    document.getElementById('comp-id').value = id;
    document.getElementById('comp-nom').value = data.nom || '';
    document.getElementById('comp-sport').value = data.sport || 'Football';
    document.getElementById('comp-saison').value = data.saison || '';
    document.getElementById('comp-date-debut').value = data.dateDebut || '';
    document.getElementById('comp-date-fin').value = data.dateFin || '';
    document.getElementById('comp-statut').value = data.statut || 'À venir';
    // Charger arbitres puis sélectionner le bon
    const arbSnap = await getDocs(collection(db, COLLECTIONS.arbitres));
    const arbSelect = document.getElementById('comp-arbitre-assigné');
    if (arbSelect) {
      arbSelect.innerHTML = '<option value="">-- Aucun assigné --</option>';
      arbSnap.docs.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.data().prenom} ${d.data().nom}`;
        arbSelect.appendChild(opt);
      });
      if (data.arbitreAssigné) arbSelect.value = data.arbitreAssigné;
    }
    const fedEl = document.getElementById('comp-fédération');
    if (fedEl && data.fédération) fedEl.value = data.fédération;
    document.querySelector('#comp-modal .form-modal-title').textContent = 'Modifier compétition';
    document.getElementById('comp-modal').classList.remove('hidden');
  } catch (e) { showToast('Erreur chargement', 'error'); }
}

async function deleteComp(id) {
  if (!confirm('Supprimer cette compétition ?')) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.competences, id));
    showToast('✅ Compétition supprimée');
    loadCompetences();
  } catch (e) { showToast('Erreur suppression', 'error'); }
}

// ═════════════════════════════════════════════════════════════
// GESTION DES ACTUALITÉS
// ═════════════════════════════════════════════════════════════

document.getElementById('btn-add-news')?.addEventListener('click', () => {
  document.getElementById('news-id').value = '';
  document.getElementById('news-form').reset();
  document.getElementById('news-modal').classList.remove('hidden');
});
document.getElementById('news-modal-close')?.addEventListener('click', () => document.getElementById('news-modal').classList.add('hidden'));
document.getElementById('news-modal-cancel')?.addEventListener('click', () => document.getElementById('news-modal').classList.add('hidden'));

document.getElementById('news-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const docId = document.getElementById('news-id').value;
  const data = {
    titre: document.getElementById('news-titre').value,
    categorie: document.getElementById('news-categorie').value,
    contenu: document.getElementById('news-contenu').value,
    auteur: currentUserData?.nom || currentUser?.email || 'Anonyme',
    updatedAt: serverTimestamp()
  };
  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.actualites, docId), data);
      showToast('✅ Article mis à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.actualites), { ...data, createdAt: serverTimestamp() });
      showToast('✅ Article publié');
    }
    document.getElementById('news-modal').classList.add('hidden');
    loadActualites();
  } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
});

async function loadActualites() {
  const container = document.getElementById('list-actualités');
  if (!container) return;
  container.innerHTML = '<div class="loading-state">⏳ Chargement…</div>';
  try {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.actualites), orderBy('createdAt', 'desc')));
    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">📰 Aucune actualité publiée</div>';
      return;
    }
    container.innerHTML = snapshot.docs.map(d => {
      const data = d.data();
      const canEdit = currentRole === 'super-admin' || data.auteur === (currentUserData?.nom || currentUser?.email);
      return `
        <div class="data-card">
          <div class="card-header">
            <h3>📰 ${data.titre}</h3>
            <span class="badge">${data.categorie}</span>
          </div>
          <div class="card-content">
            <p>${(data.contenu || '').substring(0, 150)}${data.contenu?.length > 150 ? '…' : ''}</p>
            <small style="color:#6b7280;">Par ${data.auteur}</small>
          </div>
          <div class="card-actions">
            ${canEdit ? `
              <button class="btn-small" onclick="editNews('${d.id}')">✏️ Éditer</button>
              <button class="btn-small btn-danger" onclick="deleteNews('${d.id}')">🗑️ Supprimer</button>
            ` : ''}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state error-state">❌ ${err.message}</div>`;
  }
}

async function editNews(id) {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.actualites, id));
    const data = snap.data();
    document.getElementById('news-id').value = id;
    document.getElementById('news-titre').value = data.titre || '';
    document.getElementById('news-categorie').value = data.categorie || 'Général';
    document.getElementById('news-contenu').value = data.contenu || '';
    document.getElementById('news-modal').classList.remove('hidden');
  } catch (e) { showToast('Erreur chargement', 'error'); }
}

async function deleteNews(id) {
  if (!confirm('Supprimer cet article ?')) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.actualites, id));
    showToast('✅ Article supprimé');
    loadActualites();
  } catch (e) { showToast('Erreur suppression', 'error'); }
}

// ═════════════════════════════════════════════════════════════
// RAPPORTS
// ═════════════════════════════════════════════════════════════

document.querySelectorAll('.rapport-card button').forEach(btn => {
  btn.addEventListener('click', async e => {
    const rapport = e.target.closest('.rapport-card').dataset.rapport;
    generateReport(rapport);
  });
});

function generateReport(type) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR');
  const userAdmin = currentUserData?.nom || 'Administrateur';
  const titles = {
    'fédérations': 'Fédérations Nationales',
    'clubs': 'Clubs Sportifs',
    'joueurs': 'Joueurs Enregistrés',
    'arbitres': 'Arbitres Certifiés',
    'compétitions': 'Compétitions',
    'féminin': 'Football Féminin National'
  };
  const title = 'Rapport : ' + (titles[type] || type);
  const printWindow = window.open('', '', 'height=700,width=900');
  printWindow.document.write(`<!DOCTYPE html><html><head>
    <title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:40px}h1,h2{color:#009E60}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th{background:#f1f5f9;padding:10px;text-align:left;border:1px solid #ddd;font-weight:bold}
      td{padding:8px;border:1px solid #ddd}
      .badge{display:inline-block;padding:4px 8px;border-radius:4px;font-size:.85rem}
      .badge-success{background:#86efac;color:#166534}.badge-warning{background:#fcd34d;color:#854d0e}
      @media print{body{margin:0}.no-print{display:none}}
    </style>
    </head><body>
    <div style="text-align:center;margin-bottom:30px;border-bottom:3px solid #009E60;padding-bottom:20px;">
      <h1 style="margin:0;color:#009E60;">🇬🇦 GABON SPORT CONNECT</h1>
      <p style="margin:5px 0;font-weight:bold;">Ministère des Sports du Gabon</p>
      <p style="margin:0;color:#666;">Rapport officiel du ${dateStr}</p>
    </div>
    <h2>${title}</h2>
    <div id="content"><p>Chargement…</p></div>
    <div style="border-top:1px solid #ddd;margin-top:40px;padding-top:20px;font-size:.85rem;color:#666;text-align:center;">
      <p>📊 Généré par : <strong>${userAdmin}</strong></p>
      <p>⏰ ${now.toLocaleString('fr-FR')}</p>
      <p style="color:#009E60;font-weight:bold;">Cachet numérique Gabon Sport Connect</p>
    </div>
    <button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#009E60;color:white;border:none;border-radius:5px;cursor:pointer;">🖨️ Imprimer</button>
    </body></html>`);
  loadReportData(type, printWindow);
}

async function loadReportData(type, win) {
  const collMap = {
    'fédérations': COLLECTIONS.federations,
    'clubs': COLLECTIONS.clubs,
    'joueurs': COLLECTIONS.joueurs,
    'arbitres': COLLECTIONS.arbitres,
    'compétitions': COLLECTIONS.competences,
    'féminin': COLLECTIONS.joueurs
  };
  try {
    const coll = collMap[type];
    if (!coll) return;
    let snap;
    if (type === 'féminin') {
      snap = await getDocs(query(collection(db, coll), where('genre', '==', 'Féminin')));
    } else {
      snap = await getDocs(collection(db, coll));
    }
    let html = '';
    if (type === 'fédérations') {
      html = '<table><tr><th>Fédération</th><th>Sport</th><th>Statut</th></tr>';
      snap.docs.forEach(d => {
        const data = d.data();
        html += `<tr><td>${data.nom}</td><td>${data.sport}</td><td><span class="badge ${data.statut === 'Validée' ? 'badge-success' : 'badge-warning'}">${data.statut}</span></td></tr>`;
      });
      html += '</table>';
    } else if (type === 'clubs') {
      html = '<table><tr><th>Club</th><th>Ville</th><th>Sport</th><th>Division</th></tr>';
      snap.docs.forEach(d => {
        const data = d.data();
        html += `<tr><td>${data.nom}</td><td>${data.ville||'—'}</td><td>${data.sport}</td><td>${data.division}</td></tr>`;
      });
      html += '</table>';
    } else if (type === 'joueurs' || type === 'féminin') {
      html = '<table><tr><th>Nom</th><th>Prénom</th><th>Position</th><th>Statut</th></tr>';
      snap.docs.forEach(d => {
        const data = d.data();
        html += `<tr><td>${data.nom}</td><td>${data.prenom}</td><td>${data.position}</td><td>${data.statut}</td></tr>`;
      });
      html += '</table>';
    } else if (type === 'arbitres') {
      html = '<table><tr><th>Nom</th><th>Prénom</th><th>Grade</th><th>Statut</th></tr>';
      snap.docs.forEach(d => {
        const data = d.data();
        html += `<tr><td>${data.nom}</td><td>${data.prenom}</td><td>${data.grade}</td><td>${data.statut}</td></tr>`;
      });
      html += '</table>';
    } else if (type === 'compétitions') {
      html = '<table><tr><th>Compétition</th><th>Sport</th><th>Saison</th><th>Statut</th></tr>';
      snap.docs.forEach(d => {
        const data = d.data();
        html += `<tr><td>${data.nom}</td><td>${data.sport}</td><td>${data.saison||'—'}</td><td>${data.statut}</td></tr>`;
      });
      html += '</table>';
    }
    if (win.document.getElementById('content')) {
      win.document.getElementById('content').innerHTML = html || '<p>Aucune donnée.</p>';
    }
  } catch (e) {
    console.error('Erreur rapport', e);
  }
}


// ─── Feature cards landing (ouvrir modal connexion) ─────────
document.querySelectorAll('.feature-card[data-action="login"]').forEach(card => {
  card.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('auth-modal').classList.remove('hidden');
  });
});

// ─── CTA register button ─────────────────────────────────────
document.getElementById('btn-cta-register')?.addEventListener('click', () => {
  document.getElementById('auth-modal').classList.remove('hidden');
  // Switch to register tab
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.remove('hidden');
  const regTab = document.querySelector('.auth-tab[data-tab="register"]');
  if (regTab) regTab.classList.add('active');
});

// Footer login link
document.getElementById('footer-login-link')?.addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('auth-modal').classList.remove('hidden');
});

// ─── Splash screen — masquage robuste ────────────────────────
// Le splash se ferme dès que onAuthStateChanged répond,
// ou au plus tard après 5 s (garde-fou contre connexion lente / erreur Firebase).
let _splashDone = false;
function hideSplash() {
  if (_splashDone) return;
  _splashDone = true;
  const splash = document.getElementById('splash-screen');
  if (splash) splash.classList.add('hidden');
}

// Garde-fou absolu : peu importe ce qui se passe, le splash disparaît après 5 s
window.addEventListener('load', () => {
  setTimeout(hideSplash, 5000);
});

// ═════════════════════════════════════════════════════════════
// GÉOLOCALISATION — STADES & CLUBS
// ═════════════════════════════════════════════════════════════

window.openMapLink = openMapLink;
window.captureGPS = captureGPS;
window.openCalendrierComp = openCalendrierComp;
window.ajouterMatch = ajouterMatch;
window.supprimerMatch = supprimerMatch;
window.ouvrirNotifications = ouvrirNotifications;
window.validerJoueurAdmin = validerJoueurAdmin;
window.refuserJoueurAdmin = refuserJoueurAdmin;

function openMapLink(lat, lng, nom) {
  if (!lat || !lng) { showToast('Coordonnées GPS non disponibles', 'error'); return; }
  window.open(`https://www.google.com/maps?q=${lat},${lng}&label=${encodeURIComponent(nom)}`, '_blank');
}

function captureGPS(latFieldId, lngFieldId, btnId) {
  const btn = document.getElementById(btnId);
  if (btn) { btn.textContent = '📡 Localisation…'; btn.disabled = true; }
  if (!navigator.geolocation) {
    showToast('GPS non disponible', 'error');
    if (btn) { btn.textContent = '📍 Localiser'; btn.disabled = false; }
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById(latFieldId).value = pos.coords.latitude.toFixed(6);
      document.getElementById(lngFieldId).value = pos.coords.longitude.toFixed(6);
      if (btn) { btn.textContent = '✅ Localisé !'; btn.disabled = false; }
      showToast('✅ Position GPS capturée');
    },
    err => {
      showToast('Erreur GPS : ' + err.message, 'error');
      if (btn) { btn.textContent = '📍 Localiser'; btn.disabled = false; }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ═════════════════════════════════════════════════════════════
// DÉTECTION DE DOUBLONS / FRAUDES JOUEURS
// ═════════════════════════════════════════════════════════════

async function verifierDoublonJoueur(nom, prenom, dateNaissance, clubCibleId, joueurIdExistant) {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.joueurs));
    const nomN = nom.trim().toLowerCase();
    const prenomN = prenom.trim().toLowerCase();
    for (const d of snap.docs) {
      if (d.id === joueurIdExistant) continue;
      const data = d.data();
      if ((data.nom||'').trim().toLowerCase() === nomN &&
          (data.prenom||'').trim().toLowerCase() === prenomN &&
          dateNaissance && data.dateNaissance === dateNaissance) {
        if ((data.statut||'') === 'Actif' && data.club && data.club !== clubCibleId) {
          return { doublon: true, sousScontrat: true,
            message: `⚠️ ${prenom} ${nom} est ACTIF dans un autre club. Transfert bloqué — admin requis.`,
            joueurId: d.id, clubActuel: data.club };
        }
        return { doublon: true, sousScontrat: false,
          message: `ℹ️ Un joueur similaire existe déjà (statut: ${data.statut||'?'}).`,
          joueurId: d.id };
      }
    }
    return { doublon: false };
  } catch(e) { return { doublon: false }; }
}

async function envoyerNotificationDoublon(joueurNom, joueurPrenom, joueurId, clubCibleId, message) {
  try {
    await addDoc(collection(db, COLLECTIONS.notifications), {
      type: 'doublon', joueurNom, joueurPrenom, joueurId, clubCibleId,
      message, statut: 'en_attente', createdAt: serverTimestamp(), lueParAdmin: false
    });
  } catch(e) {}
}

async function validerJoueurAdmin(notifId, joueurId) {
  try {
    if (joueurId) await updateDoc(doc(db, COLLECTIONS.joueurs, joueurId), { statut: 'Actif', doublon: false, updatedAt: serverTimestamp() });
    await updateDoc(doc(db, COLLECTIONS.notifications, notifId), { statut: 'approuvé', lueParAdmin: true });
    showToast('✅ Joueur validé'); ouvrirNotifications();
  } catch(e) { showToast('Erreur', 'error'); }
}

async function refuserJoueurAdmin(notifId, joueurId) {
  try {
    if (joueurId) await updateDoc(doc(db, COLLECTIONS.joueurs, joueurId), { statut: 'Refusé — Doublon', updatedAt: serverTimestamp() });
    await updateDoc(doc(db, COLLECTIONS.notifications, notifId), { statut: 'refusé', lueParAdmin: true });
    showToast('🚫 Joueur refusé'); ouvrirNotifications();
  } catch(e) { showToast('Erreur', 'error'); }
}

async function ouvrirNotifications() {
  const modal = document.getElementById('notif-modal');
  const container = document.getElementById('notif-list');
  if (!modal || !container) return;
  modal.classList.remove('hidden');
  container.innerHTML = '<div class="loading-state">⏳ Chargement…</div>';
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.notifications), orderBy('createdAt', 'desc')));
    if (snap.empty) { container.innerHTML = '<div class="empty-state">✅ Aucune notification</div>'; return; }
    container.innerHTML = snap.docs.map(d => {
      const n = d.data();
      const couleur = n.statut === 'en_attente' ? '#f59e0b' : n.statut === 'approuvé' ? '#10b981' : '#ef4444';
      const badgeTxt = n.statut === 'en_attente' ? 'En attente' : n.statut === 'approuvé' ? 'Approuvé' : 'Refusé';
      return `<div class="data-card" style="border-left:4px solid ${couleur}">
        <div class="card-header"><h3>⚠️ ${n.joueurPrenom||''} ${n.joueurNom||''}</h3><span class="badge" style="background:${couleur}20;color:${couleur}">${badgeTxt}</span></div>
        <div class="card-content"><p>${n.message||''}</p></div>
        ${n.statut === 'en_attente' && currentRole === 'super-admin' ? `<div class="card-actions">
          <button class="btn-small" onclick="validerJoueurAdmin('${d.id}','${n.joueurId||''}')">✅ Valider</button>
          <button class="btn-small btn-danger" onclick="refuserJoueurAdmin('${d.id}','${n.joueurId||''}')">🚫 Refuser</button>
        </div>` : ''}
      </div>`;
    }).join('');
  } catch(e) { container.innerHTML = `<div class="error-state">❌ ${e.message}</div>`; }
}

document.getElementById('notif-modal-close')?.addEventListener('click', () => document.getElementById('notif-modal')?.classList.add('hidden'));
document.getElementById('btn-notifs')?.addEventListener('click', () => ouvrirNotifications());

async function updateNotifBadge() {
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.notifications), where('statut','==','en_attente')));
    const badge = document.getElementById('notif-badge');
    if (badge) { badge.textContent = snap.size > 0 ? snap.size : ''; badge.style.display = snap.size > 0 ? 'flex' : 'none'; }
  } catch(e) {}
}

// ═════════════════════════════════════════════════════════════
// CALENDRIER DES MATCHS PAR COMPÉTITION
// ═════════════════════════════════════════════════════════════

async function openCalendrierComp(compId, compNom) {
  const modal = document.getElementById('calendrier-modal');
  if (!modal) return;
  modal.dataset.compId = compId;
  const title = document.getElementById('calendrier-comp-title');
  if (title) title.textContent = `📅 Calendrier — ${compNom}`;
  modal.classList.remove('hidden');
  await chargerMatchs(compId);
}

async function chargerMatchs(compId) {
  const container = document.getElementById('calendrier-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-state">⏳ Chargement…</div>';
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.matchs), where('compId','==',compId), orderBy('date','asc')));
    if (snap.empty) { container.innerHTML = '<div class="empty-state">📅 Aucun match — Ajoutez-en ci-dessous</div>'; return; }
    container.innerHTML = snap.docs.map(d => {
      const m = d.data();
      const mapsUrl = m.lieuLat && m.lieuLng ? `https://www.google.com/maps?q=${m.lieuLat},${m.lieuLng}` : null;
      const waUrl = mapsUrl ? `https://wa.me/?text=${encodeURIComponent('📍 Match : '+m.domicile+' vs '+m.visiteur+' le '+m.date+' à '+m.heure+'\n📍 '+m.lieu+'\n'+mapsUrl)}` : null;
      return `<div class="data-card">
        <div class="card-header"><h3>⚽ ${m.domicile} vs ${m.visiteur}</h3><span class="badge">${m.date||'?'}</span></div>
        <div class="card-content">
          <p><strong>Heure:</strong> ${m.heure||'—'} &nbsp;·&nbsp; <strong>Lieu:</strong> ${m.lieu||'—'}</p>
          ${m.resultat ? `<p><strong>Score:</strong> ${m.resultat}</p>` : ''}
          <div style="display:flex;gap:12px;margin-top:6px;flex-wrap:wrap;">
            ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" style="color:var(--green);font-size:12px;font-weight:600;">📍 Google Maps</a>` : '<span style="color:#9ca3af;font-size:12px;">📍 Non géolocalisé</span>'}
            ${waUrl ? `<a href="${waUrl}" target="_blank" style="color:#25D366;font-size:12px;font-weight:600;">📲 WhatsApp</a>` : ''}
          </div>
        </div>
        ${currentRole === 'super-admin' ? `<div class="card-actions"><button class="btn-small btn-danger" onclick="supprimerMatch('${d.id}','${m.compId}')">🗑️ Supprimer</button></div>` : ''}
      </div>`;
    }).join('');
  } catch(e) { container.innerHTML = `<div class="error-state">❌ ${e.message}</div>`; }
}

async function verifierConflitCalendrier(date, heure, lieuNom) {
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.matchs), where('date','==',date)));
    for (const d of snap.docs) {
      const m = d.data();
      if (m.lieu && lieuNom && m.lieu.toLowerCase() === lieuNom.toLowerCase()) {
        if (m.heure === heure) return { conflit: true, message: `🚫 Stade "${lieuNom}" déjà réservé le ${date} à ${heure} : ${m.domicile} vs ${m.visiteur}` };
        if (heure && m.heure) {
          const h1 = parseInt(heure.split(':')[0]);
          const h2 = parseInt(m.heure.split(':')[0]);
          if (Math.abs(h1-h2) < 2) return { conflit: true, message: `⚠️ Chevauchement au stade "${lieuNom}" : match à ${m.heure} le ${date}. Trop proche de ${heure}.` };
        }
      }
    }
    return { conflit: false };
  } catch(e) { return { conflit: false }; }
}

async function ajouterMatch() {
  const compId = document.getElementById('calendrier-modal')?.dataset.compId;
  if (!compId) return;
  const domicile = document.getElementById('match-domicile')?.value.trim();
  const visiteur = document.getElementById('match-visiteur')?.value.trim();
  const date = document.getElementById('match-date')?.value;
  const heure = document.getElementById('match-heure')?.value;
  const lieu = document.getElementById('match-lieu')?.value.trim();
  const lieuLat = document.getElementById('match-lieu-lat')?.value;
  const lieuLng = document.getElementById('match-lieu-lng')?.value;
  const resultat = document.getElementById('match-resultat')?.value.trim();
  if (!domicile || !visiteur || !date) { showToast('Équipes et date obligatoires', 'error'); return; }
  if (lieu) {
    const conflit = await verifierConflitCalendrier(date, heure, lieu);
    if (conflit.conflit) { showToast(conflit.message, 'error'); alert(conflit.message); return; }
  }
  try {
    await addDoc(collection(db, COLLECTIONS.matchs), {
      compId, domicile, visiteur, date, heure: heure||'', lieu: lieu||'',
      lieuLat: lieuLat||'', lieuLng: lieuLng||'', resultat: resultat||'',
      createdBy: currentUser?.uid||'', createdAt: serverTimestamp()
    });
    showToast('✅ Match ajouté');
    ['match-domicile','match-visiteur','match-date','match-heure','match-lieu','match-lieu-lat','match-lieu-lng','match-resultat'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
    await chargerMatchs(compId);
  } catch(e) { showToast('Erreur : '+e.message, 'error'); }
}

async function supprimerMatch(matchId, compId) {
  if (!confirm('Supprimer ce match ?')) return;
  try { await deleteDoc(doc(db, COLLECTIONS.matchs, matchId)); showToast('✅ Match supprimé'); chargerMatchs(compId); }
  catch(e) { showToast('Erreur', 'error'); }
}

document.getElementById('calendrier-modal-close')?.addEventListener('click', () => document.getElementById('calendrier-modal')?.classList.add('hidden'));

// Vérification doublon lors de la soumission joueur
// Patch du submit original
(function patchJoueurSubmit() {
  const form = document.getElementById('joueur-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.stopImmediatePropagation();
    // la vérification doublon est ajoutée ici en plus du traitement normal
    const nom = document.getElementById('joueur-nom')?.value.trim() || '';
    const prenom = document.getElementById('joueur-prenom')?.value.trim() || '';
    const dateNaissance = document.getElementById('joueur-date-naissance')?.value || '';
    const clubId = document.getElementById('joueur-club')?.value || '';
    const docId = document.getElementById('joueur-id')?.value || '';
    if (nom && prenom && dateNaissance) {
      const check = await verifierDoublonJoueur(nom, prenom, dateNaissance, clubId, docId || null);
      if (check.doublon && check.sousScontrat) {
        e.preventDefault();
        showToast(check.message, 'error');
        const confirmer = confirm('🚨 ALERTE DOUBLON\n\n' + check.message + '\n\nSoumettre une demande d\'exception à l\'admin ?');
        if (confirmer) {
          await addDoc(collection(db, COLLECTIONS.joueurs), {
            nom, prenom, dateNaissance,
            nationalite: document.getElementById('joueur-nationalite')?.value || 'Gabonaise',
            position: document.getElementById('joueur-position')?.value || 'Attaquant',
            club: clubId,
            statut: 'En attente — Doublon signalé',
            genre: document.getElementById('joueur-genre')?.value || 'Masculin',
            doublon: true, doublonRef: check.joueurId,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp()
          });
          await envoyerNotificationDoublon(nom, prenom, null, clubId, check.message);
          showToast('⏳ Demande soumise à l\'admin');
          document.getElementById('joueur-modal')?.classList.add('hidden');
        }
        return false;
      }
      if (check.doublon && !check.sousScontrat) {
        const ok = confirm(check.message + '\n\nContinuer quand même ?');
        if (!ok) { e.preventDefault(); return false; }
      }
    }
  }, true); // capture phase avant l'autre listener
})();

// Appel updateNotifBadge après connexion
setTimeout(() => { if (currentUser) updateNotifBadge(); }, 3000);


// ═════════════════════════════════════════════════════════════
// CARTE JOUEUR HERO — CHARGEMENT DYNAMIQUE
// ═════════════════════════════════════════════════════════════

async function loadHeroPlayerCard() {
  const nameEl  = document.getElementById('hero-player-name');
  const subEl   = document.getElementById('hero-player-sub');
  const badgeEl = document.getElementById('hero-player-badge');
  const iconEl  = document.getElementById('hero-player-icon');
  if (!nameEl) return;

  try {
    // Priorité 1 : joueur Actif le plus récent
    // Priorité 2 : n'importe quel joueur
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.joueurs), orderBy('createdAt', 'desc'))
    );

    if (snap.empty) {
      nameEl.textContent  = 'Aucun joueur encore';
      subEl.textContent   = 'Rejoignez la plateforme';
      badgeEl.textContent = '🇬🇦 GSC';
      return;
    }

    // Chercher d'abord un joueur Actif
    let choisi = null;
    for (const d of snap.docs) {
      const j = d.data();
      if ((j.statut || '') === 'Actif') { choisi = j; break; }
    }
    // Sinon prendre le premier
    if (!choisi) choisi = snap.docs[0].data();

    const nom    = `${choisi.prenom || ''} ${choisi.nom || ''}`.trim() || 'Joueur';
    const sport  = choisi.sport || 'Football';
    const poste  = choisi.position || 'Joueur';
    const club   = choisi.club || '';
    const niveau = choisi.niveau || '';

    // Emoji selon sport
    const sportIcon = {
      'Football': '⚽', 'Basketball': '🏀', 'Volleyball': '🏐',
      'Athlétisme': '🏃', 'Natation': '🏊', 'Boxe': '🥊',
      'Tennis': '🎾', 'Judo': '🥋', 'Rugby': '🏉',
      'Cyclisme': '🚴', 'Handball': '🤾'
    }[sport] || '🏅';

    // Récupérer le nom du club si c'est un ID Firestore
    let clubNom = club;
    if (club && club.length === 20) { // ID Firestore
      try {
        const clubDoc = await getDoc(doc(db, COLLECTIONS.clubs, club));
        if (clubDoc.exists()) clubNom = clubDoc.data().nom;
      } catch(e) {}
    }

    if (iconEl)  iconEl.textContent  = sportIcon;
    nameEl.textContent  = nom;
    subEl.textContent   = `${poste}${clubNom ? ' · ' + clubNom : ''}`;
    badgeEl.textContent = `🇬🇦 ${niveau || 'Actif'}`;

  } catch(e) {
    console.warn('Hero card:', e);
    // Garder le placeholder
  }
}

// Charger la carte joueur au démarrage (landing page)
loadHeroPlayerCard();

// Recharger aussi après connexion au cas où de nouveaux joueurs ont été ajoutés
document.addEventListener('gscUserReady', () => {
  loadHeroPlayerCard();
});


// ═════════════════════════════════════════════════════════════
// UTILITAIRES PROFIL
// ═════════════════════════════════════════════════════════════

// Calcul âge depuis dateNaissance (YYYY-MM-DD)
function calcAge(dateStr) {
  if (!dateStr) return null;
  const dob = new Date(dateStr);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

// Avatar par défaut selon genre
function defaultAvatar(genre) {
  if (!genre) return '👤';
  const g = genre.toLowerCase();
  if (g === 'féminin' || g === 'feminin') return '👩';
  return '👨';
}

// Encoder image en base64 (pour stockage Firestore — petite image seulement)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Resize image avant base64 (max 200px)
function resizeImage(file, maxSize = 200) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = url;
  });
}

// Setup photo preview for a modal
function setupPhotoPreview(inputId, previewId, placeholderSelector) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const dataUrl = await resizeImage(file, 200);
    const placeholder = preview.querySelector(placeholderSelector || 'span');
    if (placeholder) placeholder.style.display = 'none';
    let img = preview.querySelector('img');
    if (!img) { img = document.createElement('img'); preview.appendChild(img); }
    img.src = dataUrl;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
    input._base64 = dataUrl;
  });
}

// Init photo previews
setupPhotoPreview('joueur-photo-input', 'joueur-photo-preview', '#joueur-photo-placeholder');
setupPhotoPreview('arbitre-photo-input', 'arbitre-photo-preview', '#arbitre-photo-placeholder');
setupPhotoPreview('supporter-photo-input', 'supporter-photo-preview', '#supporter-photo-placeholder');

// Afficher photo dans la sidebar user-avatar
function updateSidebarAvatar(photoUrl) {
  const avatarEl = document.getElementById('user-avatar-text');
  if (!avatarEl || !photoUrl) return;
  avatarEl.innerHTML = `<img src="${photoUrl}" class="user-avatar-photo" alt="Photo profil" />`;
}

// ─── Mise à jour photo dans joueur-form submit ───────────────
// Patch joueur form pour inclure photo
const _origJoueurForm = document.getElementById('joueur-form');
if (_origJoueurForm) {
  _origJoueurForm.addEventListener('submit', async e => {
    const photoInput = document.getElementById('joueur-photo-input');
    if (photoInput?._base64) {
      const docId = document.getElementById('joueur-id').value;
      if (docId) {
        try { await updateDoc(doc(db, COLLECTIONS.joueurs, docId), { photo: photoInput._base64 }); } catch(er) {}
      }
    }
  }, true); // capture before main handler — non-blocking
}

// ═════════════════════════════════════════════════════════════
// SUPPORTERS — CRUD COMPLET
// ═════════════════════════════════════════════════════════════

// Afficher/masquer champ nom association
document.getElementById('sup-association')?.addEventListener('change', function() {
  const wrap = document.getElementById('sup-association-nom-wrap');
  if (wrap) wrap.style.display = this.value === 'oui' ? '' : 'none';
});

// Ouvrir modal supporter (admin)
document.getElementById('btn-add-supporter')?.addEventListener('click', async () => {
  await populateClubSelect('sup-club-fan');
  document.getElementById('supporter-id').value = '';
  document.getElementById('supporter-form').reset();
  const photoInput = document.getElementById('supporter-photo-input');
  if (photoInput) photoInput._base64 = null;
  const prev = document.getElementById('supporter-photo-preview');
  if (prev) { const img = prev.querySelector('img'); if(img) img.remove(); const sp = document.getElementById('supporter-photo-placeholder'); if(sp) sp.style.display=''; }
  document.getElementById('sup-association-nom-wrap').style.display = 'none';
  document.getElementById('supporter-modal').classList.remove('hidden');
});

document.getElementById('supporter-modal-close')?.addEventListener('click', () =>
  document.getElementById('supporter-modal').classList.add('hidden'));
document.getElementById('supporter-modal-cancel')?.addEventListener('click', () =>
  document.getElementById('supporter-modal').classList.add('hidden'));

document.getElementById('supporter-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const docId = document.getElementById('supporter-id').value;
  const photoInput = document.getElementById('supporter-photo-input');
  const photoUrl = photoInput?._base64 || '';
  const data = {
    nom: document.getElementById('sup-nom').value.trim(),
    prenom: document.getElementById('sup-prenom').value.trim(),
    age: parseInt(document.getElementById('sup-age').value) || null,
    sexe: document.getElementById('sup-sexe').value,
    clubFan: document.getElementById('sup-club-fan').value,
    sportFav: document.getElementById('sup-sport-fav').value,
    association: document.getElementById('sup-association').value,
    associationNom: document.getElementById('sup-association-nom').value.trim(),
    ville: document.getElementById('sup-ville').value.trim(),
    province: document.getElementById('sup-province').value,
    contact: document.getElementById('sup-contact').value.trim(),
    bio: document.getElementById('sup-bio').value.trim(),
    updatedAt: serverTimestamp()
  };
  if (photoUrl) data.photo = photoUrl;
  if (!data.nom || !data.prenom) { showToast('Nom et prénom requis', 'error'); return; }
  if (!data.sexe) { showToast('Veuillez sélectionner le sexe', 'error'); return; }
  if (!data.ville) { showToast('Ville de résidence requise', 'error'); return; }
  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.supporters, docId), data);
      showToast('✅ Supporter mis à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.supporters), { ...data, userId: currentUser?.uid || '', createdAt: serverTimestamp() });
      showToast('✅ Supporter enregistré');
    }
    document.getElementById('supporter-modal').classList.add('hidden');
    loadSupporters();
  } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
});

async function loadSupporters() {
  const container = document.getElementById('list-supporters');
  if (!container) return;
  container.innerHTML = '<div class="loading-state">⏳ Chargement…</div>';
  try {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.supporters), orderBy('createdAt', 'desc')));
    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">🎽 Aucun supporter enregistré</div>';
      return;
    }
    // Récupérer les noms de clubs
    const clubsSnap = await getDocs(collection(db, COLLECTIONS.clubs));
    const clubsMap = {};
    clubsSnap.docs.forEach(d => clubsMap[d.id] = d.data().nom);

    container.innerHTML = snapshot.docs.map(d => {
      const s = d.data();
      const clubNom = clubsMap[s.clubFan] || s.clubFan || '—';
      const avatar = s.photo
        ? `<img src="${s.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" />`
        : `<span style="font-size:22px;">${s.sexe === 'Féminin' ? '👩' : '👨'}</span>`;
      const assocBadge = s.association === 'oui'
        ? `<span class="assoc-badge">🏳️ ${s.associationNom || 'Association'}</span>`
        : `<span class="assoc-badge non">Pas d'association</span>`;
      return `
        <div class="data-card">
          <div class="card-header-with-avatar">
            <div class="card-avatar">${avatar}</div>
            <div>
              <h3 style="font-size:15px;font-weight:700;">🎽 ${s.prenom} ${s.nom}</h3>
              <p style="font-size:12px;color:var(--text-3);">${s.sexe || '—'} · ${s.age ? s.age + ' ans' : '—'} · ${s.ville || '—'}</p>
            </div>
            <span class="badge badge-blue" style="margin-left:auto;">Fan</span>
          </div>
          <div class="card-content">
            <p><strong>Club favori :</strong> ${clubNom}</p>
            <p><strong>Province :</strong> ${s.province || '—'}</p>
            ${s.contact ? `<p><strong>📞 Tél :</strong> <a href="tel:${s.contact}" style="color:var(--green);font-weight:600;">${s.contact}</a></p>` : ''}
            <p style="margin-top:6px;">${assocBadge}</p>
            ${s.bio ? `<p style="margin-top:8px;font-size:12px;color:var(--text-2);font-style:italic;">"${s.bio}"</p>` : ''}
          </div>
          <div class="card-actions">
            <button class="btn-small" onclick="editSupporter('${d.id}')">✏️ Éditer</button>
            ${currentRole === 'super-admin' ? `<button class="btn-small btn-danger" onclick="deleteSupporter('${d.id}')">🗑️ Supprimer</button>` : ''}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state error-state">❌ ${err.message}</div>`;
  }
}

async function editSupporter(id) {
  try {
    await populateClubSelect('sup-club-fan');
    const snap = await getDoc(doc(db, COLLECTIONS.supporters, id));
    const s = snap.data();
    document.getElementById('supporter-id').value = id;
    document.getElementById('sup-nom').value = s.nom || '';
    document.getElementById('sup-prenom').value = s.prenom || '';
    document.getElementById('sup-age').value = s.age || '';
    document.getElementById('sup-sexe').value = s.sexe || '';
    document.getElementById('sup-club-fan').value = s.clubFan || '';
    document.getElementById('sup-sport-fav').value = s.sportFav || 'Football';
    document.getElementById('sup-association').value = s.association || 'non';
    const wrap = document.getElementById('sup-association-nom-wrap');
    if (wrap) wrap.style.display = s.association === 'oui' ? '' : 'none';
    document.getElementById('sup-association-nom').value = s.associationNom || '';
    document.getElementById('sup-ville').value = s.ville || '';
    document.getElementById('sup-province').value = s.province || 'Estuaire';
    document.getElementById('sup-contact').value = s.contact || '';
    document.getElementById('sup-bio').value = s.bio || '';
    // Photo
    const prev = document.getElementById('supporter-photo-preview');
    if (prev && s.photo) {
      let img = prev.querySelector('img');
      if (!img) { img = document.createElement('img'); prev.appendChild(img); }
      img.src = s.photo;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
      const sp = document.getElementById('supporter-photo-placeholder'); if(sp) sp.style.display='none';
    }
    document.querySelector('#supporter-modal .form-modal-title').textContent = 'Modifier supporter';
    document.getElementById('supporter-modal').classList.remove('hidden');
  } catch (e) { showToast('Erreur chargement', 'error'); }
}

async function deleteSupporter(id) {
  if (!confirm('Supprimer ce supporter ?')) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.supporters, id));
    showToast('✅ Supporter supprimé');
    loadSupporters();
  } catch (e) { showToast('Erreur suppression', 'error'); }
}

// Profil supporter perso (vue du compte)
async function loadSupporterProfil() {
  const container = document.getElementById('supporter-profil-container');
  if (!container || !currentUser) return;
  container.innerHTML = '<div class="loading-state">⏳ Chargement…</div>';
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.supporters), where('userId', '==', currentUser.uid)));
    if (snap.empty) {
      container.innerHTML = `
        <div class="profile-public-card">
          <div style="font-size:48px;margin-bottom:12px;">🎽</div>
          <p style="color:var(--text-2);margin-bottom:16px;">Votre profil supporter n'est pas encore complété.</p>
          <button class="btn-primary" onclick="document.getElementById('btn-add-supporter').click()">Compléter mon profil</button>
        </div>`;
      return;
    }
    const s = snap.docs[0].data();
    const id = snap.docs[0].id;
    const clubsSnap = await getDocs(collection(db, COLLECTIONS.clubs));
    const clubsMap = {};
    clubsSnap.docs.forEach(d => clubsMap[d.id] = d.data().nom);
    const clubNom = clubsMap[s.clubFan] || s.clubFan || '—';
    const avatarHtml = s.photo
      ? `<img src="${s.photo}" style="width:90px;height:90px;object-fit:cover;border-radius:50%;border:3px solid var(--green);" />`
      : `<div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);display:flex;align-items:center;justify-content:center;font-size:36px;border:3px solid var(--green);margin:0 auto;">${s.sexe === 'Féminin' ? '👩' : '👨'}</div>`;
    container.innerHTML = `
      <div class="profile-public-card">
        <div style="margin-bottom:12px;">${avatarHtml}</div>
        <div class="profile-public-name">${s.prenom} ${s.nom}</div>
        <div class="profile-public-role">🎽 Supporter</div>
        <div class="profile-public-details" style="margin-bottom:16px;">
          <div><strong>Âge :</strong> ${s.age ? s.age + ' ans' : '—'}</div>
          <div><strong>Sexe :</strong> ${s.sexe || '—'}</div>
          <div><strong>Club fan :</strong> ${clubNom}</div>
          <div><strong>Sport fav :</strong> ${s.sportFav || '—'}</div>
          <div><strong>Ville :</strong> ${s.ville || '—'}</div>
          <div><strong>Province :</strong> ${s.province || '—'}</div>
          ${s.association === 'oui' ? `<div style="grid-column:span 2;"><strong>Association :</strong> ${s.associationNom || 'Oui'}</div>` : ''}
          ${s.contact ? `<div style="grid-column:span 2;"><strong>📞 Téléphone :</strong> <a href="tel:${s.contact}" style="color:var(--green);font-weight:600;">${s.contact}</a></div>` : ''}
        </div>
        ${s.bio ? `<p style="font-size:13px;color:var(--text-2);font-style:italic;margin-bottom:16px;">"${s.bio}"</p>` : ''}
        <button class="btn-primary" onclick="editSupporter('${id}')" style="width:100%;">✏️ Modifier mon profil</button>
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state error-state">❌ ${err.message}</div>`;
  }
}

// Mise à jour photo dans les fiches joueur (afficher avec age dans la liste)
// NOTE : loadJoueurs est défini une seule fois dans le fichier (voir section GESTION DES JOUEURS).
// La version ci-dessous était un doublon supprimé pour éviter le conflit.
