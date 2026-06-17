/**
 * 💼 PRACTICAL EXAMPLE - Intégration Réelle des Modules
 * Exemple complet d'une application admin moderne
 */

// ============================================================================
// 1️⃣ INITIALISATION
// ============================================================================

import AuthModule from './modules/auth-module.js';
import DataModule from './modules/data-module.js';
import UIModule from './modules/ui-module.js';
import AnalyticsModule from './modules/analytics-module.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialiser les modules
const ui = new UIModule().init();
const authModule = new AuthModule(auth, db);
const dataModule = new DataModule(db);
const analyticsModule = new AnalyticsModule(db, dataModule);

// Variables globales
let currentSection = 'dashboard';
let usersCache = [];
let newsCache = [];

// ============================================================================
// 2️⃣ AUTHENTIFICATION
// ============================================================================

async function handleLogin() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    ui.warning('Veuillez remplir tous les champs');
    return;
  }

  const loader = ui.showLoader('Connexion...');

  try {
    const result = await authModule.login(email, password);
    
    if (result.success) {
      loader.close();
      ui.success('✅ Connecté!');
      
      // Cacher le login, afficher l'app
      document.getElementById('login-page').style.display = 'none';
      document.getElementById('admin-app').style.display = 'flex';
      
      // Initialiser l'app
      initializeApp();
    } else {
      loader.close();
      ui.error('Erreur de connexion', result.error);
    }
  } catch (error) {
    loader.close();
    ui.error('Erreur', error.message);
  }
}

async function handleLogout() {
  const confirmed = await ui.confirm(
    'Déconnexion',
    'Êtes-vous sûr de vouloir vous déconnecter?'
  );

  if (!confirmed) return;

  try {
    await authModule.logout();
    
    // Nettoyer
    dataModule.stopAllListeners();
    analyticsModule.destroyAllCharts();
    
    // Afficher login
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('admin-app').style.display = 'none';
    
    ui.success('Déconnecté');
  } catch (error) {
    ui.error('Erreur', error.message);
  }
}

// ============================================================================
// 3️⃣ INITIALISATION DE L'APP
// ============================================================================

async function initializeApp() {
  try {
    console.log('🚀 Initializing admin app...');
    
    const loader = ui.showLoader('Chargement des données...');
    
    // Initialiser les modules
    await authModule.init();
    await dataModule.init();
    await analyticsModule.init();
    
    // Afficher le dashboard
    await showDashboard();
    
    // Mettre à jour le header
    updateHeader();
    
    // Setup listeners temps réel
    setupRealtimeListeners();
    
    // Réinitialiser session timer sur activité
    document.addEventListener('click', () => authModule.resetSessionTimer());
    document.addEventListener('keypress', () => authModule.resetSessionTimer());
    
    loader.close();
    ui.success('✅ Application prête!');
    
    console.log('✅ App initialized');
  } catch (error) {
    console.error('❌ Init error:', error);
    ui.error('Erreur d\'initialisation', error.message);
  }
}

function updateHeader() {
  const user = authModule.currentUser;
  document.getElementById('user-name').textContent = user?.displayName || 'Admin';
  document.getElementById('user-email').textContent = user?.email || '';
}

// ============================================================================
// 4️⃣ DASHBOARD
// ============================================================================

async function showDashboard() {
  try {
    currentSection = 'dashboard';
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById('section-dashboard').style.display = 'block';
    
    // Charger les KPI
    const kpis = await analyticsModule.getKPIs();
    renderDashboard(kpis);
    
    // Créer les graphiques
    setTimeout(() => {
      analyticsModule.createUserStatusChart('chart-status');
      analyticsModule.createNewsTimelineChart('chart-timeline');
    }, 100);
  } catch (error) {
    ui.error('Erreur', error.message);
  }
}

