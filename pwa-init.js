/**
 * PWA Integration Script
 * À ajouter dans le <head> de index.html
 */

(function() {
  'use strict';

  // Vérifier le support PWA
  if (!('serviceWorker' in navigator) || !('indexedDB' in window)) {
    console.warn('[PWA] Service Worker ou IndexedDB non supporté');
    return;
  }

  // ============================================
  // 1. INITIALISATION DU SERVICE WORKER
  // ============================================
  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return Promise.reject(new Error('Service Worker not supported'));
    }

    return navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none'
    })
    .then(registration => {
      console.log('[PWA] Service Worker enregistré:', registration);

      // Vérifier les mises à jour toutes les heures
      setInterval(() => {
        registration.update().catch(error => {
          console.error('[PWA] Erreur vérification mises à jour:', error);
        });
      }, 3600000);

      // Notifier quand une nouvelle version est disponible
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdatePrompt();
          }
        });
      });

      return registration;
    })
    .catch(error => {
      console.error('[PWA] Erreur enregistrement Service Worker:', error);
      // Continuer même sans Service Worker
    });
  }

  // ============================================
  // 2. INITIALISATION STORAGE MANAGER
  // ============================================
  async function initStorageManager() {
    try {
      // Vérifier le script est chargé
      if (typeof StorageManager === 'undefined') {
        console.error('[PWA] StorageManager non chargé');
        return null;
      }

      const manager = new StorageManager();
      await manager.init();
      
      // Rendre global
      window.storageManager = manager;
      
      console.log('[PWA] StorageManager initialisé');
      return manager;
    } catch (error) {
      console.error('[PWA] Erreur initialisation StorageManager:', error);
      return null;
    }
  }

  // ============================================
  // 3. INTÉGRATION AVEC FIREBASE
  // ============================================
  function setupStorageSync(storageManager) {
    if (!window.db) {
      console.warn('[PWA] Firebase Firestore non trouvé');
      return;
    }

    // Override des fonctions de récupération pour cacher les données
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const promise = originalFetch.apply(this, args);
      
      // Cacher les réponses Firebase
      promise
        .then(response => {
          if (response.ok && response.headers.get('content-type')?.includes('json')) {
            const clone = response.clone();
            clone.json().then(data => {
              // Cacher automatiquement
              storageManager.saveData('cache', {
                url: args[0],
                data: data,
                timestamp: Date.now()
              }).catch(error => console.error('[PWA] Erreur cache:', error));
            });
          }
          return response;
        })
        .catch(error => {
          console.log('[PWA] Erreur fetch, tentative cache...');
        });

      return promise;
    };

    // Écouter les changements de session
    if (window.auth) {
      window.auth.onAuthStateChanged((user) => {
        if (user) {
          storageManager.saveSession({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: user.customClaims?.role || 'user'
          });
        } else {
          storageManager.clearAllData();
        }
      });
    }
  }

  // ============================================
  // 4. UI POUR INSTALLATION ET MISE À JOUR
  // ============================================
  
  let deferredPrompt;
  
  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;
      showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Application installée');
      hideInstallButton();
      deferredPrompt = null;
    });
  }

  function showInstallButton() {
    const existingBtn = document.getElementById('install-pwa-btn');
    if (existingBtn) return;

    const btn = document.createElement('button');
    btn.id = 'install-pwa-btn';
    btn.setAttribute('aria-label', 'Installer BONGSC');
    btn.innerHTML = '⬇️ Installer l\'app';
    btn.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #009e60 0%, #005c39 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 158, 96, 0.3);
      z-index: 50;
      animation: slideInUp 0.3s ease;
    `;

    btn.onclick = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('[PWA] Installation acceptée');
          }
          deferredPrompt = null;
          hideInstallButton();
        });
      }
    };

    document.body.appendChild(btn);
  }

  function hideInstallButton() {
    const btn = document.getElementById('install-pwa-btn');
    if (btn) btn.remove();
  }

  function showUpdatePrompt() {
    // Créer une notification de mise à jour
    const toast = document.createElement('div');
    toast.id = 'update-toast';
    toast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 999;
        display: flex;
        gap: 12px;
        align-items: center;
      ">
        <span style="flex: 1; font-size: 14px; font-weight: 500;">
          ✨ Une nouvelle version est disponible
        </span>
        <button onclick="location.reload()" style="
          background: #009e60;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        ">Mettre à jour</button>
      </div>
    `;
    document.body.appendChild(toast);

    // Auto-remove after 10 seconds
    setTimeout(() => toast.remove(), 10000);
  }

  // ============================================
  // 5. MONITORING ET INDICATEURS
  // ============================================

  function setupNetworkMonitoring() {
    const updateStatus = () => {
      const isOnline = navigator.onLine;
      const statusEl = document.getElementById('connection-status');
      
      if (!statusEl) {
        const indicator = document.createElement('div');
        indicator.id = 'connection-status';
        indicator.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: ${isOnline ? '#009e60' : '#ef4444'};
          z-index: 1000;
          transition: background 0.3s;
        `;
        document.body.appendChild(indicator);
      } else {
        statusEl.style.background = isOnline ? '#009e60' : '#ef4444';
      }

      // Dispatcher des événements personnalisés
      document.dispatchEvent(new CustomEvent('connectionChanged', {
        detail: { isOnline }
      }));
    };

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
  }

  // ============================================
  // 6. INITIALISATION GLOBALE
  // ============================================

  async function initPWA() {
    console.log('[PWA] Initialisation...');

    // Charger le StorageManager script
    if (typeof StorageManager === 'undefined') {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = '/storage-manager.js';
        script.onload = () => initPWA();
        script.onerror = () => {
          console.error('[PWA] Impossible de charger StorageManager');
          resolve();
        };
        document.head.appendChild(script);
      });
    }

    try {
      // 1. Service Worker
      await initServiceWorker();

      // 2. StorageManager
      const storageManager = await initStorageManager();

      // 3. Setup pour Firebase
      setupStorageSync(storageManager);

      // 4. UI Installation
      setupInstallPrompt();

      // 5. Network monitoring
      setupNetworkMonitoring();

      console.log('[PWA] Initialisation complétée ✓');
      document.dispatchEvent(new CustomEvent('pwaReady'));

    } catch (error) {
      console.error('[PWA] Erreur initialisation:', error);
    }
  }

  // ============================================
  // 7. DÉMARRAGE
  // ============================================

  // Démarrer quand le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWA);
  } else {
    initPWA();
  }

  // Export global
  window.PWA = {
    initPWA,
    showInstallButton,
    hideInstallButton
  };
})();
