/**
 * PWA TEST SUITE
 * À exécuter dans la console du navigateur pour vérifier la PWA
 */

console.log('%c=== PWA TEST SUITE ===', 'font-size: 16px; font-weight: bold; color: #009e60');

// ============================================
// 1. VÉRIFIER LE SERVICE WORKER
// ============================================
console.log('\n%c1. Service Worker', 'font-weight: bold; color: #001a4d');

async function testServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.error('❌ Service Worker non supporté');
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) {
      console.warn('⚠️ Aucun Service Worker enregistré');
      return false;
    }

    registrations.forEach(reg => {
      console.log(`✅ Service Worker enregistré`);
      console.log(`   Scope: ${reg.scope}`);
      console.log(`   Active: ${reg.active ? 'Oui' : 'Non'}`);
      console.log(`   Installing: ${reg.installing ? 'Oui' : 'Non'}`);
      console.log(`   Waiting: ${reg.waiting ? 'Oui' : 'Non'}`);
    });

    return true;
  } catch (error) {
    console.error('❌ Erreur vérification Service Worker:', error);
    return false;
  }
}

// ============================================
// 2. VÉRIFIER INDEXEDDB
// ============================================
console.log('\n%c2. IndexedDB', 'font-weight: bold; color: #001a4d');

async function testIndexedDB() {
  if (!('indexedDB' in window)) {
    console.error('❌ IndexedDB non supporté');
    return false;
  }

  try {
    const dbs = await indexedDB.databases();
    console.log(`✅ IndexedDB supporté`);
    console.log(`   Bases de données:`, dbs.map(db => db.name));

    // Vérifier BONGSC_DB
    return new Promise((resolve) => {
      const request = indexedDB.open('BONGSC_DB');
      request.onsuccess = () => {
        const db = request.result;
        console.log(`✅ BONGSC_DB ouvert`);
        console.log(`   Stores: ${Array.from(db.objectStoreNames)}`);
        db.close();
        resolve(true);
      };
      request.onerror = () => {
        console.warn('⚠️ BONGSC_DB non trouvé');
        resolve(false);
      };
    });
  } catch (error) {
    console.error('❌ Erreur IndexedDB:', error);
    return false;
  }
}

// ============================================
// 3. VÉRIFIER LE MANIFEST
// ============================================
console.log('\n%c3. Web Manifest', 'font-weight: bold; color: #001a4d');

async function testManifest() {
  try {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      console.warn('⚠️ Manifest link non trouvé');
      return false;
    }

    const manifestUrl = link.getAttribute('href');
    console.log(`✅ Manifest trouvé: ${manifestUrl}`);

    const response = await fetch(manifestUrl);
    if (!response.ok) {
      console.error(`❌ Erreur chargement manifest: ${response.status}`);
      return false;
    }

    const manifest = await response.json();
    console.log(`✅ Manifest valide`);
    console.log(`   Nom: ${manifest.name}`);
    console.log(`   Short name: ${manifest.short_name}`);
    console.log(`   Icons: ${manifest.icons?.length || 0}`);
    console.log(`   Theme color: ${manifest.theme_color}`);

    return true;
  } catch (error) {
    console.error('❌ Erreur manifest:', error);
    return false;
  }
}

// ============================================
// 4. VÉRIFIER LE STORAGE MANAGER
// ============================================
console.log('\n%c4. StorageManager', 'font-weight: bold; color: #001a4d');

async function testStorageManager() {
  if (typeof window.storageManager === 'undefined') {
    console.warn('⚠️ StorageManager non initialisé');
    return false;
  }

  try {
    console.log(`✅ StorageManager trouvé`);
    console.log(`   Online status: ${window.storageManager.getOnlineStatus() ? 'En ligne' : 'Hors ligne'}`);

    // Tester le stockage
    const testData = {
      test: 'data',
      timestamp: Date.now()
    };

    await window.storageManager.saveData('users', testData);
    console.log(`✅ Données de test sauvegardées`);

    const retrieved = await window.storageManager.getAllData('users');
    console.log(`✅ Données récupérées: ${retrieved.length} élément(s)`);

    return true;
  } catch (error) {
    console.error('❌ Erreur StorageManager:', error);
    return false;
  }
}

// ============================================
// 5. VÉRIFIER LES CACHES
// ============================================
console.log('\n%c5. Cache Storage', 'font-weight: bold; color: #001a4d');

async function testCacheStorage() {
  if (!('caches' in window)) {
    console.error('❌ Cache Storage non supporté');
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    console.log(`✅ Cache Storage supporté`);
    console.log(`   Caches: ${cacheNames.join(', ') || 'Aucun'}`);

    // Lister le contenu des caches
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      console.log(`   ${cacheName}: ${keys.length} URL(s)`);
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur Cache Storage:', error);
    return false;
  }
}

// ============================================
// 6. VÉRIFIER LA CONNECTIVITÉ
// ============================================
console.log('\n%c6. Connectivité', 'font-weight: bold; color: #001a4d');

function testConnectivity() {
  console.log(`✅ Statut de la connexion: ${navigator.onLine ? 'En ligne' : 'Hors ligne'}`);
  console.log(`   Effectue Type: ${navigator.connection?.effectiveType || 'N/A'}`);
  console.log(`   Downlink: ${navigator.connection?.downlink || 'N/A'} Mbps`);
  console.log(`   RTT: ${navigator.connection?.rtt || 'N/A'} ms`);

  return true;
}

