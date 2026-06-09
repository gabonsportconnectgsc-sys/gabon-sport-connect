// ============================================================
// app.js — Gabon Sport Connect
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
  doc, updateDoc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Toast ──────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3600);
}

// ─── Auth state ──────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  if (user) {
    showDashboard(user);
  } else {
    showLanding();
  }
});

function showLanding() {
  document.getElementById('landing').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard(user) {
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  // Update user info in sidebar
  const email = user.email || '';
  const initials = email.slice(0, 2).toUpperCase();
  document.getElementById('user-avatar-text').textContent = initials;
  document.getElementById('user-name-text').textContent = email.split('@')[0];
  document.getElementById('user-email-text').textContent = email;
  // Load default panel
  navigateTo('accueil');
  loadAllCounts();
}

// ─── Auth Modal ──────────────────────────────────────────────
const authModal    = document.getElementById('auth-modal');
const loginForm    = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

document.getElementById('btn-open-login').addEventListener('click', () => {
  authModal.classList.remove('hidden');
  switchTab('login');
});
document.getElementById('btn-hero-start').addEventListener('click', () => {
  authModal.classList.remove('hidden');
  switchTab('register');
});
document.getElementById('modal-close').addEventListener('click', () => {
  authModal.classList.add('hidden');
});
authModal.addEventListener('click', e => {
  if (e.target === authModal) authModal.classList.add('hidden');
});

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  loginForm.classList.toggle('hidden', tab !== 'login');
  registerForm.classList.toggle('hidden', tab !== 'register');
  document.querySelector('.modal-title').textContent =
    tab === 'login' ? 'Connexion' : 'Créer un compte';
}

// Login
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const btn   = loginForm.querySelector('.btn-submit');
  const email = document.getElementById('login-email').value;
  const pass  = document.getElementById('login-pass').value;
  const err   = document.getElementById('login-error');
  err.textContent = '';
  btn.disabled = true; btn.textContent = 'Connexion…';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    authModal.classList.add('hidden');
    showToast('Bienvenue sur Gabon Sport Connect !');
  } catch (error) {
    err.textContent = firebaseError(error.code);
  }
  btn.disabled = false; btn.textContent = 'Se connecter';
});

// Register
registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const btn   = registerForm.querySelector('.btn-submit');
  const email = document.getElementById('reg-email').value;
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  const err   = document.getElementById('reg-error');
  err.textContent = '';
  if (pass !== pass2) { err.textContent = 'Les mots de passe ne correspondent pas.'; return; }
  btn.disabled = true; btn.textContent = 'Création…';
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    authModal.classList.add('hidden');
    showToast('Compte créé avec succès !');
  } catch (error) {
    err.textContent = firebaseError(error.code);
  }
  btn.disabled = false; btn.textContent = 'Créer mon compte';
});

// Logout
document.getElementById('btn-logout').addEventListener('click', async () => {
  await signOut(auth);
  showToast('Déconnexion réussie.', 'info');
});

function firebaseError(code) {
  const map = {
    'auth/user-not-found':       'Aucun compte avec cet email.',
    'auth/wrong-password':       'Mot de passe incorrect.',
    'auth/email-already-in-use': 'Cet email est déjà utilisé.',
    'auth/weak-password':        'Mot de passe trop court (min. 6 caractères).',
    'auth/invalid-email':        'Adresse email invalide.',
    'auth/too-many-requests':    'Trop de tentatives. Réessayez plus tard.',
    'auth/invalid-credential':   'Email ou mot de passe incorrect.',
  };
  return map[code] || `Erreur : ${code}`;
}

// ─── Navigation ───────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
  item.addEventListener('click', () => {
    navigateTo(item.dataset.panel);
    closeSidebar();
  });
});

