// ============================================================
// app.js — Gabon Sport Connect v2.0
// Rôles avancés : Super Admin, Fédération, Club, Joueur, Arbitre, Organisation
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
          currentUserData = { role: 'joueur', email: user.email };
        }
      } catch (e) {
        currentRole = 'joueur';
        currentUserData = { role: 'joueur', email: user.email };
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
}

function showDashboard(user) {
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');

  const email = user.email || '';
  const initials = email.slice(0, 2).toUpperCase();
  document.getElementById('user-avatar-text').textContent = initials;
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
  
  // Masquer/afficher selon le rôle
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
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    document.getElementById('auth-modal').classList.add('hidden');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

document.getElementById('register-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const nom = document.getElementById('reg-nom').value;
  const role = document.getElementById('reg-role').value;
  
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, COLLECTIONS.users, userCred.user.uid), {
      role: role,
      email: email,
      nom: nom,
      createdAt: serverTimestamp()
    });
    showToast('Inscription réussie !');
    document.getElementById('auth-modal').classList.add('hidden');
  } catch (error) {
    showToast(error.message, 'error');
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

  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${view}`)?.classList.remove('hidden');

  // Mettre à jour le titre
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
  document.getElementById('content-title').textContent = titles[view] || 'Accueil';

  // Charger les données appropriées
  if (view === 'accueil') {
    loadDashboardStats();
  } else if (view === 'fédérations') {
    loadFederations();
  } else if (view === 'clubs') {
    loadClubs();
  } else if (view === 'joueurs' || view === 'féminin') {
    loadJoueurs(view === 'féminin' ? 'Féminin' : null);
  } else if (view === 'amateur') {
    loadJoueurs('Amateur');
  } else if (view === 'arbitres') {
    loadArbitres();
  } else if (view === 'compétitions') {
    loadCompetences();
  } else if (view === 'actualités') {
    loadActualites();
  }
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    navigateTo(item.dataset.view);
  });
});

// ─── Dashboard Stats ─────────────────────────────────────────
async function loadDashboardStats() {
  try {
    const fedCount = (await getDocs(collection(db, COLLECTIONS.federations))).size;
    const clubCount = (await getDocs(collection(db, COLLECTIONS.clubs))).size;
    const jouCount = (await getDocs(collection(db, COLLECTIONS.joueurs))).size;
    const arbCount = (await getDocs(collection(db, COLLECTIONS.arbitres))).size;

    document.getElementById('stat-fédérations').textContent = fedCount;
    document.getElementById('stat-clubs').textContent = clubCount;
    document.getElementById('stat-joueurs').textContent = jouCount;
    document.getElementById('stat-arbitres').textContent = arbCount;
  } catch (e) {
    console.error('Erreur lors du chargement des stats', e);
  }
}

// ═════════════════════════════════════════════════════════════
// GESTION DES FÉDÉRATIONS
// ═════════════════════════════════════════════════════════════

document.getElementById('btn-add-federation')?.addEventListener('click', () => {
  document.getElementById('federation-id').value = '';
  document.getElementById('federation-form').reset();
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
  
  if (currentRole !== 'super-admin') {
    showToast('Accès refusé', 'error');
    return;
  }

  const docId = document.getElementById('federation-id').value;
  const data = {
    nom: document.getElementById('fed-nom').value,
    sport: document.getElementById('fed-sport').value,
    statut: document.getElementById('fed-statut').value,
    updatedAt: serverTimestamp()
  };

  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.federations, docId), data);
      showToast('Fédération mise à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.federations), {
        ...data,
        createdAt: serverTimestamp()
      });
      showToast('Fédération créée');
    }
    document.getElementById('federation-modal').classList.add('hidden');
    loadFederations();
  } catch (error) {
    showToast('Erreur : ' + error.message, 'error');
  }
});

async function loadFederations() {
  try {
    const qry = query(
      collection(db, COLLECTIONS.federations),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(qry);
    const container = document.getElementById('list-fédérations');
    
    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">Aucune fédération enregistrée</div>';
      return;
    }

    container.innerHTML = snapshot.docs.map(doc => {
      const data = doc.data();
      return `
        <div class="data-card">
          <div class="card-header">
            <h3>🏛️ ${data.nom}</h3>
            <span class="badge ${data.statut === 'Validée' ? 'badge-success' : 'badge-warning'}">${data.statut}</span>
          </div>
          <div class="card-content">
            <p><strong>Sport(s):</strong> ${data.sport}</p>
          </div>
          <div class="card-actions">
            ${currentRole === 'super-admin' ? `
              <button class="btn-small" onclick="editFederation('${doc.id}')">✏️ Éditer</button>
              <button class="btn-small btn-danger" onclick="deleteFederation('${doc.id}')">🗑️ Supprimer</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Erreur chargement fédérations', error);
  }
}

async function editFederation(id) {
  try {
    const doc_ref = await getDoc(doc(db, COLLECTIONS.federations, id));
    const data = doc_ref.data();
    document.getElementById('federation-id').value = id;
    document.getElementById('fed-nom').value = data.nom;
    document.getElementById('fed-sport').value = data.sport;
    document.getElementById('fed-statut').value = data.statut;
    document.getElementById('federation-modal').classList.remove('hidden');
  } catch (e) {
    console.error('Erreur édition fédération', e);
  }
}

async function deleteFederation(id) {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette fédération ?')) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.federations, id));
      showToast('Fédération supprimée');
      loadFederations();
    } catch (e) {
      showToast('Erreur suppression', 'error');
    }
  }
}

// ═════════════════════════════════════════════════════════════
// GESTION DES CLUBS
// ═════════════════════════════════════════════════════════════

document.getElementById('btn-add-club')?.addEventListener('click', async () => {
  // Charger les fédérations pour le dropdown
  const fedSnapshot = await getDocs(collection(db, COLLECTIONS.federations));
  const fedSelect = document.getElementById('club-fédération');
  fedSelect.innerHTML = '<option>-- Sélectionner une fédération --</option>';
  fedSnapshot.docs.forEach(doc => {
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = doc.data().nom;
    fedSelect.appendChild(opt);
  });

  document.getElementById('club-id').value = '';
  document.getElementById('club-form').reset();
  document.getElementById('club-modal').classList.remove('hidden');
});

document.getElementById('club-modal-close')?.addEventListener('click', () => {
  document.getElementById('club-modal').classList.add('hidden');
});

document.getElementById('club-modal-cancel')?.addEventListener('click', () => {
  document.getElementById('club-modal').classList.add('hidden');
});

document.getElementById('club-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  
  const docId = document.getElementById('club-id').value;
  const data = {
    nom: document.getElementById('club-nom').value,
    ville: document.getElementById('club-ville').value,
    sport: document.getElementById('club-sport').value,
    catégorie: document.getElementById('club-catégorie').value,
    genre: document.getElementById('club-genre').value,
    division: document.getElementById('club-division').value,
    updatedAt: serverTimestamp()
  };

  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.clubs, docId), data);
      showToast('Club mis à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.clubs), {
        ...data,
        createdAt: serverTimestamp()
      });
      showToast('Club créé');
    }
    document.getElementById('club-modal').classList.add('hidden');
    loadClubs();
  } catch (error) {
    showToast('Erreur : ' + error.message, 'error');
  }
});

async function loadClubs() {
  try {
    const qry = query(
      collection(db, COLLECTIONS.clubs),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(qry);
    const container = document.getElementById('list-clubs');
    
    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">Aucun club enregistré</div>';
      return;
    }

    container.innerHTML = snapshot.docs.map(doc => {
      const data = doc.data();
      return `
        <div class="data-card">
          <div class="card-header">
            <h3>🏟️ ${data.nom}</h3>
            <span class="badge">${data.division}</span>
          </div>
          <div class="card-content">
            <p><strong>Ville:</strong> ${data.ville}</p>
            <p><strong>Sport:</strong> ${data.sport}</p>
            <p><strong>Catégorie:</strong> ${data.catégorie} · ${data.genre}</p>
          </div>
          <div class="card-actions">
            ${currentRole === 'super-admin' ? `
              <button class="btn-small" onclick="editClub('${doc.id}')">✏️ Éditer</button>
              <button class="btn-small btn-danger" onclick="deleteClub('${doc.id}')">🗑️ Supprimer</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Erreur chargement clubs', error);
  }
}

async function editClub(id) {
  try {
    const doc_ref = await getDoc(doc(db, COLLECTIONS.clubs, id));
    const data = doc_ref.data();
    document.getElementById('club-id').value = id;
    document.getElementById('club-nom').value = data.nom;
    document.getElementById('club-ville').value = data.ville;
    document.getElementById('club-sport').value = data.sport;
    document.getElementById('club-division').value = data.division;
    document.getElementById('club-modal').classList.remove('hidden');
  } catch (e) {
    console.error('Erreur édition club', e);
  }
}

async function deleteClub(id) {
  if (confirm('Êtes-vous sûr ?')) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.clubs, id));
      showToast('Club supprimé');
      loadClubs();
    } catch (e) {
      showToast('Erreur suppression', 'error');
    }
  }
}

// ═════════════════════════════════════════════════════════════
// GESTION DES JOUEURS
// ═════════════════════════════════════════════════════════════

document.getElementById('btn-add-joueur')?.addEventListener('click', async () => {
  // Charger les clubs
  const clubSnapshot = await getDocs(collection(db, COLLECTIONS.clubs));
  const clubSelect = document.getElementById('joueur-club');
  clubSelect.innerHTML = '<option>-- Sélectionner un club --</option>';
  clubSnapshot.docs.forEach(doc => {
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = doc.data().nom;
    clubSelect.appendChild(opt);
  });

  document.getElementById('joueur-id').value = '';
  document.getElementById('joueur-form').reset();
  document.getElementById('joueur-modal').classList.remove('hidden');
});

document.getElementById('joueur-modal-close')?.addEventListener('click', () => {
  document.getElementById('joueur-modal').classList.add('hidden');
});

document.getElementById('joueur-modal-cancel')?.addEventListener('click', () => {
  document.getElementById('joueur-modal').classList.add('hidden');
});

document.getElementById('joueur-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  
  const docId = document.getElementById('joueur-id').value;
  const data = {
    nom: document.getElementById('joueur-nom').value,
    prenom: document.getElementById('joueur-prenom').value,
    dateNaissance: document.getElementById('joueur-date-naissance').value,
    nationalité: document.getElementById('joueur-nationalité').value,
    position: document.getElementById('joueur-position').value,
    club: document.getElementById('joueur-club').value,
    statut: document.getElementById('joueur-statut').value,
    genre: document.getElementById('joueur-genre')?.value || 'Masculin',
    updatedAt: serverTimestamp()
  };

  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.joueurs, docId), data);
      showToast('Joueur mis à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.joueurs), {
        ...data,
        createdAt: serverTimestamp()
      });
      showToast('Joueur créé');
    }
    document.getElementById('joueur-modal').classList.add('hidden');
    loadJoueurs();
  } catch (error) {
    showToast('Erreur : ' + error.message, 'error');
  }
});

async function loadJoueurs(filter = null) {
  try {
    let qry;
    if (filter === 'Féminin') {
      qry = query(
        collection(db, COLLECTIONS.joueurs),
        where('genre', '==', 'Féminin'),
        orderBy('createdAt', 'desc')
      );
    } else if (filter === 'Amateur') {
      qry = query(
        collection(db, COLLECTIONS.joueurs),
        orderBy('createdAt', 'desc')
      );
    } else {
      qry = query(
        collection(db, COLLECTIONS.joueurs),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(qry);
    const container = document.getElementById('list-joueurs') || document.getElementById('list-féminin') || document.getElementById('list-amateur');
    
    if (!container) return;
    
    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">Aucun joueur enregistré</div>';
      return;
    }

    container.innerHTML = snapshot.docs.map(doc => {
      const data = doc.data();
      return `
        <div class="data-card">
          <div class="card-header">
            <h3>⚽ ${data.prenom} ${data.nom}</h3>
            <span class="badge">${data.statut}</span>
          </div>
          <div class="card-content">
            <p><strong>Position:</strong> ${data.position}</p>
            <p><strong>Nationalité:</strong> ${data.nationalité}</p>
            <p><strong>Date naissance:</strong> ${data.dateNaissance}</p>
          </div>
          <div class="card-actions">
            <button class="btn-small" onclick="editJoueur('${doc.id}')">✏️ Éditer</button>
            <button class="btn-small btn-danger" onclick="deleteJoueur('${doc.id}')">🗑️ Supprimer</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Erreur chargement joueurs', error);
  }
}

async function editJoueur(id) {
  try {
    const doc_ref = await getDoc(doc(db, COLLECTIONS.joueurs, id));
    const data = doc_ref.data();
    document.getElementById('joueur-id').value = id;
    document.getElementById('joueur-nom').value = data.nom;
    document.getElementById('joueur-prenom').value = data.prenom;
    document.getElementById('joueur-position').value = data.position;
    document.getElementById('joueur-statut').value = data.statut;
    document.getElementById('joueur-modal').classList.remove('hidden');
  } catch (e) {
    console.error('Erreur édition joueur', e);
  }
}

async function deleteJoueur(id) {
  if (confirm('Êtes-vous sûr ?')) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.joueurs, id));
      showToast('Joueur supprimé');
      loadJoueurs();
    } catch (e) {
      showToast('Erreur suppression', 'error');
    }
  }
}