function renderDashboard(kpis) {
  // Rendre les cartes KPI
  const kpiHtml = `
    <div class="kpi-grid">
      <div class="kpi-card trending" onclick="showSection('users')">
        <div class="kpi-icon">👥</div>
        <div class="kpi-value">${kpis.totalUsers || 0}</div>
        <div class="kpi-label">Utilisateurs</div>
        <div class="kpi-change">${kpis.usersTrend || '+0%'}</div>
      </div>
      
      <div class="kpi-card" onclick="showSection('users')">
        <div class="kpi-icon">⏳</div>
        <div class="kpi-value">${kpis.pendingUsers || 0}</div>
        <div class="kpi-label">En attente</div>
        <div class="kpi-change">À valider</div>
      </div>
      
      <div class="kpi-card" onclick="showSection('news')">
        <div class="kpi-icon">📰</div>
        <div class="kpi-value">${kpis.totalNews || 0}</div>
        <div class="kpi-label">Actualités</div>
        <div class="kpi-change">Publiées</div>
      </div>
      
      <div class="kpi-card" onclick="showSection('sites')">
        <div class="kpi-icon">📍</div>
        <div class="kpi-value">${kpis.totalSites || 0}</div>
        <div class="kpi-label">Sites</div>
        <div class="kpi-change">Actifs</div>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-top: 20px;">
      <div class="card">
        <div class="card-header">
          <h3>📊 Graphiques</h3>
        </div>
        <div class="card-body">
          <canvas id="chart-status" style="max-height: 300px;"></canvas>
          <canvas id="chart-timeline" style="max-height: 300px; margin-top: 20px;"></canvas>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h3>⚡ Tendances</h3>
        </div>
        <div class="card-body">
          <div id="trends-container"></div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('dashboard-content').innerHTML = kpiHtml;
  
  // Charger les tendances
  loadTrends();
}

async function loadTrends() {
  try {
    const trends = await analyticsModule.getTrends();
    
    const html = `
      <div style="font-size: 14px;">
        <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>📈 Croissance Utilisateurs</strong>
          <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">
            Aujourd'hui: ${trends.userGrowth?.today || 0}
            <span style="color: ${trends.userGrowth?.direction === 'up' ? '#10b981' : '#ef4444'};">
              ${trends.userGrowth?.change || '+0%'}
            </span>
          </div>
        </div>
        
        <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>📰 Activité Actualités</strong>
          <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">
            Aujourd'hui: ${trends.newsActivity?.today || 0}
            <span style="color: ${trends.newsActivity?.direction === 'up' ? '#10b981' : '#ef4444'};">
              ${trends.newsActivity?.change || '+0%'}
            </span>
          </div>
        </div>
        
        <div style="padding: 12px 0;">
          <strong>🏆 Top Rôles</strong>
          <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">
            ${trends.topUsersRoles?.slice(0, 3)
              .map(r => `${r.name}: ${r.count}`)
              .join('<br/>') || 'N/A'}
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('trends-container').innerHTML = html;
  } catch (error) {
    console.error('Trends error:', error);
  }
}

// ============================================================================
// 5️⃣ GESTION DES UTILISATEURS
// ============================================================================

async function showUsers() {
  try {
    currentSection = 'users';
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById('section-users').style.display = 'block';
    
    const loader = ui.showLoader('Chargement des utilisateurs...');
    
    const result = await dataModule.loadWithPagination('users', 1, {
      pageSize: 50,
      orderBy: ['createdAt', 'desc']
    });
    
    usersCache = result.items;
    renderUsersTable(result.items);
    setupPagination('users', result);
    
    loader.close();
  } catch (error) {
    ui.error('Erreur', error.message);
  }
}

function renderUsersTable(users) {
  if (!users.length) {
    document.getElementById('users-table').innerHTML = `
      <div class="empty">
        <div class="empty-icon">👥</div>
        <h3>Aucun utilisateur</h3>
      </div>
    `;
    return;
  }

  const html = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
          <th style="padding: 12px; text-align: left; font-weight: 600;">Nom</th>
          <th style="padding: 12px; text-align: left; font-weight: 600;">Email</th>
          <th style="padding: 12px; text-align: left; font-weight: 600;">Rôle</th>
          <th style="padding: 12px; text-align: left; font-weight: 600;">Statut</th>
          <th style="padding: 12px; text-align: right; font-weight: 600;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(u => `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px;">${u.displayName || 'N/A'}</td>
            <td style="padding: 12px;">${u.email || 'N/A'}</td>
            <td style="padding: 12px;">${u.role || 'N/A'}</td>
            <td style="padding: 12px;">
              <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; 
                ${u.status === 'active' ? 'background: #dcfce7; color: #166534;' : 
                  u.status === 'pending' ? 'background: #fef3c7; color: #92400e;' : 
                  'background: #f3f4f6; color: #4b5563;'}">
                ${u.status || 'N/A'}
              </span>
            </td>
            <td style="padding: 12px; text-align: right;">
              <button onclick="editUser('${u.id}')" class="btn-sm" style="margin-right: 8px;">✏️ Éditer</button>
              <button onclick="deleteUser('${u.id}')" class="btn-sm" style="background: #fee2e2; color: #991b1b;">🗑️ Supprimer</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  document.getElementById('users-table').innerHTML = html;
}