function navigateTo(panel) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.panel === panel));
  document.querySelectorAll('.page-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${panel}`));
  // Update topbar title
  const titles = {
    accueil:      ['Tableau de bord',  'Vue d\'ensemble de la plateforme'],
    joueurs:      ['Gestion des joueurs', 'Ajouter, modifier et suivre les joueurs'],
    clubs:        ['Gestion des clubs',   'Gérer les clubs sportifs'],
    competitions: ['Compétitions',        'Organiser et suivre les compétitions'],
    actualites:   ['Actualités',          'Publier et gérer les actualités'],
  };
  if (titles[panel]) {
    document.getElementById('topbar-title').textContent    = titles[panel][0];
    document.getElementById('topbar-subtitle').textContent = titles[panel][1];
  }
  // Load data
  if (panel === 'joueurs')      loadJoueurs();
  if (panel === 'clubs')        loadClubs();
  if (panel === 'competitions') loadCompetitions();
  if (panel === 'actualites')   loadActualites();
  if (panel === 'accueil')      loadAllCounts();
}

// ─── Mobile sidebar ───────────────────────────────────────────
document.getElementById('hamburger-btn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('visible');
});
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
}
document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

// ─── Navbar scroll ───────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.querySelector('.navbar')?.classList.toggle('scrolled', window.scrollY > 20);
});

// ═══════════════════════════════════════════════════════════════
// JOUEURS
// ═══════════════════════════════════════════════════════════════
const joueursColl = () => collection(db, 'joueurs');

async function loadJoueurs() {
  const tbody = document.getElementById('joueurs-tbody');
  tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">⏳</div><div>Chargement…</div></td></tr>`;
  try {
    const snap = await getDocs(query(joueursColl(), orderBy('createdAt', 'desc')));
    if (snap.empty) {
      tbody.innerHTML = emptyRow(6, '⚽', 'Aucun joueur enregistré', 'Ajoutez votre premier joueur.');
      document.getElementById('count-joueurs').textContent = '0';
      return;
    }
    document.getElementById('count-joueurs').textContent = snap.size;
    tbody.innerHTML = '';
    snap.forEach(docSnap => {
      const d = docSnap.data();
      tbody.innerHTML += `
        <tr>
          <td><strong>${d.nom || '—'}</strong></td>
          <td>${d.prenom || '—'}</td>
          <td>${d.position || '—'}</td>
          <td>${d.club || '—'}</td>
          <td>${d.nationalite || '—'}</td>
          <td>
            <span class="badge badge-${d.statut === 'Actif' ? 'green' : 'gray'}">${d.statut || 'Actif'}</span>
            <button class="action-btn action-edit"    onclick="editJoueur('${docSnap.id}')">✏️</button>
            <button class="action-btn action-delete"  onclick="deleteItem('joueurs','${docSnap.id}', loadJoueurs)">🗑️</button>
          </td>
        </tr>`;
    });
  } catch (e) {
    tbody.innerHTML = emptyRow(6, '❌', 'Erreur de chargement', e.message);
  }
}

document.getElementById('btn-add-joueur').addEventListener('click', () => openJoueurModal());

function openJoueurModal(id = null, data = {}) {
  const modal = document.getElementById('joueur-modal');
  const title = document.getElementById('joueur-modal-title');
  title.textContent = id ? 'Modifier le joueur' : 'Ajouter un joueur';
  document.getElementById('joueur-id').value         = id || '';
  document.getElementById('joueur-nom').value        = data.nom        || '';
  document.getElementById('joueur-prenom').value     = data.prenom     || '';
  document.getElementById('joueur-position').value   = data.position   || '';
  document.getElementById('joueur-club').value       = data.club       || '';
  document.getElementById('joueur-nationalite').value= data.nationalite|| 'Gabonaise';
  document.getElementById('joueur-statut').value     = data.statut     || 'Actif';
  modal.classList.remove('hidden');
}

document.getElementById('joueur-modal-close').addEventListener('click',  () => document.getElementById('joueur-modal').classList.add('hidden'));
document.getElementById('joueur-modal-cancel').addEventListener('click', () => document.getElementById('joueur-modal').classList.add('hidden'));

