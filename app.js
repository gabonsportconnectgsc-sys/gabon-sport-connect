// ============================================================
// app.js — Gabon Sport Connect — Système de rôles
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
let currentRole = null;  // 'admin' | 'club' | 'joueur'
let currentUserData = null;

const ADMIN_EMAIL = 'gabonsportconnectgsc@gmail.com'; // L'admin principal

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
    // Forcer admin si c'est l'email principal
    if (user.email === ADMIN_EMAIL) {
      currentRole = 'admin';
      currentUserData = { role: 'admin', email: user.email, nom: 'Administrateur' };
      // S'assurer que le doc existe dans Firestore
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, { role: 'admin', email: user.email, nom: 'Administrateur', createdAt: serverTimestamp() });
      }
    } else {
      // Charger le rôle depuis Firestore
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
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

  // Infos utilisateur dans la sidebar
  const email = user.email || '';
  const initials = email.slice(0, 2).toUpperCase();
  document.getElementById('user-avatar-text').textContent = initials;
  document.getElementById('user-name-text').textContent = currentUserData?.nom || email.split('@')[0];
  document.getElementById('user-email-text').textContent = email;

  // Appliquer le rôle à l'interface
  applyRoleUI();
  navigateTo('accueil');
}

// ─── Appliquer le rôle à l'interface ─────────────────────────
function applyRoleUI() {
  const role = currentRole;

  // Masquer/afficher les éléments selon le rôle
  document.querySelectorAll('.nav-admin-only').forEach(el => {
    el.classList.toggle('hidden', role !== 'admin');
  });
  document.querySelectorAll('.nav-club-only').forEach(el => {
    el.classList.toggle('hidden', role !== 'club');
  });
  document.querySelectorAll('.nav-joueur-only').forEach(el => {
    el.classList.toggle('hidden', role !== 'joueur');
  });
  document.querySelectorAll('.admin-only-block').forEach(el => {
    el.classList.toggle('hidden', role !== 'admin');
  });

  // Ajouter le menu utilisateurs pour admin
  const sidebar = document.querySelector('.sidebar-nav');
  const existingUsersItem = document.querySelector('[data-panel="utilisateurs"]');
  if (role === 'admin' && !existingUsersItem) {
    const label = document.createElement('div');
    label.className = 'nav-section-label';
    label.textContent = 'Administration';
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.panel = 'utilisateurs';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.innerHTML = '<span class="nav-icon">👥</span> Utilisateurs';
    item.addEventListener('click', () => { navigateTo('utilisateurs'); closeSidebar(); });
    sidebar.appendChild(label);
    sidebar.appendChild(item);
  }

  // Badge de rôle
  const roleLabels = { admin: '🛡️ Administrateur', club: '🏟️ Club', joueur: '⚽ Joueur' };
  const roleColors = { admin: '#009E60', club: '#3B82F6', joueur: '#F59E0B' };
  const badge = document.getElementById('user-role-badge');
  if (badge) {
    badge.textContent = roleLabels[role] || role;
    badge.style.cssText = `
      background:${roleColors[role] || '#64748B'}22;
      color:${roleColors[role] || '#64748B'};
      border:1px solid ${roleColors[role] || '#64748B'}44;
      padding:4px 10px; border-radius:20px; font-size:.75rem;
      font-weight:600; margin:6px 0 10px; display:inline-block;
    `;
  }
  const sidebarSub = document.getElementById('sidebar-role-label');
  if (sidebarSub) {
    const subs = { admin: 'Administration', club: 'Espace Club', joueur: 'Espace Joueur' };
    sidebarSub.textContent = subs[role] || '';
  }
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

// ─── Sélecteur de rôle à l'inscription ───────────────────────
document.querySelectorAll('.role-option').forEach(option => {
  option.addEventListener('click', () => {
    document.querySelectorAll('.role-option').forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
    option.querySelector('input').checked = true;
    const role = option.dataset.role;
    document.getElementById('reg-club-group').classList.toggle('hidden', role !== 'club');
    document.getElementById('reg-joueur-group').classList.toggle('hidden', role !== 'joueur');
  });
});

// ─── Login ───────────────────────────────────────────────────
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

// ─── Register avec rôle ──────────────────────────────────────
registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const btn   = registerForm.querySelector('.btn-submit');
  const email = document.getElementById('reg-email').value;
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  const err   = document.getElementById('reg-error');

  // Récupérer le rôle sélectionné
  const roleInput = registerForm.querySelector('input[name="reg-role"]:checked');
  let role = roleInput ? roleInput.value : null;

  err.textContent = '';

  if (pass !== pass2) { err.textContent = 'Les mots de passe ne correspondent pas.'; return; }
  if (!role) { err.textContent = 'Veuillez choisir un rôle.'; return; }

  // Sécurité : empêcher toute attribution du rôle admin via le formulaire
  if (role === 'admin') { role = 'joueur'; }

  btn.disabled = true; btn.textContent = 'Création…';
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    // Données supplémentaires selon le rôle
    const extraData = {};
    if (role === 'club') {
      extraData.nomClub = document.getElementById('reg-club-nom').value.trim() || '';
    }
    if (role === 'joueur') {
      extraData.nom = document.getElementById('reg-joueur-nom').value.trim() || '';
    }

    // Sauvegarder le profil dans Firestore
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      role,
      ...extraData,
      createdAt: serverTimestamp()
    });

    authModal.classList.add('hidden');
    showToast(`Compte ${role} créé avec succès !`);
  } catch (error) {
    err.textContent = firebaseError(error.code);
  }
  btn.disabled = false; btn.textContent = 'Créer mon compte';
});

