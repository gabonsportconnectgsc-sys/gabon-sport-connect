/**
 * 📊 ANALYTICS MODULE - Tableaux de Bord et Rapports
 * Graphiques, KPI, tendances, exports
 */

class AnalyticsModule {
  constructor(db, dataModule) {
    this.db = db;
    this.dataModule = dataModule;
    this.charts = new Map();
  }

  /**
   * 🔧 Initialiser le module
   */
  async init() {
    console.log('📊 Initializing Analytics Module...');
    await this.loadChartsLibrary();
    return this;
  }

  /**
   * 📚 Charger Chart.js
   */
  async loadChartsLibrary() {
    if (window.Chart) {
      console.log('✅ Chart.js already loaded');
      return;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
      script.onload = () => {
        console.log('✅ Chart.js loaded');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * 📈 Obtenir les KPI principales
   */
  async getKPIs() {
    try {
      console.log('📈 Calculating KPIs...');

      const users = await this.dataModule.loadCollection('users');
      const news = await this.dataModule.loadCollection('actualites');
      const sites = await this.dataModule.loadCollection('sitesSportifs');

      const activeUsers = users.filter(u => u.status === 'active').length;
      const pendingUsers = users.filter(u => u.status === 'pending').length;
      const clubs = users.filter(u => u.role === 'club').length;

      // Calculer la tendance mensuelle
      const thisMonth = new Date();
      thisMonth.setDate(1);
      
      const newUsersThisMonth = users.filter(u => 
        new Date(u.createdAt?.toDate?.() || u.createdAt) >= thisMonth
      ).length;

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      
      const lastMonthEnd = new Date();
      lastMonthEnd.setDate(1);
      
      const newUsersLastMonth = users.filter(u => {
        const date = new Date(u.createdAt?.toDate?.() || u.createdAt);
        return date >= lastMonth && date < lastMonthEnd;
      }).length;

      const usersTrend = newUsersLastMonth > 0 
        ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
        : 0;

      return {
        totalUsers: users.length,
        activeUsers,
        pendingUsers,
        clubs,
        totalNews: news.length,
        totalSites: sites.length,
        usersTrend: usersTrend > 0 ? `+${usersTrend}%` : `${usersTrend}%`,
        alerts: pendingUsers > 0 ? pendingUsers : 0
      };
    } catch (error) {
      console.error('❌ KPI calculation error:', error);
      return {};
    }
  }

  /**
   * 📉 Graphique des utilisateurs par statut
   */
  async createUserStatusChart(canvasId) {
    try {
      const users = await this.dataModule.loadCollection('users');
      
      const statuses = {};
      users.forEach(u => {
        const status = u.status || 'unknown';
        statuses[status] = (statuses[status] || 0) + 1;
      });

      const ctx = document.getElementById(canvasId);
      if (!ctx) {
        console.warn(`Canvas #${canvasId} not found`);
        return;
      }

      const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(statuses),
          datasets: [{
            data: Object.values(statuses),
            backgroundColor: [
              '#10b981', // active - green
              '#fbbf24', // pending - yellow
              '#ef4444', // rejected - red
              '#9ca3af'  // other - gray
            ],
            borderColor: 'white',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });

      this.charts.set(canvasId, chart);
      console.log('✅ User status chart created');
      return chart;
    } catch (error) {
      console.error('❌ Chart error:', error);
    }
  }

  /**
   * 📊 Graphique des actualités par mois
   */
  async createNewsTimelineChart(canvasId) {
    try {
      const news = await this.dataModule.loadCollection('actualites');
      
      // Grouper par mois
      const monthlyData = {};
      const last6Months = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = date.toLocaleString('fr-FR', { month: 'short', year: '2-digit' });
        last6Months.push(key);
        monthlyData[key] = 0;
      }

      news.forEach(n => {
        const date = new Date(n.createdAt?.toDate?.() || n.createdAt);
        const key = date.toLocaleString('fr-FR', { month: 'short', year: '2-digit' });
        if (monthlyData.hasOwnProperty(key)) {
          monthlyData[key]++;
        }
      });

      const ctx = document.getElementById(canvasId);
      if (!ctx) {
        console.warn(`Canvas #${canvasId} not found`);
        return;
      }

      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: last6Months,
          datasets: [{
            label: 'Actualités publiées',
            data: last6Months.map(m => monthlyData[m]),
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointBackgroundColor: '#f97316',
            pointBorderColor: 'white',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });

      this.charts.set(canvasId, chart);
      console.log('✅ News timeline chart created');
      return chart;
    } catch (error) {
      console.error('❌ Chart error:', error);
    }
  }

  /**
   * 👥 Graphique de croissance utilisateurs
   */
  async createUserGrowthChart(canvasId) {
    try {
      const users = await this.dataModule.loadCollection('users');
      
      // Grouper par semaine
      const weeklyData = {};
      const last8Weeks = [];
      
      for (let i = 7; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i * 7);
        const key = `Sem ${Math.ceil((date.getDate()) / 7)}`;
        last8Weeks.push(key);
        weeklyData[key] = 0;
      }

      users.forEach(u => {
        const date = new Date(u.createdAt?.toDate?.() || u.createdAt);
        const week = Math.ceil((date.getDate()) / 7);
        const key = `Sem ${week}`;
        if (weeklyData.hasOwnProperty(key)) {
          weeklyData[key]++;
        }
      });

      const ctx = document.getElementById(canvasId);
      if (!ctx) {
        console.warn(`Canvas #${canvasId} not found`);
        return;
      }

      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: last8Weeks,
          datasets: [{
            label: 'Nouveaux utilisateurs',
            data: last8Weeks.map(w => weeklyData[w]),
            backgroundColor: '#06b6d4',
            borderRadius: 4,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });

      this.charts.set(canvasId, chart);
      console.log('✅ User growth chart created');
      return chart;
    } catch (error) {
      console.error('❌ Chart error:', error);
    }
  }

  /**
   * 📄 Générer un rapport PDF
   */
  async generateReport(options = {}) {
    try {
      console.log('📄 Generating report...');

      const kpis = await this.getKPIs();
      const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = options.endDate || new Date();

      const report = {
        title: 'Rapport d\'Administration',
        generatedAt: new Date().toLocaleString('fr-FR'),
        period: `${startDate.toLocaleDateString('fr-FR')} à ${endDate.toLocaleDateString('fr-FR')}`,
        kpis,
        sections: []
      };

      // Section Utilisateurs
      const users = await this.dataModule.loadCollection('users');
      const usersInPeriod = users.filter(u => {
        const date = new Date(u.createdAt?.toDate?.() || u.createdAt);
        return date >= startDate && date <= endDate;
      });

      report.sections.push({
        title: '👥 Utilisateurs',
        metrics: {
          'Total': users.length,
          'Actifs': users.filter(u => u.status === 'active').length,
          'En attente': users.filter(u => u.status === 'pending').length,
          'Nouveaux (période)': usersInPeriod.length
        }
      });

      // Section Actualités
      const news = await this.dataModule.loadCollection('actualites');
      const newsInPeriod = news.filter(n => {
        const date = new Date(n.createdAt?.toDate?.() || n.createdAt);
        return date >= startDate && date <= endDate;
      });

      report.sections.push({
        title: '📰 Actualités',
        metrics: {
          'Total': news.length,
          'Publiées (période)': newsInPeriod.length,
          'Likes total': news.reduce((sum, n) => sum + (n.likes || 0), 0)
        }
      });

      // Section Sites
      const sites = await this.dataModule.loadCollection('sitesSportifs');
      report.sections.push({
        title: '📍 Sites Sportifs',
        metrics: {
          'Total': sites.length,
          'Actifs': sites.filter(s => s.active !== false).length
        }
      });

      console.log('✅ Report generated');
      return report;
    } catch (error) {
      console.error('❌ Report generation error:', error);
      throw error;
    }
  }

  /**
   * 💾 Exporter le rapport en JSON
   */
  async exportReportJSON(report) {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 📊 Exporter le rapport en CSV
   */
  async exportReportCSV(report) {
    let csv = 'Rapport d\'Administration\n';
    csv += `Généré le: ${report.generatedAt}\n`;
    csv += `Période: ${report.period}\n\n`;

    csv += 'KPI PRINCIPALES\n';
    csv += Object.entries(report.kpis)
      .map(([key, value]) => `${key},${value}`)
      .join('\n');

    csv += '\n\nSECTIONS\n';
    report.sections.forEach(section => {
      csv += `\n${section.title}\n`;
      csv += Object.entries(section.metrics)
        .map(([key, value]) => `${key},${value}`)
        .join('\n');
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 📋 Obtenir les tendances
   */
  async getTrends() {
    try {
      const users = await this.dataModule.loadCollection('users');
      const news = await this.dataModule.loadCollection('actualites');

      const trends = {
        userGrowth: this.calculateTrend(users),
        newsActivity: this.calculateTrend(news),
        topUsersRoles: this.getTopItems(users, 'role'),
        topNewsTags: this.getTopItems(news, 'tags')
      };

      return trends;
    } catch (error) {
      console.error('❌ Trends calculation error:', error);
      return {};
    }
  }

  /**
   * 🔢 Calculer une tendance
   */
  calculateTrend(items) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayCount = items.filter(i => {
      const date = new Date(i.createdAt?.toDate?.() || i.createdAt);
      return date >= today;
    }).length;

    const yesterdayCount = items.filter(i => {
      const date = new Date(i.createdAt?.toDate?.() || i.createdAt);
      return date >= yesterday && date < today;
    }).length;

    const change = yesterdayCount > 0 
      ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
      : todayCount > 0 ? 100 : 0;

    return {
      today: todayCount,
      yesterday: yesterdayCount,
      change: change > 0 ? `+${change}%` : `${change}%`,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    };
  }

  /**
   * 🏆 Obtenir les éléments les plus populaires
   */
  getTopItems(items, field, limit = 5) {
    const counts = {};
    items.forEach(item => {
      const value = item[field];
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  /**
   * 🗑️ Nettoyer les graphiques
   */
  destroyChart(canvasId) {
    if (this.charts.has(canvasId)) {
      this.charts.get(canvasId).destroy();
      this.charts.delete(canvasId);
    }
  }

  /**
   * 🛑 Nettoyer tous les graphiques
   */
  destroyAllCharts() {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
  }
}

// Export
export default AnalyticsModule;
