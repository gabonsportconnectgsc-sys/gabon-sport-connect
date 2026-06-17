/**
 * 📦 DATA MODULE - Gestion Avancée des Données
 * Cache, pagination, filtres, synchronisation en temps réel
 */

class DataModule {
  constructor(db) {
    this.db = db;
    this.cache = new Map();
    this.listeners = new Map();
    this.filters = new Map();
    this.pageSize = 50;
    this.lastSync = new Map();
  }

  /**
   * 🔄 Initialiser le module
   */
  async init() {
    console.log('📦 Initializing Data Module...');
    
    // Nettoyer le cache toutes les heures
    setInterval(() => this.clearOldCache(), 60 * 60 * 1000);
    
    return this;
  }

  /**
   * 📥 Charger une collection avec pagination
   */
  async loadCollection(collectionName, options = {}) {
    try {
      const cacheKey = `${collectionName}:${JSON.stringify(options)}`;
      
      // Vérifier le cache
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < (options.cacheTTL || 5 * 60 * 1000)) {
          console.log(`✅ Cache hit: ${cacheKey}`);
          return cached.data;
        }
      }

      console.log(`📥 Loading collection: ${collectionName}`);

      let query = this.db.collection(collectionName);

      // Appliquer les filtres
      if (options.where) {
        options.where.forEach(([field, operator, value]) => {
          query = query.where(field, operator, value);
        });
      }

      // Trier
      if (options.orderBy) {
        const [field, direction] = options.orderBy;
        query = query.orderBy(field, direction || 'asc');
      }

      // Limiter
      const limit = options.limit || this.pageSize;
      query = query.limit(limit);

      const snapshot = await query.get();
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Mettre en cache
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      this.lastSync.set(collectionName, Date.now());
      console.log(`✅ Loaded ${collectionName}: ${data.length} items`);