// ─── Logout ──────────────────────────────────────────────────
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

  const titles = {
    accueil:      ['Tableau de bord',     'Vue d\'ensemble'],
    joueurs:      ['Joueurs',             'Gérer tous les joueurs'],
    clubs:        ['Clubs',               'Gérer tous les clubs'],
    competitions: ['Compétitions',        'Compétitions nationales'],
    actualites:   ['Actualités',          'Actualités sportives'],
    utilisateurs: ['Utilisateurs',        'Gérer les comptes'],
    'mon-club':   ['Mon Club',            'Informations de votre club'],
    'mes-joueurs':['Mes Joueurs',         'Joueurs de votre club'],
    'mon-profil': ['Mon Profil',          'Vos informations personnelles'],
  };
  if (titles[panel]) {
    document.getElementById('topbar-title').textContent    = titles[panel][0];
    document.getElementById('topbar-subtitle').textContent = titles[panel][1];
  }

  if (panel === 'joueurs')       loadJoueurs();
  if (panel === 'clubs')         loadClubs();
  if (panel === 'competitions')  loadCompetitions();
  if (panel === 'actualites')    loadActualites();
  if (panel === 'accueil')       loadAccueil();
  if (panel === 'utilisateurs')  loadUtilisateurs();
  if (panel === 'mon-club')      loadMonClub();
  if (panel === 'mes-joueurs')   loadMesJoueurs();
  if (panel === 'mon-profil')    loadMonProfil();
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
// ACCUEIL — message personnalisé selon le rôle
// ═══════════════════════════════════════════════════════════════
async function loadAccueil() {
  const role = currentRole;
  const roleLabels = { admin: '🛡️ Administrateur', club: '🏟️ Club', joueur: '⚽ Joueur' };
  const roleColors = { admin: '#009E60', club: '#3B82F6', joueur: '#F59E0B' };

  // Badge dans le welcome card
  const welcomeBadge = document.getElementById('welcome-role-badge');
  if (welcomeBadge) {
    welcomeBadge.innerHTML = `<span style="background:${roleColors[role]}22;color:${roleColors[role]};border:1px solid ${roleColors[role]}44;padding:5px 14px;border-radius:20px;font-size:.8rem;font-weight:700;">${roleLabels[role] || role}</span>`;
  }

  const welcomeTitle = document.getElementById('welcome-title');
  const welcomeSub   = document.getElementById('welcome-sub');
  const welcomeBody  = document.getElementById('welcome-body');

  const nom = currentUserData?.nom || currentUserData?.nomClub || currentUser?.email?.split('@')[0] || '';

  if (role === 'admin') {
    if (welcomeTitle) welcomeTitle.textContent = '🇬🇦 Tableau de bord Administrateur';
    if (welcomeSub)   welcomeSub.textContent   = 'Accès complet à toutes les fonctionnalités';
    if (welcomeBody)  welcomeBody.innerHTML    = `
      <p>Bienvenue <strong>${nom}</strong>. Vous avez accès à toutes les fonctionnalités :</p>
      <ul style="margin-top:12px;display:flex;flex-direction:column;gap:8px;padding-left:0;">
        <li>⚽ &nbsp;<strong>Joueurs</strong> — Gérer tous les athlètes</li>
        <li>🏟️ &nbsp;<strong>Clubs</strong> — Gérer tous les clubs</li>
        <li>🏆 &nbsp;<strong>Compétitions</strong> — Créer et suivre les compétitions</li>
        <li>📰 &nbsp;<strong>Actualités</strong> — Publier les actualités</li>
        <li>👥 &nbsp;<strong>Utilisateurs</strong> — Gérer les comptes inscrits</li>
      </ul>`;
    loadAllCounts();
  } else if (role === 'club') {
    if (welcomeTitle) welcomeTitle.textContent = `🏟️ Espace Club`;
    if (welcomeSub)   welcomeSub.textContent   = currentUserData?.nomClub || nom;
    if (welcomeBody)  welcomeBody.innerHTML    = `
      <p>Bienvenue <strong>${currentUserData?.nomClub || nom}</strong>. Votre espace club vous permet de :</p>
      <ul style="margin-top:12px;display:flex;flex-direction:column;gap:8px;padding-left:0;">
        <li>🏟️ &nbsp;<strong>Mon club</strong> — Consulter les informations de votre club</li>
        <li>⚽ &nbsp;<strong>Mes joueurs</strong> — Gérer les joueurs de votre club</li>
        <li>🏆 &nbsp;<strong>Compétitions</strong> — Consulter les compétitions</li>
      </ul>`;
  } else if (role === 'joueur') {
    if (welcomeTitle) welcomeTitle.textContent = `⚽ Espace Joueur`;
    if (welcomeSub)   welcomeSub.textContent   = nom;
    if (welcomeBody)  welcomeBody.innerHTML    = `
      <p>Bienvenue <strong>${nom}</strong>. Votre espace joueur vous permet de :</p>
      <ul style="margin-top:12px;display:flex;flex-direction:column;gap:8px;padding-left:0;">
        <li>👤 &nbsp;<strong>Mon profil</strong> — Consulter et modifier vos informations</li>
        <li>🏆 &nbsp;<strong>Compétitions</strong> — Voir les compétitions en cours</li>
      </ul>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// MON PROFIL (joueur) — carte pro, lecture seule
// ═══════════════════════════════════════════════════════════════
async function loadMonProfil() {
  const content = document.getElementById('mon-profil-content');
  if (!currentUser) return;
  content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏳</div><div>Chargement…</div></div>`;
  try {
    const snap = await getDocs(query(collection(db, 'joueurs'), where('email', '==', currentUser.email)));
    if (snap.empty) {
      content.innerHTML = `
        <div style="color:#64748B;line-height:1.8;background:#F8FAFC;border-radius:16px;padding:28px;">
          <p style="font-size:1.1rem;font-weight:600;color:#1E293B;">Aucun profil joueur associé</p>
          <p style="margin-top:8px;">Email du compte : <strong>${currentUser.email}</strong></p>
          <p style="margin-top:12px;padding:12px 16px;background:#DCFCE7;border-radius:10px;color:#15803D;font-size:.9rem;">
            📋 Contactez l'administrateur de la fédération pour associer votre profil à ce compte.
          </p>
        </div>`;
      return;
    }
    snap.forEach(async (docSnap) => {
      const data = docSnap.data();
      const joueurId = docSnap.id;
      // Charger les stats
      let stats = {};
      try {
        const statsSnap = await getDoc(doc(db, 'joueurs', joueurId, 'stats', 'saison'));
        if (statsSnap.exists()) stats = statsSnap.data();
      } catch(e) { /* pas de stats */ }
      content.innerHTML = buildFicheHtml(joueurId, data, stats, false);
    });
  } catch(e) {
    content.innerHTML = `<p style="color:red;">${e.message}</p>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// MON CLUB (rôle club)
// ═══════════════════════════════════════════════════════════════
async function loadMonClub() {
  const content = document.getElementById('mon-club-content');
  if (!currentUserData?.nomClub) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏟️</div><div class="empty-state-text">Aucun club associé à votre compte.</div></div>`;
    return;
  }
  try {
    const snap = await getDocs(query(collection(db, 'clubs'), where('nom', '==', currentUserData.nomClub)));
    if (snap.empty) {
      content.innerHTML = `<div style="color:#64748B;padding:8px;"><p>Club <strong>${currentUserData.nomClub}</strong> non encore enregistré dans la base.</p><p style="margin-top:8px;color:#009E60;">Contactez l'administrateur.</p></div>`;
      return;
    }
    snap.forEach(d => {
      const data = d.data();
      content.innerHTML = `
        <div style="display:grid;gap:16px;">
          <div style="display:flex;gap:20px;flex-wrap:wrap;">
            <div style="background:#F8FAFC;border-radius:12px;padding:16px 24px;flex:1;min-width:180px;">
              <div style="font-size:.75rem;color:#94A3B8;text-transform:uppercase;font-weight:600;">Nom du club</div>
              <div style="font-size:1.1rem;font-weight:700;margin-top:4px;">${data.nom || '—'}</div>
            </div>
            <div style="background:#F8FAFC;border-radius:12px;padding:16px 24px;flex:1;min-width:180px;">
              <div style="font-size:.75rem;color:#94A3B8;text-transform:uppercase;font-weight:600;">Ville</div>
              <div style="font-size:1.1rem;font-weight:700;margin-top:4px;">${data.ville || '—'}</div>
            </div>
            <div style="background:#F8FAFC;border-radius:12px;padding:16px 24px;flex:1;min-width:180px;">
              <div style="font-size:.75rem;color:#94A3B8;text-transform:uppercase;font-weight:600;">Sport</div>
              <div style="font-size:1.1rem;font-weight:700;margin-top:4px;">${data.sport || '—'}</div>
            </div>
            <div style="background:#F8FAFC;border-radius:12px;padding:16px 24px;flex:1;min-width:180px;">
              <div style="font-size:.75rem;color:#94A3B8;text-transform:uppercase;font-weight:600;">Division</div>
              <div style="font-size:1.1rem;font-weight:700;margin-top:4px;">${data.division || '—'}</div>
            </div>
          </div>
        </div>`;
    });
  } catch(e) {
    content.innerHTML = `<p style="color:red;">${e.message}</p>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// MES JOUEURS (rôle club)
// ═══════════════════════════════════════════════════════════════
async function loadMesJoueurs() {
  const tbody = document.getElementById('mes-joueurs-tbody');
  tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">⏳</div><div>Chargement…</div></div></td></tr>`;
  if (!currentUserData?.nomClub) {
    tbody.innerHTML = emptyRow(6, '🏟️', 'Aucun club associé', '');
    return;
  }
  try {
    const snap = await getDocs(query(collection(db, 'joueurs'), where('club', '==', currentUserData.nomClub)));
    if (snap.empty) {
      tbody.innerHTML = emptyRow(6, '⚽', 'Aucun joueur', 'Ajoutez des joueurs à votre club.');
      document.getElementById('count-mes-joueurs').textContent = '0';
      return;
    }
    document.getElementById('count-mes-joueurs').textContent = snap.size + ' joueur(s)';
    tbody.innerHTML = '';
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const photoHtml = d.photoUrl
        ? `<img src="${d.photoUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;" onerror="this.style.display='none'">`
        : `<span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#E2E8F0;font-size:.85rem;">⚽</span>`;
      tbody.innerHTML += `
        <tr>
          <td>${photoHtml}</td>
          <td><strong>${d.nom || '—'}</strong> ${d.prenom || ''}</td>
          <td>${d.position || '—'}</td>
          <td>${d.numeromaillot ? '#' + d.numeromaillot : '—'}</td>
          <td><span class="badge badge-${d.statut === 'Actif' ? 'green' : 'gray'}">${d.statut || 'Actif'}</span></td>
          <td>
            <button class="action-btn" onclick="openFicheJoueur('${docSnap.id}')" title="Voir la fiche">👁️</button>
            <button class="action-btn action-edit"   onclick="editJoueur('${docSnap.id}')">✏️</button>
            <button class="action-btn action-delete" onclick="deleteItem('joueurs','${docSnap.id}', loadMesJoueurs)">🗑️</button>
            <button class="action-btn" onclick="openStatsModal('${docSnap.id}')" title="Statistiques" style="background:#EEF2FF;color:#6366F1;">📊</button>
          </td>
        </tr>`;
    });
  } catch(e) {
    tbody.innerHTML = emptyRow(6, '❌', 'Erreur', e.message);
  }
}