// ═════════════════════════════════════════════════════════════
// GESTION DES ARBITRES
// ═════════════════════════════════════════════════════════════

document.getElementById('btn-add-arbitre')?.addEventListener('click', async () => {
  const fedSnapshot = await getDocs(collection(db, COLLECTIONS.federations));
  const fedSelect = document.getElementById('arbitre-fédération');
  fedSelect.innerHTML = '<option>-- Sélectionner une fédération --</option>';
  fedSnapshot.docs.forEach(doc => {
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = doc.data().nom;
    fedSelect.appendChild(opt);
  });

  document.getElementById('arbitre-id').value = '';
  document.getElementById('arbitre-form').reset();
  document.getElementById('arbitre-modal').classList.remove('hidden');
});

document.getElementById('arbitre-modal-close')?.addEventListener('click', () => {
  document.getElementById('arbitre-modal').classList.add('hidden');
});

document.getElementById('arbitre-modal-cancel')?.addEventListener('click', () => {
  document.getElementById('arbitre-modal').classList.add('hidden');
});

document.getElementById('arbitre-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  
  const docId = document.getElementById('arbitre-id').value;
  const data = {
    nom: document.getElementById('arbitre-nom').value,
    prenom: document.getElementById('arbitre-prenom').value,
    grade: document.getElementById('arbitre-grade').value,
    niveau: document.getElementById('arbitre-niveau').value,
    statut: document.getElementById('arbitre-statut').value,
    updatedAt: serverTimestamp()
  };

  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.arbitres, docId), data);
      showToast('Arbitre mis à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.arbitres), {
        ...data,
        createdAt: serverTimestamp()
      });
      showToast('Arbitre créé');
    }
    document.getElementById('arbitre-modal').classList.add('hidden');
    loadArbitres();
  } catch (error) {
    showToast('Erreur : ' + error.message, 'error');
  }
});

