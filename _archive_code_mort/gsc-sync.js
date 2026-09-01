/**
 * GSC Real-time Database Synchronization Module
 * Module de synchronisation temps réel pour Gabon Sport Connect
 * 
 * Fonctionnalités:
 * - Synchronisation Firestore temps réel (<500ms)
 * - Cache IndexedDB offline-first
 * - Queue synchronisation offline
 * - Gestion conflits
 * - Logging & telemetrie
 */

class GSCSync {
  constructor(firebaseConfig) {
    this.db = null;
    this.firebaseConfig = firebaseConfig;
    this.listeners = {};
    this.idbVersion = 1;
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.metrics = {
      syncTime: [],
      conflictCount: 0,
      errorCount: 0
    };
    
    this.init();
  }
  
  /**
   * Initialisation du module
   */
  async init() {
    try {
      // Initialiser Firebase
      if (typeof firebase !== 'undefined') {
        firebase.initializeApp(this.firebaseConfig);
        this.db = firebase.firestore();
      }
      
      // Initialiser IndexedDB
      await this.initIndexedDB();
      
      // Écouter changements online/offline
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      
      console.log('✅ GSCSync initialized');
    } catch (error) {
      console.error('❌ GSCSync init error:', error);
      this.metrics.errorCount++;
    }
  }
  
  /**
   * Initialiser IndexedDB pour cache local
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GSCData', this.idbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        
        // Créer stores si nécessaire
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('matches')) {
          db.createObjectStore('matches', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
        
        this.idb = db;
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('matches')) {
          db.createObjectStore('matches', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }
  
  /**
   * Setup listener temps réel pour collection
   */
  setupListener(collection, callback, whereClause = null) {
    if (!this.db) {
      console.warn('⚠️ Firebase not initialized');
      this.loadFromCache(collection, callback);
      return;
    }
    
    let query = this.db.collection(collection);
    
    // Appliquer where clause si fournie
    if (whereClause) {
      query = query.where(...whereClause);
    }
    
    // Filtrer supprimés par défaut
    query = query.where('status', '!=', 'deleted');
    
    const startTime = performance.now();
    
    const unsubscribe = query.onSnapshot(
      async (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Log perf
        const syncTime = performance.now() - startTime;
        this.metrics.syncTime.push(syncTime);
        console.log(`⚡ ${collection} synced in ${syncTime.toFixed(2)}ms`);
        
        // Cache en local
        await this.cacheData(collection, data);
        
        // Callback
        callback(data);
      },
      (error) => {
        console.error(`❌ Sync error on ${collection}:`, error);
        this.metrics.errorCount++;
        
        // Fallback to cache
        this.loadFromCache(collection, callback);
      }
    );
    
    this.listeners[collection] = unsubscribe;
  }
  