document.getElementById('btn-add-mon-joueur').addEventListener('click', () => {
  openJoueurModal();
  // Pré-remplir le club
  setTimeout(() => {
    if (currentUserData?.nomClub) {
      document.getElementById('joueur-club').value = currentUserData.nomClub;
    }
  }, 50);
});

// ═══════════════════════════════════════════════════════════════
// UTILISATEURS (admin)
// ═══════════════════════════════════════════════════════════════
async function loadUtilisateurs() {
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">⏳</div><div>Chargement…</div></div></td></tr>`;
  try {
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    if (snap.empty) {
      tbody.innerHTML = emptyRow(5, '👥', 'Aucun utilisateur', '');
      return;
    }
    document.getElementById('count-users').textContent = snap.size + ' compte(s)';
    tbody.innerHTML = '';
    const roleColors = { admin: 'green', club: 'blue', joueur: 'yellow' };
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const date = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('fr-FR') : '—';
      tbody.innerHTML += `
        <tr>
          <td>${d.email || '—'}</td>
          <td><span class="badge badge-${roleColors[d.role] || 'gray'}">${d.role || '—'}</span></td>
          <td>${d.nom || d.nomClub || '—'}</td>
          <td>${date}</td>
          <td>
            <select class="form-input" style="padding:4px 8px;font-size:.8rem;width:auto;" onchange="changeUserRole('${docSnap.id}', this.value)">
              <option value="joueur" ${d.role === 'joueur' ? 'selected' : ''}>Joueur</option>
              <option value="club"   ${d.role === 'club'   ? 'selected' : ''}>Club</option>
              <option value="admin"  ${d.role === 'admin'  ? 'selected' : ''}>Admin</option>
            </select>
          </td>
        </tr>`;
    });
  } catch(e) {
    tbody.innerHTML = emptyRow(5, '❌', 'Erreur', e.message);
  }
}