document.getElementById('joueur-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id    = document.getElementById('joueur-id').value;
  const data  = {
    nom:         document.getElementById('joueur-nom').value.trim(),
    prenom:      document.getElementById('joueur-prenom').value.trim(),
    position:    document.getElementById('joueur-position').value,
    club:        document.getElementById('joueur-club').value.trim(),
    nationalite: document.getElementById('joueur-nationalite').value.trim(),
    statut:      document.getElementById('joueur-statut').value,
  };
  try {
    if (id) {
      await updateDoc(doc(db, 'joueurs', id), data);
      showToast('Joueur modifié.');
    } else {
      await addDoc(joueursColl(), { ...data, createdAt: serverTimestamp() });
      showToast('Joueur ajouté.');
    }
    document.getElementById('joueur-modal').classList.add('hidden');
    loadJoueurs();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

window.editJoueur = async (id) => {
  const snap = await getDocs(joueursColl());
  snap.forEach(d => { if (d.id === id) openJoueurModal(id, d.data()); });
};

// ═══════════════════════════════════════════════════════════════
// CLUBS
// ═══════════════════════════════════════════════════════════════
const clubsColl = () => collection(db, 'clubs');

async function loadClubs() {
  const tbody = document.getElementById('clubs-tbody');
  tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><div class="empty-state-icon">⏳</div><div>Chargement…</div></td></tr>`;
  try {
    const snap = await getDocs(query(clubsColl(), orderBy('createdAt', 'desc')));
    if (snap.empty) {
      tbody.innerHTML = emptyRow(5, '🏟️', 'Aucun club enregistré', 'Ajoutez votre premier club.');
      document.getElementById('count-clubs').textContent = '0';
      return;
    }
    document.getElementById('count-clubs').textContent = snap.size;
    tbody.innerHTML = '';
    snap.forEach(docSnap => {
      const d = docSnap.data();
      tbody.innerHTML += `
        <tr>
          <td><strong>${d.nom || '—'}</strong></td>
          <td>${d.ville || '—'}</td>
          <td>${d.sport || '—'}</td>
          <td><span class="badge badge-${d.division === 'D1' ? 'green' : d.division === 'D2' ? 'blue' : 'gray'}">${d.division || '—'}</span></td>
          <td>
            <button class="action-btn action-edit"   onclick="editClub('${docSnap.id}')">✏️</button>
            <button class="action-btn action-delete" onclick="deleteItem('clubs','${docSnap.id}', loadClubs)">🗑️</button>
          </td>
        </tr>`;
    });
  } catch (e) {
    tbody.innerHTML = emptyRow(5, '❌', 'Erreur de chargement', e.message);
  }
}

document.getElementById('btn-add-club').addEventListener('click', () => openClubModal());

function openClubModal(id = null, data = {}) {
  const modal = document.getElementById('club-modal');
  document.getElementById('club-modal-title').textContent = id ? 'Modifier le club' : 'Ajouter un club';
  document.getElementById('club-id').value       = id || '';
  document.getElementById('club-nom').value      = data.nom      || '';
  document.getElementById('club-ville').value    = data.ville    || '';
  document.getElementById('club-sport').value    = data.sport    || 'Football';
  document.getElementById('club-division').value = data.division || 'D1';
  document.getElementById('club-annee').value    = data.annee    || '';
  modal.classList.remove('hidden');
}

document.getElementById('club-modal-close').addEventListener('click',  () => document.getElementById('club-modal').classList.add('hidden'));
document.getElementById('club-modal-cancel').addEventListener('click', () => document.getElementById('club-modal').classList.add('hidden'));

document.getElementById('club-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id   = document.getElementById('club-id').value;
  const data = {
    nom:      document.getElementById('club-nom').value.trim(),
    ville:    document.getElementById('club-ville').value.trim(),
    sport:    document.getElementById('club-sport').value,
    division: document.getElementById('club-division').value,
    annee:    document.getElementById('club-annee').value.trim(),
  };
  try {
    if (id) {
      await updateDoc(doc(db, 'clubs', id), data);
      showToast('Club modifié.');
    } else {
      await addDoc(clubsColl(), { ...data, createdAt: serverTimestamp() });
      showToast('Club ajouté.');
    }
    document.getElementById('club-modal').classList.add('hidden');
    loadClubs();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

window.editClub = async (id) => {
  const snap = await getDocs(clubsColl());
  snap.forEach(d => { if (d.id === id) openClubModal(id, d.data()); });
};

// ═══════════════════════════════════════════════════════════════
// COMPÉTITIONS
// ═══════════════════════════════════════════════════════════════
const compColl = () => collection(db, 'competitions');

async function loadCompetitions() {
  const tbody = document.getElementById('comp-tbody');
  tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">⏳</div><div>Chargement…</div></td></tr>`;
  try {
    const snap = await getDocs(query(compColl(), orderBy('createdAt', 'desc')));
    if (snap.empty) {
      tbody.innerHTML = emptyRow(6, '🏆', 'Aucune compétition', 'Créez votre première compétition.');
      document.getElementById('count-competitions').textContent = '0';
      return;
    }
    document.getElementById('count-competitions').textContent = snap.size;
    tbody.innerHTML = '';
    const statusColor = { 'En cours': 'green', 'À venir': 'blue', 'Terminée': 'gray', 'Suspendue': 'red' };
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const col = statusColor[d.statut] || 'gray';
      tbody.innerHTML += `
        <tr>
          <td><strong>${d.nom || '—'}</strong></td>
          <td>${d.sport || '—'}</td>
          <td>${d.saison || '—'}</td>
          <td>${d.dateDebut || '—'}</td>
          <td><span class="badge badge-${col}">${d.statut || '—'}</span></td>
          <td>
            <button class="action-btn action-edit"   onclick="editComp('${docSnap.id}')">✏️</button>
            <button class="action-btn action-delete" onclick="deleteItem('competitions','${docSnap.id}', loadCompetitions)">🗑️</button>
          </td>
        </tr>`;
    });
  } catch (e) {
    tbody.innerHTML = emptyRow(6, '❌', 'Erreur de chargement', e.message);
  }
}