async function loadArbitres() {
  try {
    const qry = query(
      collection(db, COLLECTIONS.arbitres),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(qry);
    const container = document.getElementById('list-arbitres');
    
    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">Aucun arbitre enregistré</div>';
      return;
    }

    container.innerHTML = snapshot.docs.map(doc => {
      const data = doc.data();
      return `
        <div class="data-card">
          <div class="card-header">
            <h3>👨‍⚖️ ${data.prenom} ${data.nom}</h3>
            <span class="badge">${data.grade}</span>
          </div>
          <div class="card-content">
            <p><strong>Niveau:</strong> ${data.niveau}</p>
            <p><strong>Statut:</strong> ${data.statut}</p>
          </div>
          <div class="card-actions">
            <button class="btn-small" onclick="editArbitre('${doc.id}')">✏️ Éditer</button>
            <button class="btn-small btn-danger" onclick="deleteArbitre('${doc.id}')">🗑️ Supprimer</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Erreur chargement arbitres', error);
  }
}

async function editArbitre(id) {
  try {
    const doc_ref = await getDoc(doc(db, COLLECTIONS.arbitres, id));
    const data = doc_ref.data();
    document.getElementById('arbitre-id').value = id;
    document.getElementById('arbitre-nom').value = data.nom;
    document.getElementById('arbitre-prenom').value = data.prenom;
    document.getElementById('arbitre-grade').value = data.grade;
    document.getElementById('arbitre-modal').classList.remove('hidden');
  } catch (e) {
    console.error('Erreur édition arbitre', e);
  }
}

async function deleteArbitre(id) {
  if (confirm('Êtes-vous sûr ?')) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.arbitres, id));
      showToast('Arbitre supprimé');
      loadArbitres();
    } catch (e) {
      showToast('Erreur suppression', 'error');
    }
  }
}

// ═════════════════════════════════════════════════════════════
// GESTION DES COMPÉTITIONS
// ═════════════════════════════════════════════════════════════

document.getElementById('btn-add-comp')?.addEventListener('click', async () => {
  const fedSnapshot = await getDocs(collection(db, COLLECTIONS.federations));
  const fedSelect = document.getElementById('comp-fédération');
  fedSelect.innerHTML = '<option>-- Sélectionner une fédération --</option>';
  fedSnapshot.docs.forEach(doc => {
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = doc.data().nom;
    fedSelect.appendChild(opt);
  });

  const arbSnapshot = await getDocs(collection(db, COLLECTIONS.arbitres));
  const arbSelect = document.getElementById('comp-arbitre-assigné');
  arbSelect.innerHTML = '<option>-- Aucun assigné --</option>';
  arbSnapshot.docs.forEach(doc => {
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = `${doc.data().prenom} ${doc.data().nom}`;
    arbSelect.appendChild(opt);
  });

  document.getElementById('comp-id').value = '';
  document.getElementById('comp-form').reset();
  document.getElementById('comp-modal').classList.remove('hidden');
});

document.getElementById('comp-modal-close')?.addEventListener('click', () => {
  document.getElementById('comp-modal').classList.add('hidden');
});

document.getElementById('comp-modal-cancel')?.addEventListener('click', () => {
  document.getElementById('comp-modal').classList.add('hidden');
});

document.getElementById('comp-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  
  const docId = document.getElementById('comp-id').value;
  const data = {
    nom: document.getElementById('comp-nom').value,
    sport: document.getElementById('comp-sport').value,
    saison: document.getElementById('comp-saison').value,
    dateDebut: document.getElementById('comp-date-debut').value,
    dateFin: document.getElementById('comp-date-fin').value,
    statut: document.getElementById('comp-statut').value,
    updatedAt: serverTimestamp()
  };

  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.competences, docId), data);
      showToast('Compétition mise à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.competences), {
        ...data,
        createdAt: serverTimestamp()
      });
      showToast('Compétition créée');
    }
    document.getElementById('comp-modal').classList.add('hidden');
    loadCompetences();
  } catch (error) {
    showToast('Erreur : ' + error.message, 'error');
  }
});

async function loadCompetences() {
  try {
    const qry = query(
      collection(db, COLLECTIONS.competences),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(qry);
    const container = document.getElementById('list-compétitions');
    
    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">Aucune compétition enregistrée</div>';
      return;
    }

    container.innerHTML = snapshot.docs.map(doc => {
      const data = doc.data();
      return `
        <div class="data-card">
          <div class="card-header">
            <h3>🏆 ${data.nom}</h3>
            <span class="badge">${data.statut}</span>
          </div>
          <div class="card-content">
            <p><strong>Saison:</strong> ${data.saison}</p>
            <p><strong>Sport:</strong> ${data.sport}</p>
            <p><strong>Dates:</strong> ${data.dateDebut} au ${data.dateFin}</p>
          </div>
          <div class="card-actions">
            <button class="btn-small" onclick="editComp('${doc.id}')">✏️ Éditer</button>
            <button class="btn-small btn-danger" onclick="deleteComp('${doc.id}')">🗑️ Supprimer</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Erreur chargement compétitions', error);
  }
}

async function editComp(id) {
  try {
    const doc_ref = await getDoc(doc(db, COLLECTIONS.competences, id));
    const data = doc_ref.data();
    document.getElementById('comp-id').value = id;
    document.getElementById('comp-nom').value = data.nom;
    document.getElementById('comp-sport').value = data.sport;
    document.getElementById('comp-saison').value = data.saison;
    document.getElementById('comp-modal').classList.remove('hidden');
  } catch (e) {
    console.error('Erreur édition compétition', e);
  }
}

async function deleteComp(id) {
  if (confirm('Êtes-vous sûr ?')) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.competences, id));
      showToast('Compétition supprimée');
      loadCompetences();
    } catch (e) {
      showToast('Erreur suppression', 'error');
    }
  }
}