window.changeUserRole = async (userId, newRole) => {
  try {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
    showToast('Rôle mis à jour.', 'success');
  } catch(e) {
    showToast(e.message, 'error');
  }
};

// ═══════════════════════════════════════════════════════════════
// JOUEURS (admin)
// ═══════════════════════════════════════════════════════════════
const joueursColl = () => collection(db, 'joueurs');

async function loadJoueurs() {
  const tbody = document.getElementById('joueurs-tbody');
  tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">⏳</div><div>Chargement…</div></td></tr>`;
  try {
    const snap = await getDocs(query(joueursColl(), orderBy('createdAt', 'desc')));
    if (snap.empty) {
      tbody.innerHTML = emptyRow(7, '⚽', 'Aucun joueur enregistré', 'Ajoutez votre premier joueur.');
      document.getElementById('count-joueurs').textContent = '0';
      return;
    }
    document.getElementById('count-joueurs').textContent = snap.size;
    tbody.innerHTML = '';
    const canEdit = currentRole === 'admin' || currentRole === 'club';
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const photoHtml = d.photoUrl
        ? `<img src="${d.photoUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;" onerror="this.style.display='none'">`
        : `<span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#E2E8F0;font-size:.85rem;">⚽</span>`;
      const actionsHtml = canEdit
        ? `<button class="action-btn action-edit"   onclick="editJoueur('${docSnap.id}')">✏️</button>
           <button class="action-btn action-delete" onclick="deleteItem('joueurs','${docSnap.id}', loadJoueurs)">🗑️</button>`
        : '';
      tbody.innerHTML += `
        <tr>
          <td>${photoHtml}</td>
          <td><strong>${d.nom || '—'}</strong> ${d.prenom || ''}</td>
          <td>${d.position || '—'}</td>
          <td>${d.clubActuel || d.club || '—'}</td>
          <td>${d.nationalite || '—'}</td>
          <td><span class="badge badge-${d.statut === 'Actif' ? 'green' : 'gray'}">${d.statut || 'Actif'}</span></td>
          <td>
            <button class="action-btn" onclick="openFicheJoueur('${docSnap.id}')" title="Voir la fiche">👁️</button>
            ${actionsHtml}
          </td>
        </tr>`;
    });
  } catch (e) {
    tbody.innerHTML = emptyRow(7, '❌', 'Erreur de chargement', e.message);
  }
}

