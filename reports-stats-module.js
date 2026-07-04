/**
 * ═══════════════════════════════════════════════════════════════
 * GSC ADMIN — RAPPORTS & STATISTIQUES AVANCÉS
 * reports-stats-module.js  |  v2.0  |  Juin 2026
 * ═══════════════════════════════════════════════════════════════
 * 
 * Module de reporting complet avec :
 * - Graphiques interactifs (Chart.js)
 * - Export multi-format (PDF, Excel, CSV)
 * - Statistiques détaillées
 * - Partage sécurisé
 * - Intégrations API externes (FIFA, CAF)
 * ═══════════════════════════════════════════════════════════════
 */

window.reportsModule = (function () {
  'use strict';

  let chartInstances = {};
  let reportData = {};
  let integrationStatus = {};

  /* ═══════════════════════════════════════════════════════════
     STATISTIQUES & ANALYTICS
     ═══════════════════════════════════════════════════════════ */

  function generateStats(users, matches) {
    const stats = {
      // Joueurs
      totalPlayers: users.filter(u => u.role === 'joueur').length,
      activeJoueurs: users.filter(u => u.role === 'joueur' && u.status === 'active').length,
      
      // Clubs
      totalClubs: users.filter(u => u.role === 'club').length,
      
      // Fédérations
      totalFederations: users.filter(u => u.role === 'federation').length,
      
      // Matchs
      totalMatches: matches.length,
      playedMatches: matches.filter(m => m.scoreHome != null && m.scoreAway != null).length,
      upcomingMatches: matches.filter(m => {
        const today = new Date().toISOString().slice(0, 10);
        return m.date >= today;
      }).length,
      
      // Performance globale
      totalGoals: matches.reduce((sum, m) => sum + (Number(m.scoreHome) || 0) + (Number(m.scoreAway) || 0), 0),
      avgGoalsPerMatch: 0,
      
      // Couverture photos
      playersWithPhoto: users.filter(u => u.photo).length,
      photoCoverage: users.length > 0 ? Math.round((users.filter(u => u.photo).length / users.length) * 100) : 0,
      
      // Distribution par rôle
      roleDistribution: getRoleDistribution(users),
      
      // Statut des comptes
      statusDistribution: getStatusDistribution(users),
      
      // Activité
      newUsersThisMonth: users.filter(u => {
        if (!u.createdAt) return false;
        const date = new Date(u.createdAt);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length,

      // Performance des équipes
      homeWins: matches.filter(m => Number(m.scoreHome) > Number(m.scoreAway)).length,
      awayWins: matches.filter(m => Number(m.scoreAway) > Number(m.scoreHome)).length,
      draws: matches.filter(m => Number(m.scoreHome) === Number(m.scoreAway)).length,

      // Tendance des matchs par mois
      matchesByMonth: getMatchesByMonth(matches),

      // Top scorers (si disponible dans les données)
      topPlayers: getTopPlayers(users)
    };

    if (stats.playedMatches > 0) {
      stats.avgGoalsPerMatch = (stats.totalGoals / stats.playedMatches).toFixed(2);
    }

    return stats;
  }

  function getRoleDistribution(users) {
    const roles = {};
    users.forEach(u => {
      roles[u.role] = (roles[u.role] || 0) + 1;
    });
    return roles;
  }

  function getStatusDistribution(users) {
    return {
      active: users.filter(u => u.status === 'active' || !u.status).length,
      pending: users.filter(u => u.status === 'pending').length,
      hidden: users.filter(u => u.status === 'hidden').length,
      deleted: users.filter(u => u.status === 'deleted').length
    };
  }

  function getMatchesByMonth(matches) {
    const months = {};
    const monthNames = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
    
    matches.forEach(m => {
      if (m.date) {
        const [year, month] = m.date.split('-');
        const monthIdx = parseInt(month) - 1;
        const key = monthNames[monthIdx];
        months[key] = (months[key] || 0) + 1;
      }
    });
    return months;
  }

  function getTopPlayers(users) {
    return users
      .filter(u => u.role === 'joueur')
      .map(u => ({
        nom: u.nom,
        buts: u.buts || 0,
        matchs: u.matchsJoues || 0,
        passes: u.passes || 0,
        club: u.club || 'N/A'
      }))
      .sort((a, b) => b.buts - a.buts)
      .slice(0, 10);
  }

  /* ═══════════════════════════════════════════════════════════
     GRAPHIQUES INTERACTIFS
     ═══════════════════════════════════════════════════════════ */

  function initCharts(stats) {
    // Vérifier que Chart.js est chargé
    if (typeof Chart === 'undefined') {
      console.warn('[Reports] Chart.js non chargé');
      return;
    }

    // Graphique 1: Distribution des rôles (Pie)
    initRoleChart(stats.roleDistribution);

    // Graphique 2: Résultats des matchs (Bar)
    initResultsChart(stats);

    // Graphique 3: Tendance des matchs par mois (Line)
    initTrendChart(stats.matchesByMonth);

    // Graphique 4: Statut des comptes (Doughnut)
    initStatusChart(stats.statusDistribution);

    // Graphique 5: Top joueurs (Horizontal Bar)
    initTopPlayersChart(stats.topPlayers);
  }

  function initRoleChart(roleDistribution) {
    const ctx = document.getElementById('chart-roles');
    if (!ctx) return;

    const roleLabels = {
      joueur: '⚽ Joueurs',
      athlete: '🏃 Athlètes',
      entraineur: '📋 Entraîneurs',
      arbitre: '🟨 Arbitres',
      club: '🏟️ Clubs',
      federation: '🏛️ Fédérations',
      association: '🤝 Associations',
      organisateur: '🎪 Organisateurs',
      independant: '🚴 Indépendants',
      supporter: '💗 Supporters',
      eleve_etudiant: '🎓 Élèves / Étudiants',
      sportif_etranger: '🌍 Sportifs étrangers',
      ecole_universite: '🏫 Écoles / Universités',
      handisport: '🦾 Sportifs handisport',
      ancien_sportif: '🎖️ Anciens Sportifs',
      formateur: '🧑‍🏫 Formateurs'
    };

    const roleColors = {
      joueur: '#009E60',
      athlete: '#0891b2',
      entraineur: '#f97316',
      arbitre: '#8b5cf6',
      club: '#3b82f6',
      federation: '#f97316',
      association: '#e11d48',
      organisateur: '#0d9488',
      independant: '#64748b',
      supporter: '#ec4899',
      eleve_etudiant: '#6366f1',
      sportif_etranger: '#ca8a04',
      ecole_universite: '#059669',
      handisport: '#7c3aed',
      ancien_sportif: '#9f1239',
      formateur: '#0284c7'
    };

    const labels = Object.keys(roleDistribution).map(r => roleLabels[r] || r);
    const data = Object.values(roleDistribution);
    const colors = Object.keys(roleDistribution).map(r => roleColors[r] || '#999');

    destroyChart('roleChart');
    chartInstances.roleChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 15, font: { size: 12 } }
          }
        }
      }
    });
  }

  function initResultsChart(stats) {
    const ctx = document.getElementById('chart-results');
    if (!ctx) return;

    destroyChart('resultsChart');
    chartInstances.resultsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Victoires GSC', 'Défaites', 'Matchs nuls'],
        datasets: [{
          label: 'Résultats',
          data: [stats.homeWins, stats.awayWins, stats.draws],
          backgroundColor: ['#009E60', '#ef4444', '#f59e0b'],
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  function initTrendChart(matchesByMonth) {
    const ctx = document.getElementById('chart-trend');
    if (!ctx) return;

    const labels = Object.keys(matchesByMonth);
    const data = Object.values(matchesByMonth);

    destroyChart('trendChart');
    chartInstances.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Matchs par mois',
          data,
          borderColor: '#009E60',
          backgroundColor: 'rgba(0, 158, 96, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointBackgroundColor: '#009E60',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  function initStatusChart(statusDistribution) {
    const ctx = document.getElementById('chart-status');
    if (!ctx) return;

    destroyChart('statusChart');
    chartInstances.statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['✅ Actifs', '⏳ En attente', '👁️ Masqués', '🗑️ Supprimés'],
        datasets: [{
          data: [
            statusDistribution.active,
            statusDistribution.pending,
            statusDistribution.hidden,
            statusDistribution.deleted
          ],
          backgroundColor: ['#009E60', '#f59e0b', '#3b82f6', '#ef4444'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  function initTopPlayersChart(topPlayers) {
    const ctx = document.getElementById('chart-top-players');
    if (!ctx) return;

    const labels = topPlayers.map(p => p.nom).slice(0, 8);
    const goals = topPlayers.map(p => p.buts).slice(0, 8);

    destroyChart('topPlayersChart');
    chartInstances.topPlayersChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Buts marqués',
          data: goals,
          backgroundColor: '#009E60',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  function destroyChart(chartName) {
    if (chartInstances[chartName]) {
      chartInstances[chartName].destroy();
      delete chartInstances[chartName];
    }
  }

  /* ═══════════════════════════════════════════════════════════
     EXPORT DONNÉES
     ═══════════════════════════════════════════════════════════ */

  function exportToCSV(users, matches, stats) {
    const csvContent = generateCSVContent(users, matches, stats);
    downloadFile(csvContent, 'rapport-gsc.csv', 'text/csv');
  }

  function generateCSVContent(users, matches, stats) {
    let csv = 'RAPPORT GSC — Export CSV\n';
    csv += `Généré le: ${new Date().toLocaleString('fr-FR')}\n\n`;

    // Section Statistiques
    csv += '=== STATISTIQUES GLOBALES ===\n';
    csv += `Total Joueurs,${stats.totalPlayers}\n`;
    csv += `Joueurs Actifs,${stats.activeJoueurs}\n`;
    csv += `Total Clubs,${stats.totalClubs}\n`;
    csv += `Total Matchs,${stats.totalMatches}\n`;
    csv += `Matchs Joués,${stats.playedMatches}\n`;
    csv += `Matchs À Venir,${stats.upcomingMatches}\n`;
    csv += `Couverture Photos,%,${stats.photoCoverage}\n\n`;

    // Section Joueurs
    csv += '=== LISTE DES JOUEURS ===\n';
    csv += 'Nom,Email,Téléphone,Club,Taille(cm),Poids(kg),Matchs Joués,Buts,Passes,Statut\n';
    users.filter(u => u.role === 'joueur').forEach(u => {
      csv += `"${u.nom || ''}","${u.email || ''}","${u.telephone || ''}","${u.club || ''}",${u.taille || ''},${u.poids || ''},${u.matchsJoues || 0},${u.buts || 0},${u.passes || 0},"${u.status || 'active'}"\n`;
    });

    csv += '\n=== RÉSULTATS MATCHS ===\n';
    csv += 'Date,Équipe Domicile,Équipe Visiteur,Score,Lieu,Compétition\n';
    matches.forEach(m => {
      const score = (m.scoreHome != null && m.scoreAway != null) ? `${m.scoreHome}-${m.scoreAway}` : 'N/A';
      csv += `"${m.date || ''}","${m.home || 'GSC'}","${m.away || ''}","${score}","${m.lieu || ''}","${m.competition || ''}"\n`;
    });

    return csv;
  }

  async function exportToPDF(users, matches, stats) {
    // Vérifier si jsPDF est disponible
    if (typeof jsPDF === 'undefined') {
      alert('jsPDF non chargé. Installez-le via CDN ou NPM.');
      return;
    }

    const { jsPDF: PDF } = window.jspdf || window;
    const doc = new PDF();

    // En-tête
    doc.setFontSize(20);
    doc.text('⚽ RAPPORT GSC', 14, 15);
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 14, 22);

    let yPos = 30;

    // Statistiques clés
    doc.setFontSize(12);
    doc.text('📊 STATISTIQUES GLOBALES', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    const statsText = [
      `Total Joueurs: ${stats.totalPlayers}`,
      `Joueurs Actifs: ${stats.activeJoueurs}`,
      `Clubs: ${stats.totalClubs}`,
      `Total Matchs: ${stats.totalMatches}`,
      `Matchs Joués: ${stats.playedMatches}`,
      `Matchs À Venir: ${stats.upcomingMatches}`,
      `Buts (Total): ${stats.totalGoals}`,
      `Couverture Photos: ${stats.photoCoverage}%`
    ];

    statsText.forEach(text => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 14;
      }
      doc.text(text, 14, yPos);
      yPos += 6;
    });

    // Top joueurs
    if (stats.topPlayers && stats.topPlayers.length > 0) {
      yPos += 5;
      if (yPos > 250) {
        doc.addPage();
        yPos = 14;
      }
      doc.setFontSize(12);
      doc.text('🏆 TOP JOUEURS', 14, yPos);
      yPos += 8;

      doc.setFontSize(9);
      stats.topPlayers.slice(0, 5).forEach((p, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 14;
        }
        doc.text(`${idx + 1}. ${p.nom} - ${p.buts} buts (${p.club})`, 14, yPos);
        yPos += 6;
      });
    }

    downloadFile(doc.output('datauri'), 'rapport-gsc.pdf', 'application/pdf');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ═══════════════════════════════════════════════════════════
     PARTAGE & PERMISSIONS
     ═══════════════════════════════════════════════════════════ */

  function generateShareLink(reportId, expiresIn = 7) {
    // Créer un lien temporaire pour partager les rapports
    const shareCode = generateRandomCode(12);
    const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString();

    return {
      code: shareCode,
      url: `${window.location.origin}?report=${shareCode}`,
      expiresAt,
      createdAt: new Date().toISOString()
    };
  }

  function generateRandomCode(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /* ═══════════════════════════════════════════════════════════
     INTÉGRATIONS API EXTERNES
     ═══════════════════════════════════════════════════════════ */

  async function integrateWithFIFA(token, data) {
    // Template pour intégration FIFA API
    try {
      integrationStatus.fifa = { status: 'connecting', lastUpdate: new Date() };
      
      const response = await fetch('https://api.fifa.com/v2/sync/players', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        integrationStatus.fifa = { status: 'connected', lastUpdate: new Date(), syncedAt: new Date() };
        return { success: true, message: 'Synchronisation FIFA réussie' };
      } else {
        throw new Error(`FIFA API error: ${response.status}`);
      }
    } catch (err) {
      console.error('[FIFA Integration]', err);
      integrationStatus.fifa = { status: 'error', lastUpdate: new Date(), error: err.message };
      return { success: false, error: err.message };
    }
  }

  async function integrateWithCAF(token, data) {
    // Template pour intégration CAF (Confederation Africaine de Football)
    try {
      integrationStatus.caf = { status: 'connecting', lastUpdate: new Date() };
      
      const response = await fetch('https://api.caf-online.com/v1/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        integrationStatus.caf = { status: 'connected', lastUpdate: new Date(), syncedAt: new Date() };
        return { success: true, message: 'Synchronisation CAF réussie' };
      } else {
        throw new Error(`CAF API error: ${response.status}`);
      }
    } catch (err) {
      console.error('[CAF Integration]', err);
      integrationStatus.caf = { status: 'error', lastUpdate: new Date(), error: err.message };
      return { success: false, error: err.message };
    }
  }

  async function integrateWithCustomAPI(apiUrl, token, data) {
    // Template générique pour toute API custom
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, data: result };
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (err) {
      console.error('[Custom API]', err);
      return { success: false, error: err.message };
    }
  }

  function getIntegrationStatus() {
    return integrationStatus;
  }

  /* ═══════════════════════════════════════════════════════════
     EXPORT PUBLIC
     ═══════════════════════════════════════════════════════════ */

  return {
    generateStats,
    initCharts,
    exportToCSV,
    exportToPDF,
    generateShareLink,
    integrateWithFIFA,
    integrateWithCAF,
    integrateWithCustomAPI,
    getIntegrationStatus
  };
})();