// ═════════════════════════════════════════════════════════════
// GESTION DES ACTUALITÉS
// ═════════════════════════════════════════════════════════════

document.getElementById('btn-add-news')?.addEventListener('click', () => {
  document.getElementById('news-id').value = '';
  document.getElementById('news-form').reset();
  document.getElementById('news-modal').classList.remove('hidden');
});

document.getElementById('news-modal-close')?.addEventListener('click', () => {
  document.getElementById('news-modal').classList.add('hidden');
});

document.getElementById('news-modal-cancel')?.addEventListener('click', () => {
  document.getElementById('news-modal').classList.add('hidden');
});

document.getElementById('news-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  
  const docId = document.getElementById('news-id').value;
  const data = {
    titre: document.getElementById('news-titre').value,
    categorie: document.getElementById('news-categorie').value,
    contenu: document.getElementById('news-contenu').value,
    auteur: currentUserData.nom || currentUser.email,
    updatedAt: serverTimestamp()
  };

  try {
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.actualites, docId), data);
      showToast('Article mis à jour');
    } else {
      await addDoc(collection(db, COLLECTIONS.actualites), {
        ...data,
        createdAt: serverTimestamp()
      });
      showToast('Article publié');
    }
    document.getElementById('news-modal').classList.add('hidden');
    loadActualites();
  } catch (error) {
    showToast('Erreur : ' + error.message, 'error');
  }
});