document.getElementById('btn-add-comp').addEventListener('click', () => openCompModal());

function openCompModal(id = null, data = {}) {
  const modal = document.getElementById('comp-modal');
  document.getElementById('comp-modal-title').textContent = id ? 'Modifier la compétition' : 'Nouvelle compétition';
  document.getElementById('comp-id').value        = id || '';
  document.getElementById('comp-nom').value       = data.nom       || '';
  document.getElementById('comp-sport').value     = data.sport     || 'Football';
  document.getElementById('comp-saison').value    = data.saison    || '';
  document.getElementById('comp-date-debut').value= data.dateDebut || '';
  document.getElementById('comp-date-fin').value  = data.dateFin   || '';
  document.getElementById('comp-statut').value    = data.statut    || 'À venir';
  modal.classList.remove('hidden');
}

document.getElementById('comp-modal-close').addEventListener('click',  () => document.getElementById('comp-modal').classList.add('hidden'));
document.getElementById('comp-modal-cancel').addEventListener('click', () => document.getElementById('comp-modal').classList.add('hidden'));

document.getElementById('comp-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id   = document.getElementById('comp-id').value;
  const data = {
    nom:       document.getElementById('comp-nom').value.trim(),
    sport:     document.getElementById('comp-sport').value,
    saison:    document.getElementById('comp-saison').value.trim(),
    dateDebut: document.getElementById('comp-date-debut').value,
    dateFin:   document.getElementById('comp-date-fin').value,
    statut:    document.getElementById('comp-statut').value,
  };
  try {
    if (id) {
      await updateDoc(doc(db, 'competitions', id), data);
      showToast('Compétition modifiée.');
    } else {
      await addDoc(compColl(), { ...data, createdAt: serverTimestamp() });
      showToast('Compétition créée.');
    }
    document.getElementById('comp-modal').classList.add('hidden');
    loadCompetitions();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

window.editComp = async (id) => {
  const snap = await getDocs(compColl());
  snap.forEach(d => { if (d.id === id) openCompModal(id, d.data()); });
};

// ═══════════════════════════════════════════════════════════════
// ACTUALITÉS
// ═══════════════════════════════════════════════════════════════
const newsColl = () => collection(db, 'actualites');
const newsEmojis = { Football: '⚽', Basketball: '🏀', Athlétisme: '🏃', Natation: '🏊', Général: '📰' };

async function loadActualites() {
  const grid = document.getElementById('news-grid');
  grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏳</div><div>Chargement…</div></div>`;
  try {
    const snap = await getDocs(query(newsColl(), orderBy('createdAt', 'desc')));
    if (snap.empty) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📰</div><div class="empty-state-text">Aucune actualité</div><div class="empty-state-sub">Publiez votre premier article.</div></div>`;
      document.getElementById('count-news').textContent = '0';
      return;
    }
    document.getElementById('count-news').textContent = snap.size;
    grid.innerHTML = '';
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const emoji = newsEmojis[d.categorie] || '📰';
      const date  = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('fr-FR') : '—';
      grid.innerHTML += `
        <div class="news-card">
          <div class="news-card-img">${emoji}</div>
          <div class="news-card-body">
            <div class="news-card-cat">${d.categorie || 'Général'}</div>
            <div class="news-card-title">${d.titre || '—'}</div>
            <div class="news-card-date">📅 ${date}</div>
          </div>
          <div class="news-card-actions">
            <button class="action-btn action-edit"   onclick="editNews('${docSnap.id}')">✏️ Modifier</button>
            <button class="action-btn action-delete" onclick="deleteItem('actualites','${docSnap.id}', loadActualites)">🗑️</button>
          </div>
        </div>`;
    });
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><div>${e.message}</div></div>`;
  }
}

document.getElementById('btn-add-news').addEventListener('click', () => openNewsModal());

function openNewsModal(id = null, data = {}) {
  const modal = document.getElementById('news-modal');
  document.getElementById('news-modal-title').textContent = id ? 'Modifier l\'article' : 'Nouvel article';
  document.getElementById('news-id').value        = id || '';
  document.getElementById('news-titre').value     = data.titre     || '';
  document.getElementById('news-categorie').value = data.categorie || 'Général';
  document.getElementById('news-contenu').value   = data.contenu   || '';
  modal.classList.remove('hidden');
}

document.getElementById('news-modal-close').addEventListener('click',  () => document.getElementById('news-modal').classList.add('hidden'));
document.getElementById('news-modal-cancel').addEventListener('click', () => document.getElementById('news-modal').classList.add('hidden'));

document.getElementById('news-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id   = document.getElementById('news-id').value;
  const data = {
    titre:     document.getElementById('news-titre').value.trim(),
    categorie: document.getElementById('news-categorie').value,
    contenu:   document.getElementById('news-contenu').value.trim(),
  };
  try {
    if (id) {
      await updateDoc(doc(db, 'actualites', id), data);
      showToast('Article modifié.');
    } else {
      await addDoc(newsColl(), { ...data, createdAt: serverTimestamp() });
      showToast('Article publié.');
    }
    document.getElementById('news-modal').classList.add('hidden');
    loadActualites();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

window.editNews = async (id) => {
  const snap = await getDocs(newsColl());
  snap.forEach(d => { if (d.id === id) openNewsModal(id, d.data()); });
};

// ═══════════════════════════════════════════════════════════════
// UTILITAIRES PARTAGÉS
// ═══════════════════════════════════════════════════════════════
async function loadAllCounts() {
  const counts = [
    { coll: 'joueurs',      id: 'stat-joueurs' },
    { coll: 'clubs',        id: 'stat-clubs' },
    { coll: 'competitions', id: 'stat-competitions' },
    { coll: 'actualites',   id: 'stat-news' },
  ];
  for (const { coll: c, id } of counts) {
    try {
      const snap = await getDocs(collection(db, c));
      document.getElementById(id).textContent = snap.size;
    } catch { /* ignore */ }
  }
}

window.deleteItem = async (collName, id, reloadFn) => {
  if (!confirm('Confirmer la suppression ?')) return;
  try {
    await deleteDoc(doc(db, collName, id));
    showToast('Suppression effectuée.', 'info');
    reloadFn();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

function emptyRow(cols, icon, text, sub) {
  return `<tr><td colspan="${cols}">
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-text">${text}</div>
      <div class="empty-state-sub">${sub}</div>
    </div></td></tr>`;
}

// expose for inline onclick
window.loadJoueurs      = loadJoueurs;
window.loadClubs        = loadClubs;
window.loadCompetitions = loadCompetitions;
window.loadActualites   = loadActualites;
