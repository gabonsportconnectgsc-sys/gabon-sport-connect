/**
 * GSC Sync Configuration — Synchronisation Admin ↔ App Publique
 * ═════════════════════════════════════════════════════════════════
 * Classe SyncManager: Gère la synchronisation temps réel entre
 * l'admin (writer) et l'app publique (reader) via Firestore
 */

class SyncManager {
  constructor() {
    this.db = null;
    this.auth = null;
    this.listeners = [];
    this.cache = {};
    this.syncInterval = 30000; // 30 secondes
    this.lastSync = {};
    this.features = {};
    this.logs = [];
  }

  /**
   * Initialiser le SyncManager avec Firebase
   */
  async init(firebaseInstance) {
    return new Promise((resolve, reject) => {
      // Attendre que firebase-init soit prêt
      const checkFirebase = () => {
        if (!firebaseInstance || !firebaseInstance.initializeApp) {
          setTimeout(checkFirebase, 100);
          return;
        }

        try {
          this.db = firebaseInstance.firestore();
          this.auth = firebaseInstance.auth();
          this.log('✅ SyncManager initialisé');
          resolve(this);
        } catch (error) {
          this.log('❌ Erreur init SyncManager: ' + error.message, 'error');
          reject(error);
        }
      };
      checkFirebase();
    });
  }

  /**
   * Synchroniser toutes les données
   */
  async syncAll() {
    if (!this.db) {
      this.log('⚠️ Firestore pas initialisé', 'warn');
      return;
    }

    try {
      this.log('🔄 Synchronisation en cours...');

      const collections = ['sports', 'championships', 'clubs', 'actors', 'players', 'documents', 'config'];
      const data = {};

      for (const collection of collections) {
        data[collection] = await this.readCollection(collection);
      }

      // Lire la config des features
      this.features = await this.readDocument('config', 'features') || {};

      // Mettre en cache
      this.cache = { ...data };
      this.lastSync = new Date();

      // Notifier l'app
      this.dispatchEvent('gsc-data-synced', data);
      this.log(`✅ Sync complète: ${Object.keys(data).length} collections`);

      return data;
    } catch (error) {
      this.log('❌ Erreur sync: ' + error.message, 'error');
      throw error;
    }
  }

  /**
   * Lire une collection Firestore
   */
  async readCollection(collectionName) {
    try {
      const snapshot = await this.db.collection(collectionName).get();
      const docs = [];
      snapshot.forEach(doc => {
        docs.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return docs;
    } catch (error) {
      this.log(`⚠️ Erreur lecture ${collectionName}: ${error.message}`, 'warn');
      return [];
    }
  }

  /**
   * Lire un document Firestore
   */
  async readDocument(collectionName, docId) {
    try {
      const doc = await this.db.collection(collectionName).doc(docId).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) {
      this.log(`⚠️ Erreur lecture ${collectionName}/${docId}`, 'warn');
      return null;
    }
  }

  /**
   * Sauvegarder un document
   */
  async saveDocument(collectionName, docId, data) {
    if (!this.db) {
      this.log('⚠️ Firestore pas initialisé', 'warn');
      return null;
    }

    try {
      const docData = {
        ...data,
        updatedAt: new Date().toISOString()
      };

      if (!docId) {
        // Nouveau document (auto-ID)
        const ref = await this.db.collection(collectionName).add(docData);
        this.log(`➕ ${collectionName} créé: ${ref.id}`, 'success');
        return ref.id;
      } else {
        // Mettre à jour document existant
        await this.db.collection(collectionName).doc(docId).set(docData, { merge: true });
        this.log(`✏️ ${collectionName}/${docId} modifié`, 'success');
        return docId;
      }
    } catch (error) {
      this.log(`❌ Erreur sauvegarde: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Supprimer un document
   */
  async deleteDocument(collectionName, docId) {
    if (!this.db) {
      this.log('⚠️ Firestore pas initialisé', 'warn');
      return false;
    }

    try {
      await this.db.collection(collectionName).doc(docId).delete();
      this.log(`🗑️ ${collectionName}/${docId} supprimé`, 'success');
      return true;
    } catch (error) {
      this.log(`❌ Erreur suppression: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Écouter les changements en temps réel
   */
  onCollectionChange(collectionName, callback) {
    if (!this.db) {
      this.log('⚠️ Firestore pas initialisé', 'warn');
      return () => {};
    }

    const unsubscribe = this.db.collection(collectionName)
      .onSnapshot(snapshot => {
        const docs = [];
        snapshot.forEach(doc => {
          docs.push({ id: doc.id, ...doc.data() });
        });
        callback(docs);
        this.log(`👁️ Collection ${collectionName} mise à jour (${docs.length} docs)`);
      });

    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Écouter un document spécifique
   */
  onDocumentChange(collectionName, docId, callback) {
    if (!this.db) {
      this.log('⚠️ Firestore pas initialisé', 'warn');
      return () => {};
    }

    const unsubscribe = this.db
      .collection(collectionName)
      .doc(docId)
      .onSnapshot(doc => {
        const data = doc.exists ? { id: doc.id, ...doc.data() } : null;
        callback(data);
      });

    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Obtenir les données en cache
   */
  getCache(collectionName) {
    return this.cache[collectionName] || [];
  }

  /**
   * Obtenir un document du cache
   */
  getCacheDoc(collectionName, docId) {
    const collection = this.cache[collectionName] || [];
    return collection.find(doc => doc.id === docId);
  }

  /**
   * Vérifier si une feature est activée
   */
  isFeatureEnabled(featureName) {
    return this.features[featureName] === true;
  }

  /**
   * Logger un message
   */
  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  /**
   * Obtenir tous les logs
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Nettoyer les logs
   */
  clearLogs() {
    this.logs = [];
    this.log('📋 Logs nettoyés');
  }

  /**
   * Dispatcher un événement personnalisé
   */
  dispatchEvent(eventName, detail = {}) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  /**
   * Arrêter tous les listeners
   */
  unsubscribeAll() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
    this.log('🛑 Tous les listeners arrêtés');
  }
}

// ═════════════════════════════════════════════════════════════════
// Instance globale
// ═════════════════════════════════════════════════════════════════

window.gscSyncManager = null;

/**
 * Obtenir ou créer l'instance SyncManager
 */
window.getGSCSync = function() {
  if (!window.gscSyncManager) {
    window.gscSyncManager = new SyncManager();
  }
  return window.gscSyncManager;
};

// ═════════════════════════════════════════════════════════════════
// Initialisation automatique quand Firebase est prêt
// ═════════════════════════════════════════════════════════════════

window.addEventListener('firebase-init-done', async (event) => {
  try {
    const firebase = event.detail?.firebase || window.firebase;
    const sync = window.getGSCSync();
    await sync.init(firebase);

    // Faire la première synchronisation
    await sync.syncAll();

    // Synchronisation périodique
    setInterval(() => {
      sync.syncAll().catch(err => console.error(err));
    }, sync.syncInterval);

    // Notifier que le sync est prêt
    window.dispatchEvent(new CustomEvent('gsc-sync-ready', { detail: { sync } }));
  } catch (error) {
    console.error('Erreur initialisation GSC Sync:', error);
  }
});

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncManager;
}
