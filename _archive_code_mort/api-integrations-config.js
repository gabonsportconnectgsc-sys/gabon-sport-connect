/**
 * ═══════════════════════════════════════════════════════════════
 * GSC ADMIN — CONFIGURATION DES INTÉGRATIONS API
 * api-integrations-config.js  |  v1.0  |  Juin 2026
 * ═══════════════════════════════════════════════════════════════
 * 
 * Configuration centralisée pour les intégrations avec :
 * - FIFA
 * - CAF (Confédération Africaine de Football)
 * - Autres fédérations nationales
 * - APIs custom
 */

window.apiIntegrationsConfig = {
  
  /* ═══════════════════════════════════════════════════════════
     ENDPOINTS API
     ═══════════════════════════════════════════════════════════ */

  endpoints: {
    fifa: {
      base: 'https://api.fifa.com/v2',
      paths: {
        syncPlayers: '/sync/players',
        syncMatches: '/sync/matches',
        syncTeams: '/sync/teams',
        status: '/health'
      },
      timeout: 10000,
      retries: 3,
      batchSize: 50
    },

    caf: {
      base: 'https://api.caf-online.com/v1',
      paths: {
        sync: '/sync',
        players: '/players',
        matches: '/matches',
        competitions: '/competitions',
        status: '/status'
      },
      timeout: 10000,
      retries: 3,
      batchSize: 50
    },

    // Template pour API custom
    custom: {
      base: '', // À configurer par l'utilisateur
      paths: {
        sync: '/sync',
        health: '/health'
      },
      timeout: 10000,
      retries: 2,
      batchSize: 50
    }
  },

  /* ═══════════════════════════════════════════════════════════
     FORMAT DE DONNÉES À ENVOYER
     ═══════════════════════════════════════════════════════════ */

  dataFormats: {
    players: {
      id: '',
      name: '',
      email: '',
      phone: '',
      role: 'joueur', // joueur, club, federation
      club: '',
      position: '',
      height: 0,
      weight: 0,
      dominantFoot: 'right',
      dominantHand: 'right',
      matchesPlayed: 0,
      goals: 0,
      assists: 0,
      photo: null,
      status: 'active'
    },

    matches: {
      id: '',
      date: '2026-06-19',
      time: '14:30',
      homeTeam: '',
      awayTeam: '',
      venue: '',
      competition: '',
      homeScore: null,
      awayScore: null,
      status: 'scheduled' // scheduled, played, cancelled
    },

    teams: {
      id: '',
      name: '',
      country: 'Gabon',
      founded: 2026,
      logo: null,
      players: []
    }
  },

  /* ═══════════════════════════════════════════════════════════
     TOKENS & AUTHENTIFICATION
     ═══════════════════════════════════════════════════════════ */

  auth: {
    // Les tokens doivent être stockés de manière sécurisée
    // NE JAMAIS les hard-coder ici
    fifa: {
      tokenType: 'Bearer',
      refreshUrl: 'https://api.fifa.com/v2/auth/refresh',
      expiresIn: 3600 // secondes
    },

    caf: {
      tokenType: 'Bearer',
      refreshUrl: 'https://api.caf-online.com/v1/auth/refresh',
      expiresIn: 3600
    }
  },

  /* ═══════════════════════════════════════════════════════════
     MAPPINGS DE CHAMPS (Conversion GSC → API externe)
     ═══════════════════════════════════════════════════════════ */

  fieldMappings: {
    gscToFIFA: {
      'id': 'playerId',
      'nom': 'playerName',
      'email': 'email',
      'telephone': 'phone',
      'role': 'playerType', // joueur → player
      'club': 'club',
      'taille': 'height',
      'poids': 'weight',
      'piedFort': 'dominantFoot',
      'mainDominante': 'dominantHand',
      'matchsJoues': 'appearances',
      'buts': 'goals',
      'passes': 'assists',
      'photo': 'photoUrl',
      'status': 'status'
    },

    gscToCAF: {
      'id': 'id',
      'nom': 'fullName',
      'email': 'email',
      'telephone': 'mobileNumber',
      'role': 'roleType', // joueur → PLAYER
      'club': 'clubName',
      'taille': 'height',
      'poids': 'weight',
      'piedFort': 'preferredFoot',
      'mainDominante': 'preferredHand',
      'matchsJoues': 'matchesPlayed',
      'buts': 'goalsScored',
      'passes': 'assistsGiven',
      'photo': 'profilePicture',
      'status': 'accountStatus'
    }
  },

  /* ═══════════════════════════════════════════════════════════
     RÈGLES DE SYNCHRONISATION
     ═══════════════════════════════════════════════════════════ */

  syncRules: {
    // Quels champs synchroniser
    playerFields: [
      'nom', 'email', 'telephone', 'club', 
      'taille', 'poids', 'piedFort', 'mainDominante',
      'matchsJoues', 'buts', 'passes', 'photo'
    ],

    matchFields: [
      'date', 'time', 'home', 'away', 'lieu', 
      'competition', 'scoreHome', 'scoreAway'
    ],

    // Champs en lecture seule (ne pas synchroniser vers l'extérieur)
    readOnlyFields: [
      'id', 'createdAt', 'status', 'internalNotes'
    ],

    // Filtres avant synchronisation
    filters: {
      onlyActive: true,  // Synchroniser seulement les comptes actifs
      onlyVerified: true, // Seulement les emails vérifiés
      minMatchesPlayed: 0 // Seulement si X matchs joués
    }
  },

  /* ═══════════════════════════════════════════════════════════
     GESTION D'ERREURS
     ═══════════════════════════════════════════════════════════ */

  errorHandling: {
    401: 'Token expiré - Reconnectez-vous',
    403: 'Permissions insuffisantes',
    404: 'Endpoint non trouvé',
    429: 'Limite de requêtes dépassée - Attendez avant de réessayer',
    500: 'Erreur serveur - Réessayez plus tard',
    timeout: 'Délai d\'attente dépassé - Vérifiez la connexion'
  },

  /* ═══════════════════════════════════════════════════════════
     WEBHOOKS (Pour notifications en temps réel)
     ═══════════════════════════════════════════════════════════ */

  webhooks: {
    // URL où recevoir les notifications des APIs partenaires
    fifa: {
      url: '', // À configurer
      events: ['player.created', 'player.updated', 'match.completed'],
      secret: '' // Clé secrète pour valider les webhooks
    },

    caf: {
      url: '', // À configurer
      events: ['sync.started', 'sync.completed', 'sync.failed'],
      secret: ''
    }
  }
};

