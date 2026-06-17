/**
 * StorageManager - Gestion du stockage local avec IndexedDB et LocalStorage
 * Persiste les données de l'application pour fonctionnement hors ligne
 */

const DB_NAME = 'BONGSC_DB';
const DB_VERSION = 1;

class StorageManager {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.pendingChanges = new Map();
    this.syncCallbacks = [];
    
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Initialise la base de données IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[StorageManager] Erreur ouverture DB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[StorageManager] DB initialisée');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Stores pour les données
        this.createObjectStore(db, 'users', 'uid');
        this.createObjectStore(db, 'actors', 'uid');
        this.createObjectStore(db, 'sites', 'id');
        this.createObjectStore(db, 'news', 'id');
        this.createObjectStore(db, 'mandats', 'id');
        this.createObjectStore(db, 'photos', 'id');
        
        // Store pour la session utilisateur
        this.createObjectStore(db, 'session', 'key');
        
        // Store pour les changements en attente
        this.createObjectStore(db, 'pending', 'id', { autoIncrement: true });
        
        // Store pour les métadonnées
        this.createObjectStore(db, 'metadata', 'key');
        
        console.log('[StorageManager] Schéma DB créé');
      };
    });
  }

  /**
   * Crée un object store s'il n'existe pas
   */
  createObjectStore(db, storeName, keyPath, options = {}) {
    if (!db.objectStoreNames.contains(storeName)) {
      try {
        db.createObjectStore(storeName, { keyPath, ...options });
      } catch (error) {
        console.warn(`[StorageManager] Store ${storeName} existe déjà`);
      }
    }
  }

  /**
   * Sauvegarde la session utilisateur
   */
  async saveSession(sessionData) {
    try {
      const store = await this.getStore('session', 'readwrite');
      const userData = {
        key: 'currentUser',
        uid: sessionData.uid,
        role: sessionData.role,
        email: sessionData.email,
        displayName: sessionData.displayName,
        photoURL: sessionData.photoURL,
        timestamp: Date.now()
      };
      await this.putData(store, userData);
      
      // Sauvegarder aussi dans localStorage pour accès rapide
      localStorage.setItem('bongsc_session', JSON.stringify(userData));
      
      console.log('[StorageManager] Session sauvegardée');
    } catch (error) {
      console.error('[StorageManager] Erreur sauvegarde session:', error);
    }
  }

  /**
   * Récupère la session utilisateur
   */
  async getSession() {
    try {
      // D'abord vérifier localStorage pour accès rapide
      const cached = localStorage.getItem('bongsc_session');
      if (cached) {
        return JSON.parse(cached);
      }

      const store = await this.getStore('session', 'readonly');
      const session = await this.getData(store, 'currentUser');
      return session;
    } catch (error) {
      console.error('[StorageManager] Erreur lecture session:', error);
      return null;
    }
  }

  /**
   * Sauvegarde des données (acteurs, sites, news, etc.)
   */
  async saveData(storeName, data) {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      
      if (Array.isArray(data)) {
        for (const item of data) {
          await this.putData(store, item);
        }
      } else {
        await this.putData(store, data);
      }
      
      // Mettre à jour les métadonnées
      await this.updateMetadata(storeName);
      
      console.log(`[StorageManager] Données ${storeName} sauvegardées`);
    } catch (error) {
      console.error(`[StorageManager] Erreur sauvegarde ${storeName}:`, error);
    }
  }

  /**
   * Récupère les données du store
   */
  async getData(store, key) {
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère toutes les données d'un store
   */
  async getAllData(storeName) {
    try {
      const store = await this.getStore(storeName, 'readonly');
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`[StorageManager] Erreur lecture ${storeName}:`, error);
      return [];
    }
  }

  /**
   * Ajoute des données au store
   */
  putData(store, data) {
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtient un store
   */
  async getStore(storeName, mode = 'readonly') {
    if (!this.db) {
      await this.init();
    }
    return this.db.transaction(storeName, mode).objectStore(storeName);
  }

  /**
   * Enregistre un changement en attente
   */
  async addPendingChange(changeData) {
    try {
      const store = await this.getStore('pending', 'readwrite');
      const change = {
        type: changeData.type, // 'create', 'update', 'delete'
        storeName: changeData.storeName,
        data: changeData.data,
        timestamp: Date.now(),
        synced: false
      };
      
      const id = await this.putData(store, change);
      this.pendingChanges.set(id, change);
      
      console.log('[StorageManager] Changement en attente enregistré:', id);
      
      // Déclencher la synchronisation si en ligne
      if (this.isOnline) {
        this.syncData();
      }
      
      return id;
    } catch (error) {
      console.error('[StorageManager] Erreur ajout changement en attente:', error);
    }
  }

  /**
   * Récupère tous les changements en attente
   */
  async getPendingChanges() {
    try {
      return await this.getAllData('pending');
    } catch (error) {
      console.error('[StorageManager] Erreur lecture changements en attente:', error);
      return [];
    }
  }

  /**
   * Supprime un changement après synchronisation
   */
  async removePendingChange(id) {
    try {
      const store = await this.getStore('pending', 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => {
          this.pendingChanges.delete(id);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[StorageManager] Erreur suppression changement:', error);
    }
  }

  /**
   * Met à jour les métadonnées d'un store
   */
  async updateMetadata(storeName) {
    try {
      const store = await this.getStore('metadata', 'readwrite');
      const metadata = {
        key: `${storeName}_lastUpdate`,
        timestamp: Date.now(),
        count: (await this.getAllData(storeName)).length
      };
      await this.putData(store, metadata);
    } catch (error) {
      console.error('[StorageManager] Erreur update métadonnées:', error);
    }
  }

  /**
   * Récupère les métadonnées d'un store
   */
  async getMetadata(storeName) {
    try {
      const store = await this.getStore('metadata', 'readonly');
      return await this.getData(store, `${storeName}_lastUpdate`);
    } catch (error) {
      console.error('[StorageManager] Erreur lecture métadonnées:', error);
      return null;
    }
  }

  /**
   * Enregistre un callback de synchronisation
   */
  onSync(callback) {
    this.syncCallbacks.push(callback);
  }

  /**
   * Synchronise les données avec le serveur
   */
  async syncData() {
    if (!this.isOnline) {
      console.log('[StorageManager] Mode hors ligne - sync reporté');
      return;
    }

    console.log('[StorageManager] Synchronisation en cours...');
    const pendingChanges = await this.getPendingChanges();

    for (const change of pendingChanges) {
      try {
        // Implémenter la logique de sync basée sur le type de changement
        await this.syncChange(change);
        await this.removePendingChange(change.id);
      } catch (error) {
        console.error('[StorageManager] Erreur sync changement:', error);
      }
    }

    // Appeler les callbacks
    this.syncCallbacks.forEach(cb => cb());
  }

  /**
   * Synchronise un changement avec le serveur
   */
  async syncChange(change) {
    // À implémenter selon votre API
    console.log('[StorageManager] Sync changement:', change);
  }

  /**
   * Gestion de la connexion en ligne
   */
  handleOnline() {
    console.log('[StorageManager] Connexion rétablie');
    this.isOnline = true;
    document.dispatchEvent(new CustomEvent('appOnline'));
    this.syncData();
  }

  /**
   * Gestion de la connexion hors ligne
   */
  handleOffline() {
    console.log('[StorageManager] Mode hors ligne activé');
    this.isOnline = false;
    document.dispatchEvent(new CustomEvent('appOffline'));
  }

  /**
   * Vide tous les caches (pour déconnexion)
   */
  async clearAllData() {
    try {
      const stores = ['users', 'actors', 'sites', 'news', 'session', 'pending', 'metadata'];
      for (const storeName of stores) {
        const store = await this.getStore(storeName, 'readwrite');
        await new Promise((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      localStorage.removeItem('bongsc_session');
      console.log('[StorageManager] Tous les caches vidés');
    } catch (error) {
      console.error('[StorageManager] Erreur vidage caches:', error);
    }
  }

  /**
   * Récupère l'état de la connexion
   */
  getOnlineStatus() {
    return this.isOnline;
  }
}

// Instance globale
const storageManager = new StorageManager();

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