document.getElementById('btn-add-joueur').addEventListener('click', () => openJoueurModal());

function openJoueurModal(id = null, data = {}) {
  // Joueurs : lecture seule, modification réservée admin et club
  if (currentRole === 'joueur') {
    showToast('Modification réservée à l\'administration.', 'error');
    return;
  }
  const modal = document.getElementById('joueur-modal');
  document.getElementById('joueur-modal-title').textContent = id ? 'Modifier le joueur' : 'Ajouter un joueur';
  document.getElementById('joueur-id').value            = id || '';
  // Identité
  document.getElementById('joueur-nom').value           = data.nom           || '';
  document.getElementById('joueur-prenom').value        = data.prenom        || '';
  document.getElementById('joueur-date-naissance').value= data.dateNaissance || '';
  document.getElementById('joueur-nationalite').value   = data.nationalite   || 'Gabonaise';
  // Physique
  document.getElementById('joueur-taille').value        = data.taille        || '';
  document.getElementById('joueur-poids').value         = data.poids         || '';
  document.getElementById('joueur-pied-fort').value     = data.piedFort      || 'Droit';
  // Parcours clubs
  document.getElementById('joueur-position').value      = data.position      || '';
  document.getElementById('joueur-numero').value        = data.numeromaillot || '';
  document.getElementById('joueur-club-formation').value= data.clubFormation || '';
  document.getElementById('joueur-club-depart').value   = data.clubDepart    || '';
  document.getElementById('joueur-club').value          = data.clubActuel || data.club || '';
  document.getElementById('joueur-statut').value        = data.statut        || 'Actif';
  // Photo
  document.getElementById('joueur-photo-url').value     = data.photoUrl      || '';
  document.getElementById('joueur-photo-preview').src   = data.photoUrl      || '';
  document.getElementById('joueur-photo-preview').style.display = data.photoUrl ? 'block' : 'none';
  modal.classList.remove('hidden');
}

// Gestion upload photo → base64
document.getElementById('joueur-photo-file')?.addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('Image trop lourde (max 2 Mo).', 'error');
    this.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    document.getElementById('joueur-photo-url').value = base64;
    const preview = document.getElementById('joueur-photo-preview');
    preview.src = base64;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

// Aperçu depuis URL externe
document.getElementById('joueur-photo-url')?.addEventListener('input', function() {
  const preview = document.getElementById('joueur-photo-preview');
  if (this.value.startsWith('http')) {
    preview.src = this.value;
    preview.style.display = 'block';
  } else if (!this.value) {
    preview.style.display = 'none';
  }
});

document.getElementById('joueur-modal-close').addEventListener('click',  () => document.getElementById('joueur-modal').classList.add('hidden'));
document.getElementById('joueur-modal-cancel').addEventListener('click', () => document.getElementById('joueur-modal').classList.add('hidden'));