async function editUser(userId) {
  const user = usersCache.find(u => u.id === userId);
  if (!user) return;

  const displayName = await ui.prompt('Modifier le nom', 'Nom:', {
    placeholder: user.displayName
  });

  if (!displayName) return;

  try {
    const loader = ui.showLoader('Mise à jour...');
    
    await dataModule.update('users', userId, {
      displayName
    });
    
    loader.close();
    ui.success('✅ Utilisateur mis à jour');
    
    // Recharger la liste
    showUsers();
  } catch (error) {
    ui.error('Erreur', error.message);
  }
}

async function deleteUser(userId) {
  const confirmed = await ui.confirm(
    'Supprimer l\'utilisateur?',
    'Cette action est irréversible.'
  );

  if (!confirmed) return;

  try {
    const loader = ui.showLoader('Suppression...');
    
    await dataModule.delete('users', userId);
    
    loader.close();
    ui.success('✅ Utilisateur supprimé');
    
    showUsers();
  } catch (error) {
    ui.error('Erreur', error.message);
  }
}

// ============================================================================
// 6️⃣ LISTENERS TEMPS RÉEL
// ============================================================================

function setupRealtimeListeners() {
  // Écouter les utilisateurs
  dataModule.listen('users', (error, items) => {
    if (error) {
      console.error('Users listen error:', error);
      return;
    }
    
    usersCache = items;
    
    // Si nous sommes sur la page users, mettre à jour
    if (currentSection === 'users') {
      renderUsersTable(items);
    }
    
    // Mettre à jour les badges d'alerte
    const pending = items.filter(u => u.status === 'pending').length;
    updateAlertBadge('users-pending', pending);
  });

  // Écouter les actualités
  dataModule.listen('actualites', (error, items) => {
    if (error) {
      console.error('News listen error:', error);
      return;
    }
    
    newsCache = items;
    
    if (currentSection === 'news') {
      renderNewsList(items);
    }
  });
}

function updateAlertBadge(elementId, count) {
  const el = document.getElementById(elementId);
  if (el && count > 0) {
    el.style.display = 'inline-block';
    el.textContent = count;
  }
}

// ============================================================================
// 7️⃣ PAGINATION
// ============================================================================

function setupPagination(collection, result) {
  const paginationEl = document.getElementById(`${collection}-pagination`);
  if (!paginationEl) return;

  let html = '';
  
  for (let i = 1; i <= result.totalPages; i++) {
    const isActive = i === result.pageNum;
    html += `
      <button 
        onclick="loadPage('${collection}', ${i})"
        style="
          padding: 6px 10px;
          background: ${isActive ? '#3b82f6' : '#f3f4f6'};
          color: ${isActive ? 'white' : '#374151'};
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin: 0 4px;
        "
      >
        ${i}
      </button>
    `;
  }
  
  paginationEl.innerHTML = html;
}

async function loadPage(collection, pageNum) {
  const result = await dataModule.loadWithPagination(collection, pageNum, {
    pageSize: 50,
    orderBy: ['createdAt', 'desc']
  });

  if (collection === 'users') {
    usersCache = result.items;
    renderUsersTable(result.items);
  }

  setupPagination(collection, result);
}

// ============================================================================
// 8️⃣ RECHERCHE
// ============================================================================

async function searchUsers(term) {
  if (!term) {
    renderUsersTable(usersCache);
    return;
  }

  const results = await dataModule.search('users', term, 
    ['displayName', 'email', 'city']);
  
  renderUsersTable(results);
}

// ============================================================================
// 9️⃣ RAPPORTS
// ============================================================================

async function generateReport() {
  const loader = ui.showLoader('Génération du rapport...');

  try {
    const report = await analyticsModule.generateReport();
    
    const format = await ui.prompt(
      'Format d\'export',
      'Choisissez le format:',
      { placeholder: 'json ou csv' }
    );

    if (format === 'csv') {
      await analyticsModule.exportReportCSV(report);
    } else {
      await analyticsModule.exportReportJSON(report);
    }

    loader.close();
    ui.success('✅ Rapport exporté');
  } catch (error) {
    loader.close();
    ui.error('Erreur', error.message);
  }
}

// ============================================================================
// 🔟 EXPORTER GLOBALEMENT
// ============================================================================

// Rendre disponible globalement pour HTML onclick
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.showDashboard = showDashboard;
window.showUsers = showUsers;
window.searchUsers = searchUsers;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.loadPage = loadPage;
window.generateReport = generateReport;
window.renderNewsList = () => {}; // Stub

// Exporter les modules
window.authModule = authModule;
window.dataModule = dataModule;
window.ui = ui;
window.analytics = analyticsModule;

console.log('✅ Admin app loaded');