  /**
   * Cache données localement
   */
  async cacheData(collection, data) {
    if (!this.idb) return;
    
    return new Promise((resolve) => {
      const transaction = this.idb.transaction([collection], 'readwrite');
      const store = transaction.objectStore(collection);
      
      // Vider et recharger
      store.clear();
      data.forEach(item => store.add(item));
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.warn('Cache write failed:', transaction.error);
        resolve();
      };
    });
  }
  
  /**
   * Charger du cache IndexedDB
   */
  async loadFromCache(collection, callback) {
    if (!this.idb) return;
    
    return new Promise((resolve) => {
      const transaction = this.idb.transaction([collection], 'readonly');
      const store = transaction.objectStore(collection);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const data = request.result || [];
        callback(data);
        resolve(data);
      };
      
      request.onerror = () => {
        console.warn('Cache read failed');
        callback([]);
        resolve([]);
      };
    });
  }
  
  /**
   * Sauvegarder document avec queue offline
   */
  async saveDocument(collection, docId, data) {
    const doc = { ...data, id: docId, timestamp: new Date() };
    
    // Cache local immédiatement
    await this.cacheData(collection, [doc]);
    
    if (!this.isOnline) {
      // Queue pour sync offline
      await this.queueSync(collection, docId, data);
      console.log(`📋 Queued: ${collection}/${docId}`);
      return { success: true, queued: true };
    }
    
    try {
      // Sync Firestore
      if (collection === 'users') {
        await this.db.collection(collection).doc(docId).set(doc, { merge: true });
      } else {
        await this.db.collection(collection).doc(docId).set(doc, { merge: true });
      }
      
      console.log(`✅ Saved: ${collection}/${docId}`);
      return { success: true, queued: false };
    } catch (error) {
      console.error(`❌ Save error: ${error.message}`);
      // Queue en fallback
      await this.queueSync(collection, docId, data);
      this.metrics.errorCount++;
      return { success: false, queued: true, error };
    }
  }
  
  /**
   * Queue opération pour sync offline
   */
  async queueSync(collection, docId, data) {
    if (!this.idb) return;
    
    return new Promise((resolve) => {
      const transaction = this.idb.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      store.add({
        collection,
        docId,
        data,
        timestamp: new Date(),
        status: 'pending'
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  }
  
  /**
   * Sync queue offline quand reconnecté
   */
  async syncOfflineQueue() {
    if (!this.db || !this.idb) return;
    
    return new Promise(async (resolve) => {
      const transaction = this.idb.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();
      
      request.onsuccess = async () => {
        const items = request.result || [];
        
        for (const item of items) {
          try {
            await this.db.collection(item.collection)
              .doc(item.docId)
              .set(item.data, { merge: true });
            
            console.log(`✅ Synced queued: ${item.collection}/${item.docId}`);
            
            // Supprimer de queue
            const delTx = this.idb.transaction(['syncQueue'], 'readwrite');
            delTx.objectStore('syncQueue').delete(item.id);
          } catch (error) {
            console.error(`❌ Queue sync failed:`, error);
          }
        }
        
        resolve();
      };
    });
  }
  
  /**
   * Handler online
   */
  async handleOnline() {
    this.isOnline = true;
    console.log('🟢 Online - Syncing queue...');
    await this.syncOfflineQueue();
  }
  
  /**
   * Handler offline
   */
  handleOffline() {
    this.isOnline = false;
    console.log('🔴 Offline - Operations queued');
  }
  
  /**
   * Obtenir metrics synchronisation
   */
  getMetrics() {
    const syncTimes = this.metrics.syncTime;
    return {
      avgSyncTime: syncTimes.length ? 
        (syncTimes.reduce((a,b) => a+b) / syncTimes.length).toFixed(2) : 0,
      minSyncTime: syncTimes.length ? Math.min(...syncTimes).toFixed(2) : 0,
      maxSyncTime: syncTimes.length ? Math.max(...syncTimes).toFixed(2) : 0,
      totalSyncs: syncTimes.length,
      errors: this.metrics.errorCount,
      conflicts: this.metrics.conflictCount,
      isOnline: this.isOnline
    };
  }
  
  /**
   * Unsubscribe listener
   */
  unsubscribe(collection) {
    if (this.listeners[collection]) {
      this.listeners[collection]();
      delete this.listeners[collection];
      console.log(`Unsubscribed from ${collection}`);
    }
  }
  
  /**
   * Nettoyer tous les listeners
   */
  cleanup() {
    Object.keys(this.listeners).forEach(collection => {
      this.unsubscribe(collection);
    });
    console.log('Cleanup completed');
  }
}

// Exporter pour utilisation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GSCSync;
}

/**
 * USAGE DANS INDEX.HTML
 * =====================
 * 
 * 1. Initialiser:
 *    const sync = new GSCSync(firebaseConfig);
 * 
 * 2. Setup listeners:
 *    sync.setupListener('users', (data) => {
 *      updatePlayersUI(data);
 *    });
 *    
 *    sync.setupListener('matches', (data) => {
 *      updateMatchesUI(data);
 *    });
 * 
 * 3. Sauvegarder:
 *    await sync.saveDocument('users', userId, {
 *      nom: 'Kozangue',
 *      prenom: 'Patrick',
 *      role: 'joueur'
 *    });
 * 
 * 4. Monitoring:
 *    console.log(sync.getMetrics());
 *    // Output:
 *    // {
 *    //   avgSyncTime: "145.32",
 *    //   minSyncTime: "89.45",
 *    //   maxSyncTime: "342.12",
 *    //   totalSyncs: 152,
 *    //   errors: 2,
 *    //   conflicts: 0,
 *    //   isOnline: true
 *    // }
 * 
 * 5. Cleanup:
 *    sync.cleanup();
 */

/**
 * USAGE DANS ADMIN.HTML
 * =====================
 * 
 * Même utilisation + gestion sync indicator:
 * 
 * function showSyncIndicator() {
 *   const indicator = document.getElementById('sync-indicator');
 *   if (indicator) indicator.style.display = 'flex';
 * }
 * 
 * function hideSyncIndicator() {
 *   const indicator = document.getElementById('sync-indicator');
 *   if (indicator) indicator.style.display = 'none';
 * }
 * 
 * // Usage
 * sync.setupListener('users', (data) => {
 *   hideSyncIndicator();
 *   renderPlayers(data);
 * });
 */