document.getElementById('joueur-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (currentRole === 'joueur') {
    showToast('Modification réservée à l\'administration.', 'error');
    return;
  }
  const id   = document.getElementById('joueur-id').value;
  const data = {
    // Identité
    nom:          document.getElementById('joueur-nom').value.trim(),
    prenom:       document.getElementById('joueur-prenom').value.trim(),
    dateNaissance:document.getElementById('joueur-date-naissance').value,
    nationalite:  document.getElementById('joueur-nationalite').value.trim(),
    // Physique
    taille:       document.getElementById('joueur-taille').value || '',
    poids:        document.getElementById('joueur-poids').value || '',
    piedFort:     document.getElementById('joueur-pied-fort').value,
    // Parcours
    position:     document.getElementById('joueur-position').value,
    numeromaillot:document.getElementById('joueur-numero').value || '',
    clubFormation:document.getElementById('joueur-club-formation').value.trim(),
    clubDepart:   document.getElementById('joueur-club-depart').value.trim(),
    clubActuel:   document.getElementById('joueur-club').value.trim(),
    club:         document.getElementById('joueur-club').value.trim(), // compatibilité
    statut:       document.getElementById('joueur-statut').value,
    photoUrl:     document.getElementById('joueur-photo-url').value || '',
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
    if (currentRole === 'club') loadMesJoueurs(); else loadJoueurs();
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
      const actionsHtml = currentRole === 'admin'
        ? `<td><button class="action-btn action-edit" onclick="editComp('${docSnap.id}')">✏️</button><button class="action-btn action-delete" onclick="deleteItem('competitions','${docSnap.id}', loadCompetitions)">🗑️</button></td>`
        : '';
      tbody.innerHTML += `
        <tr>
          <td><strong>${d.nom || '—'}</strong></td>
          <td>${d.sport || '—'}</td>
          <td>${d.saison || '—'}</td>
          <td>${d.dateDebut || '—'}</td>
          <td><span class="badge badge-${col}">${d.statut || '—'}</span></td>
          ${actionsHtml}
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
  document.getElementById('comp-id').value         = id || '';
  document.getElementById('comp-nom').value        = data.nom       || '';
  document.getElementById('comp-sport').value      = data.sport     || 'Football';
  document.getElementById('comp-saison').value     = data.saison    || '';
  document.getElementById('comp-date-debut').value = data.dateDebut || '';
  document.getElementById('comp-date-fin').value   = data.dateFin   || '';
  document.getElementById('comp-statut').value     = data.statut    || 'À venir';
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
      const actionsHtml = currentRole === 'admin'
        ? `<button class="action-btn action-edit" onclick="editNews('${docSnap.id}')">✏️ Modifier</button><button class="action-btn action-delete" onclick="deleteItem('actualites','${docSnap.id}', loadActualites)">🗑️</button>`
        : '';
      grid.innerHTML += `
        <div class="news-card">
          <div class="news-card-img">${emoji}</div>
          <div class="news-card-body">
            <div class="news-card-cat">${d.categorie || 'Général'}</div>
            <div class="news-card-title">${d.titre || '—'}</div>
            <div class="news-card-date">📅 ${date}</div>
          </div>
          ${actionsHtml ? `<div class="news-card-actions">${actionsHtml}</div>` : ''}
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
// FICHE JOUEUR — carte pro (lecture seule)
// ═══════════════════════════════════════════════════════════════
function calcAge(dateNaissance) {
  if (!dateNaissance) return null;
  const dob = new Date(dateNaissance);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function statBox(icon, label, value) {
  return `
    <div style="background:#F8FAFC;border-radius:12px;padding:14px 10px;text-align:center;min-width:80px;flex:1;">
      <div style="font-size:1.3rem;">${icon}</div>
      <div style="font-size:1.25rem;font-weight:800;color:#1E293B;margin:4px 0;">${value ?? '0'}</div>
      <div style="font-size:.68rem;color:#94A3B8;text-transform:uppercase;font-weight:600;line-height:1.2;">${label}</div>
    </div>`;
}

function buildFicheHtml(joueurId, data, stats, showEditStats) {
  const age = calcAge(data.dateNaissance);
  const photo = data.photoUrl
    ? `<img src="${data.photoUrl}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.4);" onerror="this.style.display='none'">`
    : `<div style="width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:2.5rem;border:3px solid rgba(255,255,255,.3);">⚽</div>`;
  const statutColor = data.statut === 'Actif' ? '#22C55E' : data.statut === 'Suspendu' ? '#EF4444' : '#94A3B8';

  const editStatsBtn = showEditStats
    ? `<button onclick="openStatsModal('${joueurId}')" style="margin-top:14px;padding:8px 18px;background:#6366F1;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer;">📊 Saisir les statistiques</button>`
    : '';

  return `
  <div style="max-width:680px;margin:0 auto;">
    <!-- Bandeau identité -->
    <div style="background:linear-gradient(135deg,#009E60 0%,#006B40 100%);border-radius:20px;padding:28px;color:#fff;display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
      ${photo}
      <div style="flex:1;min-width:180px;">
        <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;opacity:.7;font-weight:600;">Fiche joueur certifiée</div>
        <div style="font-size:1.8rem;font-weight:900;line-height:1.1;margin:6px 0;">${data.nom || '—'} ${data.prenom || ''}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:6px;">
          <span style="background:rgba(255,255,255,.18);padding:4px 12px;border-radius:20px;font-size:.8rem;font-weight:700;">${data.position || '—'}</span>
          ${data.numeromaillot ? `<span style="background:rgba(255,255,255,.18);padding:4px 12px;border-radius:20px;font-size:.8rem;font-weight:700;">#${data.numeromaillot}</span>` : ''}
          <span style="background:${statutColor}33;border:1px solid ${statutColor};color:#fff;padding:4px 12px;border-radius:20px;font-size:.75rem;font-weight:700;">${data.statut || 'Actif'}</span>
        </div>
        <div style="margin-top:10px;font-size:.82rem;opacity:.85;">🏳️ ${data.nationalite || '—'} ${age ? `&nbsp;·&nbsp; ${age} ans` : ''}</div>
      </div>
    </div>

    <!-- Physique & Parcours -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
      <div style="background:#F8FAFC;border-radius:16px;padding:20px;">
        <div style="font-size:.7rem;text-transform:uppercase;font-weight:700;color:#94A3B8;margin-bottom:14px;letter-spacing:.08em;">Physique</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${infoLine('📏', 'Taille', data.taille ? data.taille + ' cm' : '—')}
          ${infoLine('⚖️', 'Poids', data.poids ? data.poids + ' kg' : '—')}
          ${infoLine('🦶', 'Pied fort', data.piedFort || '—')}
          ${infoLine('🎂', 'Naissance', data.dateNaissance ? new Date(data.dateNaissance).toLocaleDateString('fr-FR') : '—')}
        </div>
      </div>
      <div style="background:#F8FAFC;border-radius:16px;padding:20px;">
        <div style="font-size:.7rem;text-transform:uppercase;font-weight:700;color:#94A3B8;margin-bottom:14px;letter-spacing:.08em;">Parcours</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${infoLine('🌱', 'Formation', data.clubFormation || '—')}
          ${infoLine('🚀', 'Premier club', data.clubDepart || '—')}
          ${infoLine('🏟️', 'Club actuel', data.clubActuel || data.club || '—')}
        </div>
      </div>
    </div>

    <!-- Statistiques certifiées -->
    <div style="background:#F8FAFC;border-radius:16px;padding:20px;margin-top:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
        <div style="font-size:.7rem;text-transform:uppercase;font-weight:700;color:#94A3B8;letter-spacing:.08em;">Statistiques certifiées</div>
        <span style="font-size:.7rem;background:#DCFCE7;color:#15803D;padding:3px 10px;border-radius:10px;font-weight:600;">🔒 Données fédération</span>
        ${editStatsBtn}
      </div>

      <div style="font-size:.75rem;text-transform:uppercase;font-weight:700;color:#64748B;margin-bottom:8px;">Temps de jeu</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
        ${statBox('🎮', 'Matchs joués', stats.matchsJoues)}
        ${statBox('⏱️', 'Minutes', stats.minutesJouees)}
        ${statBox('🟨', 'Cartons J.', stats.cartonsJaunes)}
        ${statBox('🟥', 'Cartons R.', stats.cartonsRouges)}
      </div>

      <div style="font-size:.75rem;text-transform:uppercase;font-weight:700;color:#64748B;margin-bottom:8px;">Attaque</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
        ${statBox('⚽', 'Buts (D)', stats.butsD)}
        ${statBox('🦶', 'Buts (G)', stats.butsG)}
        ${statBox('🤜', 'Buts tête', stats.butsTete)}
        ${statBox('🎯', 'Coup franc', stats.butsFC)}
        ${statBox('🥅', 'Penalty', stats.butsPen)}
        ${statBox('🎁', 'Passes D.', stats.passesDecisives)}
        ${statBox('🎰', 'Tirs cadrés', stats.tirsCadres)}
      </div>

      <div style="font-size:.75rem;text-transform:uppercase;font-weight:700;color:#64748B;margin-bottom:8px;">Défense</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${statBox('🛡️', 'Interceptions', stats.interceptions)}
        ${statBox('⚔️', 'Tacles', stats.tacles)}
      </div>
    </div>
  </div>`;
}

function infoLine(icon, label, value) {
  return `<div style="display:flex;align-items:center;gap:8px;">
    <span style="font-size:1rem;">${icon}</span>
    <span style="font-size:.78rem;color:#94A3B8;min-width:80px;">${label}</span>
    <span style="font-size:.88rem;font-weight:600;color:#1E293B;">${value}</span>
  </div>`;
}

// ─── Modal fiche joueur (vue en popup) ───────────────────────
window.openFicheJoueur = async (joueurId) => {
  // Créer le modal s'il n'existe pas
  let modal = document.getElementById('fiche-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'fiche-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:720px;max-height:90vh;overflow-y:auto;">
        <div class="modal-header">
          <span class="modal-title" id="fiche-modal-title">Fiche joueur</span>
          <button class="modal-close" id="fiche-modal-close">✕</button>
        </div>
        <div class="modal-body" id="fiche-modal-body">
          <div class="empty-state"><div class="empty-state-icon">⏳</div><div>Chargement…</div></div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('fiche-modal-close').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
  }
  modal.classList.remove('hidden');
  const body = document.getElementById('fiche-modal-body');
  body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏳</div><div>Chargement…</div></div>`;
  try {
    const snap = await getDoc(doc(db, 'joueurs', joueurId));
    if (!snap.exists()) { body.innerHTML = `<p style="color:red;">Joueur introuvable.</p>`; return; }
    const data = snap.data();
    let stats = {};
    try {
      const st = await getDoc(doc(db, 'joueurs', joueurId, 'stats', 'saison'));
      if (st.exists()) stats = st.data();
    } catch(e) {}
    const canEditStats = currentRole === 'admin' || currentRole === 'club';
    body.innerHTML = buildFicheHtml(joueurId, data, stats, canEditStats);
  } catch(e) {
    body.innerHTML = `<p style="color:red;">${e.message}</p>`;
  }
};

// ─── Modal statistiques (admin + club uniquement) ────────────
window.openStatsModal = async (joueurId) => {
  if (currentRole === 'joueur') {
    showToast('Modification des stats réservée à la fédération et aux clubs.', 'error');
    return;
  }
  let modal = document.getElementById('stats-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'stats-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:640px;max-height:90vh;overflow-y:auto;">
        <div class="modal-header">
          <span class="modal-title">📊 Statistiques du joueur</span>
          <button class="modal-close" id="stats-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="stats-joueur-id">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" id="stats-grid">
            ${statsField('stats-matchs',       'Matchs joués',    'number')}
            ${statsField('stats-minutes',       'Minutes jouées',  'number')}
            ${statsField('stats-cartons-j',     'Cartons jaunes',  'number')}
            ${statsField('stats-cartons-r',     'Cartons rouges',  'number')}
            ${statsField('stats-buts-d',        'Buts pied droit', 'number')}
            ${statsField('stats-buts-g',        'Buts pied gauche','number')}
            ${statsField('stats-buts-tete',     'Buts de la tête', 'number')}
            ${statsField('stats-buts-fc',       'Buts coup franc', 'number')}
            ${statsField('stats-buts-pen',      'Buts penalty',    'number')}
            ${statsField('stats-passes',        'Passes décisives','number')}
            ${statsField('stats-tirs',          'Tirs cadrés',     'number')}
            ${statsField('stats-interceptions', 'Interceptions',   'number')}
            ${statsField('stats-tacles',        'Tacles',          'number')}
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
            <button id="stats-cancel" class="btn btn-secondary">Annuler</button>
            <button id="stats-save"   class="btn btn-primary">💾 Enregistrer</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('stats-modal-close').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('stats-cancel').addEventListener('click',      () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
    document.getElementById('stats-save').addEventListener('click', async () => {
      const jId = document.getElementById('stats-joueur-id').value;
      if (!jId) return;
      const statsData = {
        matchsJoues:      parseInt(document.getElementById('stats-matchs').value)       || 0,
        minutesJouees:    parseInt(document.getElementById('stats-minutes').value)      || 0,
        cartonsJaunes:    parseInt(document.getElementById('stats-cartons-j').value)    || 0,
        cartonsRouges:    parseInt(document.getElementById('stats-cartons-r').value)    || 0,
        butsD:            parseInt(document.getElementById('stats-buts-d').value)       || 0,
        butsG:            parseInt(document.getElementById('stats-buts-g').value)       || 0,
        butsTete:         parseInt(document.getElementById('stats-buts-tete').value)    || 0,
        butsFC:           parseInt(document.getElementById('stats-buts-fc').value)      || 0,
        butsPen:          parseInt(document.getElementById('stats-buts-pen').value)     || 0,
        passesDecisives:  parseInt(document.getElementById('stats-passes').value)       || 0,
        tirsCadres:       parseInt(document.getElementById('stats-tirs').value)         || 0,
        interceptions:    parseInt(document.getElementById('stats-interceptions').value)|| 0,
        tacles:           parseInt(document.getElementById('stats-tacles').value)       || 0,
        updatedBy:        currentRole,
        updatedAt:        serverTimestamp(),
      };
      try {
        await setDoc(doc(db, 'joueurs', jId, 'stats', 'saison'), statsData);
        showToast('Statistiques enregistrées.');
        modal.classList.add('hidden');
      } catch(err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Pré-remplir avec les stats existantes
  document.getElementById('stats-joueur-id').value = joueurId;
  modal.classList.remove('hidden');
  // Reset
  ['stats-matchs','stats-minutes','stats-cartons-j','stats-cartons-r',
   'stats-buts-d','stats-buts-g','stats-buts-tete','stats-buts-fc',
   'stats-buts-pen','stats-passes','stats-tirs','stats-interceptions','stats-tacles']
    .forEach(id => { document.getElementById(id).value = ''; });
  try {
    const st = await getDoc(doc(db, 'joueurs', joueurId, 'stats', 'saison'));
    if (st.exists()) {
      const s = st.data();
      document.getElementById('stats-matchs').value       = s.matchsJoues    || '';
      document.getElementById('stats-minutes').value      = s.minutesJouees  || '';
      document.getElementById('stats-cartons-j').value    = s.cartonsJaunes  || '';
      document.getElementById('stats-cartons-r').value    = s.cartonsRouges  || '';
      document.getElementById('stats-buts-d').value       = s.butsD          || '';
      document.getElementById('stats-buts-g').value       = s.butsG          || '';
      document.getElementById('stats-buts-tete').value    = s.butsTete       || '';
      document.getElementById('stats-buts-fc').value      = s.butsFC         || '';
      document.getElementById('stats-buts-pen').value     = s.butsPen        || '';
      document.getElementById('stats-passes').value       = s.passesDecisives|| '';
      document.getElementById('stats-tirs').value         = s.tirsCadres     || '';
      document.getElementById('stats-interceptions').value= s.interceptions  || '';
      document.getElementById('stats-tacles').value       = s.tacles         || '';
    }
  } catch(e) { /* pas encore de stats */ }
};

function statsField(id, label, type = 'number') {
  return `<div>
    <label style="font-size:.75rem;font-weight:600;color:#64748B;display:block;margin-bottom:4px;">${label}</label>
    <input id="${id}" type="${type}" min="0" class="form-input" placeholder="0" style="width:100%;box-sizing:border-box;">
  </div>`;
}


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
window.loadMesJoueurs   = loadMesJoueurs;