async function loadActualites() {
  try {
    const qry = query(
      collection(db, COLLECTIONS.actualites),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(qry);
    const container = document.getElementById('list-actualités');
    
    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">Aucune actualité publiée</div>';
      return;
    }

    container.innerHTML = snapshot.docs.map(doc => {
      const data = doc.data();
      return `
        <div class="data-card">
          <div class="card-header">
            <h3>📰 ${data.titre}</h3>
            <span class="badge">${data.categorie}</span>
          </div>
          <div class="card-content">
            <p>${data.contenu.substring(0, 100)}...</p>
            <small>Par ${data.auteur}</small>
          </div>
          <div class="card-actions">
            ${currentRole === 'super-admin' || data.auteur === currentUser.email ? `
              <button class="btn-small" onclick="editNews('${doc.id}')">✏️ Éditer</button>
              <button class="btn-small btn-danger" onclick="deleteNews('${doc.id}')">🗑️ Supprimer</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Erreur chargement actualités', error);
  }
}

async function editNews(id) {
  try {
    const doc_ref = await getDoc(doc(db, COLLECTIONS.actualites, id));
    const data = doc_ref.data();
    document.getElementById('news-id').value = id;
    document.getElementById('news-titre').value = data.titre;
    document.getElementById('news-categorie').value = data.categorie;
    document.getElementById('news-contenu').value = data.contenu;
    document.getElementById('news-modal').classList.remove('hidden');
  } catch (e) {
    console.error('Erreur édition news', e);
  }
}

async function deleteNews(id) {
  if (confirm('Êtes-vous sûr ?')) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.actualites, id));
      showToast('Article supprimé');
      loadActualites();
    } catch (e) {
      showToast('Erreur suppression', 'error');
    }
  }
}