// ============================================
// 7. VÉRIFIER LES META TAGS
// ============================================
console.log('\n%c7. Meta Tags', 'font-weight: bold; color: #001a4d');

function testMetaTags() {
  const requiredTags = [
    { name: 'theme-color', property: 'name' },
    { name: 'viewport', property: 'name' },
    { name: 'apple-mobile-web-app-capable', property: 'name' },
    { name: 'apple-mobile-web-app-status-bar-style', property: 'name' }
  ];

  let allPresent = true;
  requiredTags.forEach(tag => {
    const found = document.querySelector(`meta[${tag.property}="${tag.name}"]`);
    if (found) {
      console.log(`✅ Meta: ${tag.name}`);
    } else {
      console.warn(`⚠️ Meta manquant: ${tag.name}`);
      allPresent = false;
    }
  });

  return allPresent;
}

// ============================================
// 8. VÉRIFIER L'INSTALLATION
// ============================================
console.log('\n%c8. Installation', 'font-weight: bold; color: #001a4d');

function testInstallation() {
  if ('onbeforeinstallprompt' in window) {
    console.log(`✅ Installation PWA supportée`);
  } else {
    console.warn(`⚠️ Installation PWA non supportée (navigateur incompatible)`);
  }

  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log(`✅ Application en mode standalone (installée)`);
  } else if (window.navigator.standalone === true) {
    console.log(`✅ Application en mode standalone (iOS)`);
  } else {
    console.log(`ℹ️ Application non encore installée`);
  }

  return true;
}

// ============================================
// 9. TEST DE SYNCHRONISATION
// ============================================
console.log('\n%c9. Synchronisation', 'font-weight: bold; color: #001a4d');

async function testSync() {
  if ('SyncManager' in window) {
    console.log(`✅ Background Sync supportée`);
    try {
      if (navigator.serviceWorker.controller) {
        await navigator.serviceWorker.ready;
        console.log(`✅ Service Worker prêt pour la sync`);
      }
    } catch (error) {
      console.warn(`⚠️ Erreur vérification sync:`, error);
    }
  } else {
    console.warn(`⚠️ Background Sync non supportée`);
  }

  return true;
}

// ============================================
// RAPPORT COMPLET
// ============================================

async function runAllTests() {
  console.log('\n%c=== RAPPORT COMPLET ===', 'font-size: 14px; font-weight: bold; color: #009e60; background: #f0faf5; padding: 10px');

  const results = {
    'Service Worker': await testServiceWorker(),
    'IndexedDB': await testIndexedDB(),
    'Web Manifest': await testManifest(),
    'StorageManager': await testStorageManager(),
    'Cache Storage': await testCacheStorage(),
    'Connectivité': testConnectivity(),
    'Meta Tags': testMetaTags(),
    'Installation': testInstallation(),
    'Synchronisation': await testSync()
  };

  const passed = Object.values(results).filter(v => v).length;
  const total = Object.keys(results).length;

  console.log('\n%c=== RÉSUMÉ ===', 'font-size: 12px; font-weight: bold; color: #001a4d');
  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✅' : '❌';
    console.log(`${icon} ${test}`);
  });

  console.log(`\n🎯 Score: ${passed}/${total} tests réussis`);

  if (passed === total) {
    console.log('%c✨ PWA PARFAITEMENT CONFIGURÉE ✨', 'font-size: 14px; font-weight: bold; color: white; background: #009e60; padding: 10px; border-radius: 4px');
  } else if (passed >= total * 0.7) {
    console.log('%c⚠️ PWA fonctionnelle mais amélioration possible', 'font-size: 12px; font-weight: bold; color: white; background: #f59e0b; padding: 10px; border-radius: 4px');
  } else {
    console.log('%c❌ Configuration PWA incomplète', 'font-size: 12px; font-weight: bold; color: white; background: #ef4444; padding: 10px; border-radius: 4px');
  }

  return results;
}

// ============================================
// UTILITAIRES SUPPLÉMENTAIRES
// ============================================

// Fonction pour forcer la mise à jour du Service Worker
window.PWATest = {
  runAllTests,
  updateServiceWorker: async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.update();
      console.log('✅ Service Worker mis à jour');
    }
  },
  clearCache: async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('✅ Cache vidé');
  },
  clearStorage: async () => {
    if (window.storageManager) {
      await window.storageManager.clearAllData();
      console.log('✅ Stockage vidé');
    }
  },
  showStorageInfo: async () => {
    if (!navigator.storage) {
      console.warn('❌ Storage API non disponible');
      return;
    }

    const estimate = await navigator.storage.estimate();
    console.log('%cStorage Estimate:', 'font-weight: bold');
    console.log(`Utilisé: ${(estimate.usage / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Quota: ${(estimate.quota / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Pourcentage: ${((estimate.usage / estimate.quota) * 100).toFixed(1)}%`);
  }
};

// Lancer les tests automatiquement
console.log('\n%c💡 Pour exécuter les tests complets, tapez: PWATest.runAllTests()', 'color: #3b82f6; font-style: italic');

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testServiceWorker, testIndexedDB, testManifest, testStorageManager, runAllTests };
}
