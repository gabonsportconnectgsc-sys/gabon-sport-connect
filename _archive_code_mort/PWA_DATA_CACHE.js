/**
 * FIX_PWA_DATA_CACHE.js
 * 
 * Patch PWA pour votre app GSC/BONGSC
 * Ajoute le cache automatique des données + mode hors ligne
 * 
 * À ajouter AVANT les autres scripts Firebase/app
 */

// ============================================
// 1. INIT STORAGE MANAGER
// ============================================

console.log('[GSC PWA] Initialisation cache données...');

(async function initGSCPWA() {
  // Vérifier StorageManager
  if (typeof window.storageManager === 'undefined') {
    console.warn('[GSC PWA] StorageManager pas encore chargé');
    return;
  }

  // ============================================
  // 2. OVERRIDE loadGlobalStats() - CACHE STATS
  // ============================================
  
  const originalLoadGlobalStats = window.loadGlobalStats;
  window.loadGlobalStats = async function() {
    try {
      // Appeler la fonction originale
      const result = await originalLoadGlobalStats();
      
      // Cacher les stats
      if (window.global?.stats) {
        await window.storageManager.saveData('stats', {
          timestamp: Date.now(),
          data: window.global.stats
        });
        console.log('[GSC PWA] Stats cachées');
      }
      
      return result;
    } catch (error) {
      console.error('[GSC PWA] Erreur loadGlobalStats:', error);
      
      // Fallback: charger depuis cache
      if (!navigator.onLine) {
        const cachedStats = await window.storageManager.getAllData('stats');
        if (cachedStats.length > 0) {
          console.log('[GSC PWA] Stats chargées depuis cache');
          window.global = window.global || {};
          window.global.stats = cachedStats[0].data;
          window.renderDashboard?.();
        }
      }
    }
  };

  // ============================================
  // 3. OVERRIDE loadActors() - CACHE ACTEURS
  // ============================================
  
  const originalLoadActors = window.loadActors;
  window.loadActors = async function(onlyPending) {
    try {
      // Appeler la fonction originale
      const result = await originalLoadActors(onlyPending);
      
      // Cacher les acteurs
      if (window.global?.actors && Array.isArray(window.global.actors)) {
        await window.storageManager.saveData('actors', window.global.actors);
        console.log('[GSC PWA] Acteurs cachés:', window.global.actors.length);
      }
      
      return result;
    } catch (error) {
      console.error('[GSC PWA] Erreur loadActors:', error);
      
      // Fallback: charger depuis cache
      if (!navigator.onLine) {
        const cachedActors = await window.storageManager.getAllData('actors');
        if (cachedActors.length > 0) {
          console.log('[GSC PWA] Acteurs chargés depuis cache:', cachedActors.length);
          window.global = window.global || {};
          window.global.actors = cachedActors;
          window.renderActors?.(cachedActors);
        }
      }
    }
  };

  // ============================================
  // 4. OVERRIDE loadSites() - CACHE SITES
  // ============================================
  
  const originalLoadSites = window.loadSites;
  if (originalLoadSites) {
    window.loadSites = async function() {
      try {
        const result = await originalLoadSites();
        
        if (window.global?.sites && Array.isArray(window.global.sites)) {
          await window.storageManager.saveData('sites', window.global.sites);
          console.log('[GSC PWA] Sites cachés:', window.global.sites.length);
        }
        
        return result;
      } catch (error) {
        console.error('[GSC PWA] Erreur loadSites:', error);
        
        if (!navigator.onLine) {
          const cachedSites = await window.storageManager.getAllData('sites');
          if (cachedSites.length > 0) {
            console.log('[GSC PWA] Sites chargés depuis cache');
            window.global = window.global || {};
            window.global.sites = cachedSites;
            window.renderSitesList?.(cachedSites);
          }
        }
      }
    };
  }

  // ============================================
  // 5. OVERRIDE loadNewsFromDb() - CACHE NEWS
  // ============================================
  
  const originalLoadNewsFromDb = window.loadNewsFromDb;
  if (originalLoadNewsFromDb) {
    window.loadNewsFromDb = async function() {
      try {
        const result = await originalLoadNewsFromDb();
        
        if (window.global?.news && Array.isArray(window.global.news)) {
          await window.storageManager.saveData('news', window.global.news);
          console.log('[GSC PWA] News cachées:', window.global.news.length);
        }
        
        return result;
      } catch (error) {
        console.error('[GSC PWA] Erreur loadNewsFromDb:', error);
        
        if (!navigator.onLine) {
          const cachedNews = await window.storageManager.getAllData('news');
          if (cachedNews.length > 0) {
            console.log('[GSC PWA] News chargées depuis cache');
            window.global = window.global || {};
            window.global.news = cachedNews;
            window.renderNews?.();
          }
        }
      }
    };
  }

  // ============================================
  // 6. CHARGER LES DONNÉES EN CACHE AU DÉMARRAGE
  // ============================================
  
  async function loadCachedDataOnStartup() {
    if (!navigator.onLine) {
      console.log('[GSC PWA] Mode hors ligne - chargement cache...');
      
      // Charger stats
      const cachedStats = await window.storageManager.getAllData('stats');
      if (cachedStats.length > 0) {
        window.global = window.global || {};
        window.global.stats = cachedStats[0].data;
        console.log('[GSC PWA] Stats restaurées');
      }
      
      // Charger acteurs
      const cachedActors = await window.storageManager.getAllData('actors');
      if (cachedActors.length > 0) {
        window.global = window.global || {};
        window.global.actors = cachedActors;
        console.log('[GSC PWA] Acteurs restaurés:', cachedActors.length);
      }
      
      // Charger sites
      const cachedSites = await window.storageManager.getAllData('sites');
      if (cachedSites.length > 0) {
        window.global = window.global || {};
        window.global.sites = cachedSites;
        console.log('[GSC PWA] Sites restaurés');
      }
      
      // Charger news
      const cachedNews = await window.storageManager.getAllData('news');
      if (cachedNews.length > 0) {
        window.global = window.global || {};
        window.global.news = cachedNews;
        console.log('[GSC PWA] News restaurées');
      }
      
      // Rerender dashboard/acteurs
      setTimeout(() => {
        if (window.renderDashboard) window.renderDashboard();
        if (window.renderActors) window.renderActors(window.global?.actors || []);
      }, 100);
    }
  }

  // ============================================
  // 7. ÉCOUTER LES CHANGEMENTS DE CONNEXION
  // ============================================
  
  document.addEventListener('appOffline', async () => {
    console.log('[GSC PWA] Mode hors ligne');
    
    // Essayer de charger le cache
    const cachedActors = await window.storageManager.getAllData('actors');
    if (cachedActors.length > 0 && window.global) {
      window.global.actors = cachedActors;
      if (window.renderActors) window.renderActors(cachedActors);
    }
  });

  document.addEventListener('appOnline', async () => {
    console.log('[GSC PWA] Connexion rétablie - rafraîchir les données');
    
    // Recharger les données depuis Firebase
    if (window.loadGlobalStats) await window.loadGlobalStats();
    if (window.loadActors) await window.loadActors();
    if (window.loadSites) await window.loadSites();
    if (window.loadNewsFromDb) await window.loadNewsFromDb();
  });

  // ============================================
  // 8. EXÉCUTION INITIALE
  // ============================================
  
  // Attendre que Firebase soit prêt
  document.addEventListener('firebase-ready', () => {
    console.log('[GSC PWA] Firebase prêt - charger cache au démarrage');
    loadCachedDataOnStartup();
  });

  // Si Firebase est déjà prêt
  if (window._firebaseReady) {
    loadCachedDataOnStartup();
  }

  console.log('[GSC PWA] ✅ Initialisation complétée');
})();

