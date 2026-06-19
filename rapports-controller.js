/**
 * ═══════════════════════════════════════════════════════════════
 * GSC ADMIN — CONTRÔLEUR DES RAPPORTS
 * rapports-controller.js  |  v2.0  |  Juin 2026
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  let currentStats = {};
  let integrationTokens = {};

  /* ═══════════════════════════════════════════════════════════
     RENDU DES RAPPORTS
     ═══════════════════════════════════════════════════════════ */

  function renderReports(users, matches) {
    if (!document.getElementById('rapports')) return;

    // Générer les statistiques
    currentStats = window.reportsModule.generateStats(users, matches);

    // Afficher les cartes statistiques
    updateStatCards();

    // Initialiser les graphiques
    window.reportsModule.initCharts(currentStats);

    // Afficher le tableau des joueurs
    renderPlayersTable(users);

    // Afficher le résumé des matchs
    renderMatchesSummary(currentStats);
  }

  function updateStatCards() {
    const map = {
      'stat-total-joueurs': currentStats.totalPlayers,
      'stat-actifs-joueurs': currentStats.activeJoueurs,
      'stat-matchs-joues': currentStats.playedMatches,
      'stat-matchs-avenir': currentStats.upcomingMatches,
      'stat-buts-total': currentStats.totalGoals,
      'stat-moy-buts': currentStats.avgGoalsPerMatch,
      'stat-couverture-pct': currentStats.photoCoverage + '%',
      'stat-couverture-nb': `${currentStats.playersWithPhoto} / ${currentStats.totalPlayers || 'N/A'}`
    };

    Object.keys(map).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = map[id];
    });
  }

  function renderPlayersTable(users) {
    const tbody = document.getElementById('rapport-joueurs-table');
    if (!tbody) return;

    const joueurs = users
      .filter(u => u.role === 'joueur')
      .sort((a, b) => (b.buts || 0) - (a.buts || 0));

    if (!joueurs.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">Aucun joueur enregistré</td></tr>`;
      return;
    }

    tbody.innerHTML = joueurs.map(j => `
      <tr style="border-bottom:1px solid #f0f2f5;hover:background:#f9fafb;">
        <td style="padding:10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#009E60,#00c86a);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;">
              ${(j.nom || '?').charAt(0).toUpperCase()}
            </div>
            <span style="font-weight:500;">${esc(j.nom || 'Sans nom')}</span>
          </div>
        </td>
        <td style="text-align:center;padding:10px;">${j.matchsJoues || 0}</td>
        <td style="text-align:center;padding:10px;font-weight:700;color:#009E60;">${j.buts || 0}</td>
        <td style="text-align:center;padding:10px;">${j.passes || 0}</td>
        <td style="text-align:center;padding:10px;font-size:12px;color:#64748b;">${esc(j.club || '—')}</td>
        <td style="text-align:center;padding:10px;">${j.taille ? j.taille + ' cm' : '—'}</td>
        <td style="text-align:center;padding:10px;">${j.poids ? j.poids + ' kg' : '—'}</td>
      </tr>
    `).join('');
  }

  function renderMatchesSummary(stats) {
    const map = {
      'summary-total-matchs': stats.totalMatches,
      'summary-victoires': stats.homeWins,
      'summary-defaites': stats.awayWins,
      'summary-nuls': stats.draws
    };

    Object.keys(map).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = map[id];
    });
  }

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ═══════════════════════════════════════════════════════════
     EXPORTS
     ═══════════════════════════════════════════════════════════ */

  function setupExportButtons(users, matches) {
    const btnCSV = document.getElementById('btn-export-csv');
    const btnPDF = document.getElementById('btn-export-pdf');

    if (btnCSV) {
      btnCSV.addEventListener('click', () => {
        window.reportsModule.exportToCSV(users, matches, currentStats);
        showToast('CSV exporté ✓', 'success');
      });
    }

    if (btnPDF) {
      btnPDF.addEventListener('click', () => {
        // Charger jsPDF si nécessaire
        if (typeof jsPDF === 'undefined') {
          loadJsPDF(() => {
            window.reportsModule.exportToPDF(users, matches, currentStats);
            showToast('PDF généré ✓', 'success');
          });
        } else {
          window.reportsModule.exportToPDF(users, matches, currentStats);
          showToast('PDF généré ✓', 'success');
        }
      });
    }

    const btnRefresh = document.getElementById('btn-refresh-reports');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        renderReports(users, matches);
        showToast('Données actualisées', 'success');
      });
    }
  }

  function loadJsPDF(callback) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = callback;
    script.onerror = () => showToast('Erreur: impossible de charger jsPDF', 'error');
    document.head.appendChild(script);
  }

  /* ═══════════════════════════════════════════════════════════
     PARTAGE
     ═══════════════════════════════════════════════════════════ */

  function setupShareButton() {
    const btn = document.getElementById('btn-share-report');
    const modal = document.getElementById('share-modal');
    const closeBtn = modal?.querySelector('.modal-close');
    const btnClose = document.getElementById('btn-close-share');
    const btnGenerate = document.getElementById('btn-generate-share');

    if (btn) {
      btn.addEventListener('click', () => {
        if (modal) modal.classList.add('open');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (modal) modal.classList.remove('open');
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (modal) modal.classList.remove('open');
      });
    }

    if (btnGenerate) {
      btnGenerate.addEventListener('click', generateShareLink);
    }

    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('open');
      });
    }
  }

  function generateShareLink() {
    const expiry = document.getElementById('share-expiry')?.value || 7;
    const shareData = window.reportsModule.generateShareLink('rapport-' + Date.now(), expiry);

    const linkInput = document.getElementById('share-link');
    if (linkInput) {
      linkInput.value = shareData.url;
    }

    // Bouton copier
    const btnCopy = document.getElementById('btn-copy-link');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(shareData.url).then(() => {
          showToast('Lien copié! 📋', 'success');
          btnCopy.textContent = '✓ Copié';
          setTimeout(() => {
            btnCopy.textContent = 'Copier';
          }, 2000);
        });
      });
    }

    showToast(`Lien valide ${expiry} jour(s)`, 'success');
  }

  /* ═══════════════════════════════════════════════════════════
     INTÉGRATIONS API
     ═══════════════════════════════════════════════════════════ */

  function setupIntegrations() {
    const btn = document.getElementById('btn-integrations');
    const modal = document.getElementById('integrations-modal');
    const closeBtn = modal?.querySelector('.modal-close');
    const btnClose = document.getElementById('btn-close-integrations');

    if (btn) {
      btn.addEventListener('click', () => {
        if (modal) modal.classList.add('open');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (modal) modal.classList.remove('open');
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (modal) modal.classList.remove('open');
      });
    }

    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('open');
      });
    }

    // Boutons intégration
    document.querySelectorAll('.btn-integrate').forEach(btn => {
      btn.addEventListener('click', () => handleIntegration(btn));
    });
  }

  async function handleIntegration(btn) {
    const api = btn.dataset.api;
    const container = btn.closest('.msection');
    const tokenInput = container?.querySelector('.api-token') || container?.querySelector('[type="password"]');
    const token = tokenInput?.value;

    if (!token) {
      showToast('Veuillez entrer un token API', 'warn');
      return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Connexion...';

    try {
      let result;

      if (api === 'fifa') {
        result = await window.reportsModule.integrateWithFIFA(token, {
          timestamp: new Date().toISOString(),
          source: 'GSC-Admin'
        });
      } else if (api === 'caf') {
        result = await window.reportsModule.integrateWithCAF(token, {
          timestamp: new Date().toISOString(),
          source: 'GSC-Admin'
        });
      } else if (api === 'custom') {
        const url = document.getElementById('custom-api-url').value;
        const customToken = document.getElementById('custom-api-token').value;
        result = await window.reportsModule.integrateWithCustomAPI(url, customToken, {
          timestamp: new Date().toISOString(),
          source: 'GSC-Admin'
        });
      }

      if (result.success) {
        showToast(`✓ ${api.toUpperCase()} connecté!`, 'success');
        const statusEl = document.getElementById(`${api}-status`);
        if (statusEl) {
          statusEl.innerHTML = '<span style="color:#009E60;font-weight:600;">✓ Connecté</span>';
        }
        btn.textContent = '✓ Connecté';
        btn.disabled = true;
        if (tokenInput) tokenInput.value = '';
      } else {
        showToast(`Erreur: ${result.error}`, 'error');
        btn.textContent = 'Reconnecter';
        btn.disabled = false;
      }
    } catch (err) {
      console.error('[Integration]', err);
      showToast(`Erreur de connexion: ${err.message}`, 'error');
      btn.textContent = 'Réessayer';
      btn.disabled = false;
    }
  }

  function showToast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  /* ═══════════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════════ */

  // Ajouter le nouvel onglet "Rapports" à la navigation
  function setupReportsNav() {
    const navSection = document.querySelector('.sidebar-nav');
    if (!navSection) return;

    const navItem = document.createElement('button');
    navItem.className = 'nav-item';
    navItem.id = 'nav-rapports';
    navItem.innerHTML = '<span class="nav-icon">📊</span><span>Rapports</span>';
    navItem.addEventListener('click', () => showSection('rapports'));
    
    navSection.appendChild(navItem);

    // Ajouter au mobile nav
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) {
      const mobileBtn = document.createElement('button');
      mobileBtn.className = 'mn-btn';
      mobileBtn.id = 'mnav-rapports';
      mobileBtn.innerHTML = '<span class="mn-icon">📊</span><span>Rapports</span>';
      mobileBtn.addEventListener('click', () => showSection('rapports'));
      mobileNav.appendChild(mobileBtn);
    }
  }

  function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(name);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mn-btn').forEach(b => b.classList.remove('active'));
    
    const navBtn = document.getElementById('nav-' + name);
    const mnavBtn = document.getElementById('mnav-' + name);
    if (navBtn) navBtn.classList.add('active');
    if (mnavBtn) mnavBtn.classList.add('active');

    const SECTION_TITLES = {
      dashboard: 'Dashboard',
      joueurs: 'Joueurs',
      photos: 'Photos & Logos',
      matchs: 'Matchs',
      rapports: 'Rapports & Statistiques'
    };

    document.getElementById('topbar-title').firstChild.textContent = SECTION_TITLES[name] || '';
  }

  // Exposer publiquement
  window.reportsController = {
    render: renderReports,
    setupExports: setupExportButtons,
    setupShare: setupShareButton,
    setupIntegrations: setupIntegrations,
    init: function () {
      setupReportsNav();
      setupShareButton();
      setupIntegrations();
    }
  };

  // Initialiser au chargement du DOM
  window.addEventListener('DOMContentLoaded', () => {
    window.reportsController.init();
  });

})();