      return data;
    } catch (error) {
      console.error(`❌ Error loading ${collectionName}:`, error);
      return [];
    }
  }

  /**
   * 📋 Charger avec pagination
   */
  async loadWithPagination(collectionName, pageNum = 1, options = {}) {
    try {
      const pageSize = options.pageSize || this.pageSize;
      const startAt = (pageNum - 1) * pageSize;

      let query = this.db.collection(collectionName);

      // Filtres
      if (options.where) {
        options.where.forEach(([field, operator, value]) => {
          query = query.where(field, operator, value);
        });
      }

      // Tri
      if (options.orderBy) {
        const [field, direction] = options.orderBy;
        query = query.orderBy(field, direction || 'asc');
      }

      // Total count
      const countSnapshot = await query.get();
      const totalCount = countSnapshot.size;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Paginate
      const snapshot = await query
        .offset(startAt)
        .limit(pageSize)
        .get();

      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        items,
        pageNum,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      };
    } catch (error) {
      console.error(`❌ Error in pagination:`, error);
      return {
        items: [],
        pageNum: 1,
        pageSize: this.pageSize,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      };
    }
  }

  /**
   * 🔍 Chercher avec filtres
   */
  async search(collectionName, searchTerm, searchFields = []) {
    try {
      console.log(`🔍 Searching ${collectionName} for: ${searchTerm}`);

      const items = await this.loadCollection(collectionName, {
        cacheTTL: 2 * 60 * 1000 // Cache 2min pour search
      });

      if (!searchTerm || !searchFields.length) {
        return items;
      }

      const lowerTerm = searchTerm.toLowerCase();

      return items.filter(item => 
        searchFields.some(field => {
          const value = this.getNestedValue(item, field);
          return value && String(value).toLowerCase().includes(lowerTerm);
        })
      );
    } catch (error) {
      console.error('❌ Search error:', error);
      return [];
    }
  }

  /**
   * 📥 Créer un document
   */
  async create(collectionName, data) {
    try {
      console.log(`📝 Creating in ${collectionName}`);

      const docRef = await this.db
        .collection(collectionName)
        .add({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      console.log(`✅ Created ${collectionName}:`, docRef.id);

      // Invalider le cache
      this.invalidateCache(collectionName);

      return { id: docRef.id, ...data };
    } catch (error) {
      console.error(`❌ Create error:`, error);
      throw error;
    }
  }

  /**
   * ✏️ Mettre à jour un document
   */
  async update(collectionName, docId, data) {
    try {
      console.log(`✏️ Updating ${collectionName}/${docId}`);

      await this.db
        .collection(collectionName)
        .doc(docId)
        .update({
          ...data,
          updatedAt: new Date()
        });

      console.log(`✅ Updated ${collectionName}/${docId}`);

      // Invalider le cache
      this.invalidateCache(collectionName);

      return { id: docId, ...data };
    } catch (error) {
      console.error(`❌ Update error:`, error);
      throw error;
    }
  }

  /**
   * 🗑️ Supprimer un document
   */
  async delete(collectionName, docId) {
    try {
      console.log(`🗑️ Deleting ${collectionName}/${docId}`);

      await this.db
        .collection(collectionName)
        .doc(docId)
        .delete();

      console.log(`✅ Deleted ${collectionName}/${docId}`);

      // Invalider le cache
      this.invalidateCache(collectionName);

      return { success: true };
    } catch (error) {
      console.error(`❌ Delete error:`, error);
      throw error;
    }
  }

  /**
   * 👂 Écouter les changements en temps réel
   */
  listen(collectionName, callback, options = {}) {
    try {
      console.log(`👂 Listening to ${collectionName}`);

      let query = this.db.collection(collectionName);

      // Filtres
      if (options.where) {
        options.where.forEach(([field, operator, value]) => {
          query = query.where(field, operator, value);
        });
      }

      // Tri
      if (options.orderBy) {
        const [field, direction] = options.orderBy;
        query = query.orderBy(field, direction || 'asc');
      }

      // Limiter
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const unsubscribe = query.onSnapshot(
        (snapshot) => {
          const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          callback(null, items);
        },
        (error) => {
          console.error(`❌ Listen error on ${collectionName}:`, error);
          callback(error, null);
        }
      );

      // Sauvegarder l'unsubscribe
      this.listeners.set(collectionName, unsubscribe);

      return unsubscribe;
    } catch (error) {
      console.error('❌ Listen setup error:', error);
      callback(error, null);
    }
  }

  /**
   * 🛑 Arrêter d'écouter
   */
  stopListening(collectionName) {
    if (this.listeners.has(collectionName)) {
      this.listeners.get(collectionName)();
      this.listeners.delete(collectionName);
      console.log(`🛑 Stopped listening to ${collectionName}`);
    }
  }

  /**
   * 🛑 Arrêter tous les listeners
   */
  stopAllListeners() {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
    console.log('🛑 All listeners stopped');
  }

  /**
   * 🔄 Invalider le cache
   */
  invalidateCache(collectionName) {
    const keysToDelete = Array.from(this.cache.keys())
      .filter(key => key.startsWith(`${collectionName}:`));
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🔄 Cache invalidated for ${collectionName}`);
  }

  /**
   * 🧹 Nettoyer le vieux cache
   */
  clearOldCache() {
    const now = Date.now();
    const ttl = 60 * 60 * 1000; // 1 heure

    let cleared = 0;
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > ttl) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} old cache entries`);
    }
  }

  /**
   * 🎯 Obtenir une valeur imbriquée (dot notation)
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => 
      current?.[prop], obj);
  }

  /**
   * 📊 Obtenir les stats de cache
   */
  getCacheStats() {
    return {
      totalEntries: this.cache.size,
      totalListeners: this.listeners.size,
      cacheSize: new Blob([JSON.stringify(Array.from(this.cache.entries()))]).size
    };
  }

  /**
   * 💾 Exporter les données
   */
  async exportCollection(collectionName, format = 'json') {
    try {
      const items = await this.loadCollection(collectionName, {
        limit: 10000 // Max 10k items
      });

      if (format === 'csv') {
        return this.jsonToCSV(items);
      } else {
        return JSON.stringify(items, null, 2);
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      throw error;
    }
  }

  /**
   * 🔄 Convertir JSON en CSV
   */
  jsonToCSV(items) {
    if (!items.length) return '';

    const headers = Object.keys(items[0]);
    const csv = [
      headers.join(','),
      ...items.map(item => 
        headers.map(header => 
          JSON.stringify(item[header] || '')
        ).join(',')
      )
    ].join('\n');

    return csv;
  }
}

// Export
export default DataModule;