// ============================================
// DIAGNOSTIC CONSOLE
// ============================================

window.GSC_PWA = {
  showCachedData: async () => {
    console.log('%c=== DONNÉES EN CACHE ===', 'font-weight: bold; color: #009e60; font-size: 14px');
    
    const stats = await window.storageManager.getAllData('stats');
    console.log('Stats:', stats);
    
    const actors = await window.storageManager.getAllData('actors');
    console.log('Acteurs:', actors.length, 'éléments');
    
    const sites = await window.storageManager.getAllData('sites');
    console.log('Sites:', sites.length, 'éléments');
    
    const news = await window.storageManager.getAllData('news');
    console.log('News:', news.length, 'éléments');
  },
  
  clearCache: async () => {
    await window.storageManager.clearAllData();
    console.log('✅ Cache vidé');
  },
  
  forceSync: async () => {
    console.log('Forçage sync...');
    if (window.loadGlobalStats) await window.loadGlobalStats();
    if (window.loadActors) await window.loadActors();
    if (window.loadSites) await window.loadSites();
    if (window.loadNewsFromDb) await window.loadNewsFromDb();
    console.log('✅ Sync terminée');
  }
};

console.log('%c[GSC PWA] Diagnostic disponible: GSC_PWA.showCachedData()', 'color: #3b82f6; font-style: italic');