/* ═══════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS FOR API INTEGRATION
   ═══════════════════════════════════════════════════════════════ */

window.apiIntegrationUtils = {

  /**
   * Mapper les données GSC au format FIFA
   * @param {Object} gscData - Données au format GSC
   * @returns {Object} Données formatées pour FIFA
   */
  mapToFIFA: function(gscData) {
    const mapping = window.apiIntegrationsConfig.fieldMappings.gscToFIFA;
    const result = {};

    if (Array.isArray(gscData)) {
      return gscData.map(item => this.mapToFIFA(item));
    }

    Object.keys(mapping).forEach(gscField => {
      if (gscData[gscField] !== undefined) {
        result[mapping[gscField]] = this.transformValue(gscField, gscData[gscField], 'fifa');
      }
    });

    return result;
  },

  /**
   * Mapper les données GSC au format CAF
   */
  mapToCAF: function(gscData) {
    const mapping = window.apiIntegrationsConfig.fieldMappings.gscToCAF;
    const result = {};

    if (Array.isArray(gscData)) {
      return gscData.map(item => this.mapToCAF(item));
    }

    Object.keys(mapping).forEach(gscField => {
      if (gscData[gscField] !== undefined) {
        result[mapping[gscField]] = this.transformValue(gscField, gscData[gscField], 'caf');
      }
    });

    return result;
  },

  /**
   * Transformer les valeurs selon les règles de conversion
   */
  transformValue: function(field, value, targetAPI) {
    // Conversions spéciales selon le champ et l'API cible
    const transformations = {
      role: {
        fifa: {
          joueur: 'player',
          club: 'club',
          federation: 'federation',
          entraineur: 'coach',
          arbitre: 'referee'
        },
        caf: {
          joueur: 'PLAYER',
          club: 'CLUB',
          federation: 'FEDERATION',
          entraineur: 'COACH',
          arbitre: 'REFEREE'
        }
      },
      piedFort: {
        fifa: { 'Droit': 'right', 'Gauche': 'left' },
        caf: { 'Droit': 'RIGHT', 'Gauche': 'LEFT' }
      },
      status: {
        fifa: { 'active': 'active', 'pending': 'pending', 'hidden': 'inactive', 'deleted': 'deleted' },
        caf: { 'active': 'ACTIVE', 'pending': 'PENDING', 'hidden': 'INACTIVE', 'deleted': 'DELETED' }
      }
    };

    if (transformations[field] && transformations[field][targetAPI]) {
      return transformations[field][targetAPI][value] || value;
    }

    return value;
  },

  /**
   * Filtrer les données avant sync
   */
  filterForSync: function(users) {
    const rules = window.apiIntegrationsConfig.syncRules.filters;
    
    return users.filter(user => {
      if (rules.onlyActive && user.status !== 'active') return false;
      if (rules.onlyVerified && !user.emailVerified) return false;
      if (rules.minMatchesPlayed && (user.matchsJoues || 0) < rules.minMatchesPlayed) return false;
      return true;
    });
  },

  /**
   * Créer un payload pour synchronisation
   */
  createSyncPayload: function(users, matches, metadata = {}) {
    const filteredUsers = this.filterForSync(users);

    return {
      timestamp: new Date().toISOString(),
      version: '2.0',
      source: 'GSC-Admin',
      dataType: 'full', // ou 'incremental' pour les mises à jour
      metadata: {
        totalUsers: users.length,
        syncedUsers: filteredUsers.length,
        totalMatches: matches.length,
        ...metadata
      },
      data: {
        players: filteredUsers.map(u => ({
          ...u,
          // Exclure les champs sensibles
          password: undefined,
          apiToken: undefined
        })),
        matches: matches
      }
    };
  },

  /**
   * Valider la réponse API
   */
  validateResponse: function(response, expectedFields = []) {
    if (!response) return { valid: false, error: 'Réponse vide' };

    const errors = [];
    expectedFields.forEach(field => {
      if (response[field] === undefined) {
        errors.push(`Champ manquant: ${field}`);
      }
    });

    if (errors.length > 0) {
      return { valid: false, error: errors.join(', ') };
    }

    return { valid: true };
  },

  /**
   * Retry logic pour les requêtes API
   */
  retryRequest: async function(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
};

/* Exporter pour utilisation */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    apiIntegrationsConfig: window.apiIntegrationsConfig,
    apiIntegrationUtils: window.apiIntegrationUtils
  };
}
