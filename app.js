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
  actualites: 'actualites'
};

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
});

function showLanding() {
  document.getElementById('landing').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  // Masquer le splash si visible
  const splash = document.getElementById('splash-screen');
  if (splash) splash.classList.add('hidden');
}

function showDashboard(user) {
  // Cacher le splash
  const splash = document.getElementById('splash-screen');
  if (splash) splash.classList.add('hidden');

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
}

function getRoleLabel(role) {
  const labels = {
    'super-admin': '👑 Super Admin',
    'fédération': '🏛️ Fédération',
    'club': '🏟️ Club',
    'joueur': '⚽ Joueur',
    'arbitre': '👨‍⚖️ Arbitre',
    'organisation': '📊 Organisation'
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
  const role = document.getElementById('reg-role').value;

  if (!role) { showToast('Veuillez sélectionner un rôle', 'error'); return; }
  if (password.length < 6) { showToast('Le mot de passe doit faire au moins 6 caractères', 'error'); return; }

  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Inscription…';
  btn.disabled = true;
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, COLLECTIONS.users, userCred.user.uid), {
      role, email, nom, createdAt: serverTimestamp()
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

// ─── Dashboard Stats ─────────────────────────────────────────
async function loadDashboardStats() {
  try {
    const [fedSnap, clubSnap, jouSnap, arbSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.federations)),
      getDocs(collection(db, COLLECTIONS.clubs)),
      getDocs(collection(db, COLLECTIONS.joueurs)),
      getDocs(collection(db, COLLECTIONS.arbitres))
    ]);

    const fedEl = document.getElementById('stat-fédérations');
    const clubEl = document.getElementById('stat-clubs');
    const jouEl = document.getElementById('stat-joueurs');
    const arbEl = document.getElementById('stat-arbitres');

    if (fedEl) fedEl.textContent = fedSnap.size;
    if (clubEl) clubEl.textContent = clubSnap.size;
    if (jouEl) jouEl.textContent = jouSnap.size;
    if (arbEl) arbEl.textContent = arbSnap.size;
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
      container.innerHTML = '<div class="empty-state">🏛️ Aucune fédération enregistrée<br><small>Cliquez sur "Nouvelle fédération" pour commencer</small></div>';
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
    fedSnapshot.docs.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.data().nom;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.warn('Erreur chargement fédérations pour select:', e);
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
            <p><strong>Sport:</strong> ${data.sport} · <strong>Genre:</strong> ${data.genre}</p>
            <p><strong>Ville:</strong> ${data.ville || '—'} ${data.province ? '· ' + data.province : ''}</p>
            ${data.stade ? `<p><strong>Stade:</strong> ${data.stade}</p>` : ''}
            <p><strong>Catégorie:</strong> ${data.catégorie}</p>
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
  const data = {
    nom: document.getElementById('joueur-nom').value,
    prenom: document.getElementById('joueur-prenom').value,
    dateNaissance: document.getElementById('joueur-date-naissance').value,
    nationalité: (document.getElementById('joueur-nationalite') || document.getElementById('joueur-nationalité'))?.value || 'Gabonaise',
    position: document.getElementById('joueur-position').value,
    club: document.getElementById('joueur-club').value,
    statut: document.getElementById('joueur-statut').value,
    genre: document.getElementById('joueur-genre')?.value || 'Masculin',
    updatedAt: serverTimestamp()
  };
  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.joueurs, docId), data);
      showToast('✅ Joueur mis à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.joueurs), { ...data, createdAt: serverTimestamp() });
      showToast('✅ Joueur enregistré');
    }
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
      const statusClass = data.statut === 'Actif' ? 'badge-success' : data.statut === 'Blessé' ? 'badge-danger' : 'badge-warning';
      return `
        <div class="data-card">
          <div class="card-header">
            <h3>⚽ ${data.prenom} ${data.nom}</h3>
            <span class="badge ${statusClass}">${data.statut}</span>
          </div>
          <div class="card-content">
            <p><strong>Position:</strong> ${data.position} · <strong>Genre:</strong> ${data.genre || '—'}</p>
            <p><strong>Nationalité:</strong> ${data.nationalité}</p>
            <p><strong>Naissance:</strong> ${data.dateNaissance || '—'}</p>
          </div>
          <div class="card-actions">
            <button class="btn-small" onclick="editJoueur('${d.id}')">✏️ Éditer</button>
            <button class="btn-small btn-danger" onclick="deleteJoueur('${d.id}')">🗑️ Supprimer</button>
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
    document.querySelector('#joueur-modal .form-modal-title').textContent = 'Modifier joueur';
    document.getElementById('joueur-modal').classList.remove('hidden');
  } catch (e) { showToast('Erreur chargement', 'error'); }
}

async function deleteJoueur(id) {
  if (!confirm('Supprimer ce joueur ?')) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.joueurs, id));
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
  const data = {
    nom: document.getElementById('arbitre-nom').value,
    prenom: document.getElementById('arbitre-prenom').value,
    grade: document.getElementById('arbitre-grade').value,
    niveau: document.getElementById('arbitre-niveau').value,
    statut: document.getElementById('arbitre-statut').value,
    dateNaissance: document.getElementById('arbitre-date-naissance').value || '',
    nationalité: document.getElementById('arbitre-nationalité')?.value || 'Gabonaise',
    fédération: document.getElementById('arbitre-fédération')?.value || '',
    updatedAt: serverTimestamp()
  };
  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.arbitres, docId), data);
      showToast('✅ Arbitre mis à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.arbitres), { ...data, createdAt: serverTimestamp() });
      showToast('✅ Arbitre enregistré');
    }
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
      const statusClass = data.statut === 'Actif' ? 'badge-success' : data.statut === 'Suspendu' ? 'badge-danger' : 'badge-warning';
      return `
        <div class="data-card">
          <div class="card-header">
            <h3>👨‍⚖️ ${data.prenom} ${data.nom}</h3>
            <span class="badge">${data.grade}</span>
          </div>
          <div class="card-content">
            <p><strong>Niveau:</strong> ${data.niveau}</p>
            <p><strong>Statut:</strong> <span class="badge ${statusClass}">${data.statut}</span></p>
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
    const natEl = document.getElementById('arbitre-nationalité');
    if (natEl) natEl.value = data.nationalité || 'Gabonaise';
    const fedEl = document.getElementById('arbitre-fédération');
    if (fedEl && data.fédération) fedEl.value = data.fédération;
    document.querySelector('#arbitre-modal .form-modal-title').textContent = 'Modifier arbitre';
    document.getElementById('arbitre-modal').classList.remove('hidden');
  } catch (e) { showToast('Erreur chargement', 'error'); }
}

async function deleteArbitre(id) {
  if (!confirm('Supprimer cet arbitre ?')) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.arbitres, id));
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

// Splash screen auto-hide
window.addEventListener('load', () => {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    setTimeout(() => {
      if (!currentUser) splash.classList.add('hidden');
    }, 2500);
  }
});