// ═════════════════════════════════════════════════════════════
// RAPPORTS IMPRIMABLES
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
  const userAdmin = currentUserData.nom || 'Administrateur';

  let title, content = '';

  const headerHtml = `
    <div style="text-align:center;margin-bottom:30px;border-bottom:3px solid #009E60;padding-bottom:20px;">
      <h1 style="margin:0;color:#009E60;">🇬🇦 GABON SPORT CONNECT</h1>
      <p style="margin:5px 0;font-weight:bold;">Ministère des Sports du Gabon</p>
      <p style="margin:0;color:#666;">Rapport officiel du ${dateStr}</p>
    </div>
  `;

  const footerHtml = `
    <div style="border-top:1px solid #ddd;margin-top:40px;padding-top:20px;font-size:0.85rem;color:#666;text-align:center;">
      <p>📊 Document généré par : <strong>${userAdmin}</strong></p>
      <p>⏰ Horodatage : ${now.toLocaleString('fr-FR')}</p>
      <p style="color:#009E60;font-weight:bold;">Cachet numérique Gabon Sport Connect</p>
    </div>
  `;

  if (type === 'fédérations') {
    title = 'Rapport : Fédérations Nationales';
  } else if (type === 'clubs') {
    title = 'Rapport : Clubs Sportifs';
  } else if (type === 'joueurs') {
    title = 'Rapport : Joueurs Enregistrés';
  } else if (type === 'arbitres') {
    title = 'Rapport : Arbitres Certifiés';
  } else if (type === 'compétitions') {
    title = 'Rapport : Compétitions';
  } else if (type === 'féminin') {
    title = 'Rapport : État du Football Féminin National';
  }

  const printWindow = window.open('', '', 'height=700,width=900');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1, h2 { color: #009E60; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f1f5f9; padding: 10px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
        td { padding: 8px; border: 1px solid #ddd; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; }
        .badge-success { background: #86efac; color: #166534; }
        .badge-warning { background: #fcd34d; color: #854d0e; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      ${headerHtml}
      <h2>${title}</h2>
      <div id="content"></div>
      ${footerHtml}
      <button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#009E60;color:white;border:none;border-radius:5px;cursor:pointer;">🖨️ Imprimer</button>
    </body>
    </html>
  `);

  // Charger les données et remplir le rapport
  loadReportData(type, printWindow);
}

async function loadReportData(type, printWindow) {
  try {
    if (type === 'fédérations') {
      const docs = await getDocs(collection(db, COLLECTIONS.federations));
      let html = '<table><tr><th>Fédération</th><th>Sport</th><th>Statut</th></tr>';
      docs.forEach(doc => {
        const data = doc.data();
        html += `<tr>
          <td>${data.nom}</td>
          <td>${data.sport}</td>
          <td><span class="badge ${data.statut === 'Validée' ? 'badge-success' : 'badge-warning'}">${data.statut}</span></td>
        </tr>`;
      });
      html += '</table>';
      printWindow.document.getElementById('content').innerHTML = html;
    }
    // Ajouter d'autres types de rapports de manière similaire
  } catch (e) {
    console.error('Erreur génération rapport', e);
  }
}

// Footer login links
document.getElementById('footer-login-link')?.addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('auth-modal').classList.remove('hidden');
});
