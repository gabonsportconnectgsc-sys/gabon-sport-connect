// ============================================================
// schema-firestore.js — Schémas & Structures Firestore v5.0
// Modèles complets pour les 4 fonctionnalités
// ============================================================

import { db } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ──────────────────────────────────────────────────────────
// SCHÉMA ① : GÉOLOCALISATION AVANCÉE
// ──────────────────────────────────────────────────────────

export const SCHEMA_SITE_AVANCEE = {
  // Collection: sitesSportifs_avancee
  // Document: {siteId}

  // Identifiants
  id: String,           // ID Firestore
  uid_createur: String, // UID du créateur

  // Information de base
  nom: String,          // "Stade de l'Amitié"
  type: String,         // "Stade", "Gymnase", "Piscine"
  description: String,  // Description complète
  photo: String,        // URL Photo Firebase Storage

  // Localisation précise
  localisation: {
    latitude: Number,       // 0.4162
    longitude: Number,      // 9.4679
    precision: Number,      // Rayon en mètres (si GPS imprécis)
    adresse: String,        // "Boulevard de l'Indépendance"
    codePostal: String,     // Nouveau
    quartier: String,       // Nouveau
    ville: String,          // "Libreville"
    province: String,       // "Estuaire"
    pays: String,           // "Gabon"
    altitudine: Number      // En mètres (nouveau)
  },

  // Infrastructure
  infrastructure: {
    capacite: Number,           // 30000 personnes
    surface: Number,            // En m²
    domainsCouverts: Boolean,  // Toiture ?
    vestiaires: Number,        // Nombre
    parkingPlaces: Number,     // Places de parking
    accessibiliteHandicapees: Boolean
  },

  // Accès & Horaires
  acces: {
    contact: String,           // "+241 1 76 44 44"
    email: String,             // Email de contact
    site: String,              // Site web
    horairesOuverture: String, // "09:00-18:00"
    jours_ouverture: Array,    // ["Lun", "Mar", ...]
    tarifEntree: Number,       // En FCFA
    accesPMR: Boolean          // Accessible PMR ?
  },

  // Services
  services: {
    restauration: Boolean,
    parking: Boolean,
    vestiaires: Boolean,
    douches: Boolean,
    wifi: Boolean,
    premiereSecours: Boolean,
    securite24h: Boolean,
    location_materiel: Boolean,
    cafe: Boolean
  },

  // Géofences
  geofences: [
    {
      rayon: Number,          // En km
      nom: String,            // "Zone principale"
      notification: String    // Message de notification
    }
  ],

  // Sports pratiqués
  sports: Array,              // ["Football", "Basketball"]
  
  // Clubs affiliés
  clubsAffiliees: [
    {
      clubId: String,
      nom: String,
      dateAffiliation: Timestamp
    }
  ],

  // Événements
  evenementsHostes: Array,    // IDs d'événements

  // Métadonnées
  images: Array,              // [{ url, description, dateAjout }]
  evaluations: Number,        // Note moyenne
  nombreEvaluations: Number,  // Total avis
  createdAt: Timestamp,
  updatedAt: Timestamp,
  verifie: Boolean,          // Vérifié par admin ?
  actif: Boolean
};

// ──────────────────────────────────────────────────────────
// SCHÉMA ② : PROFIL COMPLET ENRICHI
// ──────────────────────────────────────────────────────────

export const SCHEMA_PROFIL_COMPLET = {
  // Collection: userProfiles_avancee
  // Document: {uid}

  // Identification
  uid: String,
  email: String,

  // Identité personnelle
  identite: {
    prenom: String,
    nom: String,
    dateNaissance: String,    // ISO format: YYYY-MM-DD
    sexe: String,             // "M" | "F" | "Autre"
    nationalite: String,      // "Gabonais", "Français"
    cni: String,              // Numéro CNI (optionnel)
    numero_identification: String
  },

  // Localisation
  localisation: {
    ville: String,
    quartier: String,
    adressePath: String,      // Adresse complète
    latitude: Number,
    longitude: Number,
    codePostal: String,
    province: String
  },

  // Domaine sportif
  domaineSportif: {
    sports: Array,            // ["Football", "Basketball"]
    sportPrincipal: String,   // Sport principal
    niveau: String,           // "Amateur" | "Semi-pro" | "Pro"
    experience_annees: Number,
    clubs_historique: [       // Tous les clubs où joueur
      {
        nom: String,
        position: String,
        dateDebut: String,
        dateFin: String,
        numero: Number,
        description: String
      }
    ],
    specialites: Array,       // ["Défense", "Attaque", "Gardien"]
    
    // Statistiques carrière
    statistiques: {
      matchs_joues: Number,
      buts_marques: Number,
      passes_decisives: Number,
      cartons_jaunes: Number,
      cartons_rouges: Number,
      minutes_jouees: Number,
      classement_personnel: Number
    },

    // Certifications
    certifications: [
      {
        nom: String,
        organisme: String,
        dateObtention: String,
        dateExpiration: String,
        document_url: String
      }
    ]
  },

  // Identité numérique
  identiteNumerique: {
    photoURL: String,         // Photo profil
    photosGalerie: [          // Galerie personnelle
      {
        url: String,
        titre: String,
        description: String,
        dateAjout: Timestamp,
        likes: Number
      }
    ],
    videosURL: [
      {
        url: String,
        titre: String,
        description: String,
        durée: Number,        // En secondes
        dateAjout: Timestamp
      }
    ],
    bio: String,              // Bio courte (100 chars)
    biographie: String,       // Bio complète (500+ chars)
    bio_personnel: String,    // Intérêts personnels
    signatures_numeriques: Array
  },

  // Réseaux sociaux
  reseauxSociaux: {
    instagram: String,        // @username
    facebook: String,         // URL
    twitter: String,          // @handle
    linkedin: String,         // URL
    youtube: String,          // Chaîne
    tiktok: String,
    sitePersonnel: String,    // Website perso
    blogURL: String
  },

  // Contact & Communication
  contact: {
    telephone: String,
    telephoneValide: Boolean,
    email: String,
    emailValide: Boolean,
    addressePostale: String,
    preferenceContact: String // "email" | "tel" | "sms"
  },

  // Badges & Récompenses
  badges: [
    {
      id: String,
      nom: String,
      description: String,
      icon: String,
      dateObtention: Timestamp,
      rareté: String         // "Commun" | "Rare" | "Légendaire"
    }
  ],

  // Préférences
  preferences: {
    visibilitePublique: Boolean,
    accepteMessagesPrives: Boolean,
    acceptePartenariats: Boolean,
    afficherEmail: Boolean,
    afficherTelephone: Boolean,
    afficherLocalization: Boolean,
    notificationsEmail: Boolean,
    notificationsPush: Boolean,
    languePrefere: String
  },

  // Métadonnées
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastActiveAt: Timestamp,
  profileCompletion: Number,  // % (0-100)
  verifie: Boolean,
  verified_by_admin: Boolean,
  verification_date: Timestamp
};

// ──────────────────────────────────────────────────────────
// SCHÉMA ③ : STATUT SUPPORTER ENRICHI
// ──────────────────────────────────────────────────────────

export const SCHEMA_SUPPORTER_ENRICHI = {
  // Collection: supporters_enrichi
  // Document: {uid}

  // Identification
  uid: String,
  email: String,
  telephone: String,

  // Profil personnalisé
  profil: {
    prenom: String,
    nom: String,
    dateNaissance: String,
    localisation: {
      ville: String,
      province: String,
      pays: String
    },
    photoURL: String
  },

  // Affiliation & Clubs
  affiliation: {
    clubPrincipal: String,     // Club préféré
    clubsSecondaires: Array,   // Autres clubs suivis
    joueursPreferees: [
      {
        joueurId: String,
        nom: String,
        numero: Number,
        dateAjout: Timestamp
      }
    ],
    arbitresPreferences: Array, // Arbitres suivis
    equipeNationale: String,    // Équipe nationale suivie
  },

  // Système de points & Niveaux
  systeme_points: {
    points_totaux: Number,      // Points accumulés
    points_actifs: Number,      // Points non utilisés
    points_utilisés: Number,    // Points dépensés
    
    historique_points: [
      {
        date: Timestamp,
        montant: Number,
        type: String,          // "gain" | "dépense"
        raison: String,        // "Validation email", "Achat ticket"
        solde_avant: Number,
        solde_apres: Number
      }
    ],

    // Niveaux
    niveau_actuel: String,     // "BRONZE" | "ARGENT" | "OR" | "PLATINE"
    points_pour_niveau_suivant: Number,
    progression_pourcentage: Number, // 0-100%
    
    historique_niveaux: [
      {
        niveau: String,
        dateAcquisition: Timestamp,
        points_accumulated: Number
      }
    ]
  },

  // Engagement & Activités
  engagement: {
    matchs_attendus: Number,
    matchs_registrations: [
      {
        matchId: String,
        nomMatch: String,
        dateMatch: Timestamp,
        stade: String,
        dateInscription: Timestamp
      }
    ],

    articles_rediges: Number,
    photos_partagees: Number,
    commentaires_postes: Number,
    live_commentaires: Number,
    messages_envoyes: Number,

    // Contributions
    contributions_total: Number,
    dernieres_contributions: [
      {
        type: String,          // "article" | "photo" | "video"
        titre: String,
        dateContribution: Timestamp,
        likes: Number
      }
    ]
  },

  // Badges & Récompenses
  badges: [
    {
      id: String,
      nom: String,
      description: String,
      icon: String,
      dateObtention: Timestamp,
      rareté: String
    }
  ],

  // Conditions de participation
  conditions: {
    inscriptionValidee: Boolean,
    emailValide: Boolean,
    emailValide_date: Timestamp,
    telephoneValide: Boolean,
    telephoneValide_date: Timestamp,
    charte_acceptee: Boolean,
    charte_acceptee_date: Timestamp,
    identite_verifiee: Boolean,
    identite_verifiee_date: Timestamp
  },

  // Préférences de notification
  notifications: {
    matchs_mon_club: Boolean,
    tous_les_matchs: Boolean,
    actualites_club: Boolean,
    promotions: Boolean,
    newsletters: Boolean,
    reminders_avant_match: Boolean,
    resultat_scores: Boolean
  },

  // Bans & Restrictions
  restrictions: {
    banni: Boolean,
    raison_ban: String,
    date_ban: Timestamp,
    avertissements: Number,
    derniers_avertissements: Array
  },

  // Métadonnées
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastActiveAt: Timestamp,
  accountStatus: String  // "active" | "suspended" | "banned"
};

// ──────────────────────────────────────────────────────────
// SCHÉMA ④ : FICHES ACTEURS INTERNATIONAUX
// ──────────────────────────────────────────────────────────

export const SCHEMA_JOUEUR_INTERNATIONAL = {
  // Collection: joueursInternational
  // Document: {joueurId}

  typeActeur: "JOUEUR",

  // Identité
  identite: {
    prenom: String,
    nom: String,
    surnoms: Array,            // ["Pelé", "King"]
    nationalite: String,       // Pays
    dateNaissance: String,
    sexe: String,
    taille: Number,            // cm
    poids: Number,             // kg
    poidsFormule: String,      // "1.80m, 75kg"
  },

  // Caractéristiques physiques
  caracteristiques: {
    pied_dominant: String,     // "Droit" | "Gauche" | "Ambidextre"
    type_joueur: String,       // "Attaquant", "Défenseur", etc.
    vitesse: Number,           // 1-10
    technique: Number,         // 1-10
    force: Number,             // 1-10
    endurance: Number,         // 1-10
    intelligence_jeu: Number   // 1-10
  },

  // Informations professionnelles
  profession: {
    position_principale: String, // "Attaquant", "Gardien"
    positions_secondaires: Array,
    numero_maillot: Number,
    
    // Club actuel
    club_actuel: {
      clubId: String,
      nom: String,
      pays: String,
      logoURL: String,
      dateSignature: String,
      dureeContrat: String,     // "Jusqu'à 2025"
      salaire_estimation: Number,
      contrat_professionnel: Boolean
    },

    // Historique clubs
    historique_clubs: [
      {
        clubId: String,
        nom: String,
        pays: String,
        dateDebut: String,
        dateFin: String,
        matchsJoues: Number,
        butsMarques: Number,
        numero: Number
      }
    ]
  },

  // Carrière Internationale
  carriere_internationale: {
    selection_principale: String,  // "Équipe A Gabon"
    nombre_selections: Number,
    nombre_buts: Number,
    nombre_passes: Number,
    trophees_internationaux: Array,
    
    historique_selections: [
      {
        pays: String,
        niveau: String,           // "A" | "U-23" | "U-20"
        dateDebut: String,
        dateFin: String,
        matchsJoues: Number,
        buts: Number
      }
    ]
  },

  // Statistiques carrière
  statistiques: {
    carriere_totale: {
      matchs_joues: Number,
      buts_marques: Number,
      passes_decisives: Number,
      matchs_titulaire: Number,
      matchs_remplacant: Number,
      minutes_jouees: Number,
      cartons_jaunes: Number,
      cartons_rouges: Number
    },

    saison_actuelle: {
      saison: String,            // "2023-2024"
      matchs: Number,
      buts: Number,
      passes: Number,
      minutes: Number
    },

    comparaisons: {
      buts_par_match: Number,
      taux_reussite: Number,
      passes_precisison: Number
    }
  },

  // Palmarès
  palmares: [
    {
      titre: String,             // "Coupe du Gabon 2023"
      competition: String,
      pays: String,
      annee: Number,
      club: String
    }
  ],

  // Marché & Valeur
  marche: {
    valeur_marche_estimation: Number,  // En EUR
    devise: String,             // "EUR"
    tendance: String,           // "↑ HAUSSE" | "→ STABLE" | "↓ BAISSE"
    variation_12_mois: Number,  // %
    historique_valeur: [
      {
        date: String,
        valeur: Number
      }
    ],
    plus_values_transfert: Number,  // EUR
    salaire_base: Number,       // EUR/an
  },

  // Média & Présence
  media: {
    photoURL: String,
    photosGalerie: Array,
    videosURL: [
      {
        titre: String,
        url: String,
        dateAjout: String
      }
    ],
    highlights: Array,
    interviews: Array
  },

  // Réseaux sociaux
  reseauxSociaux: {
    instagram_followers: Number,
    twitter_followers: Number,
    facebook_followers: Number,
    instagram_url: String,
    twitter_url: String,
    site_personnel: String
  },

  // Évaluations & Notes
  evaluations: {
    note_globale: Number,        // 1-10
    note_attaque: Number,
    note_defense: Number,
    note_passe: Number,
    avis_experts: Number,
    avis_supporters: Number,
    nombre_evaluations: Number
  },

  // Métadonnées
  createdAt: Timestamp,
  updatedAt: Timestamp,
  verifie: Boolean,
  verified_by: String,          // "FIFA" | "UE" | "Admin"
  official: Boolean
};

export const SCHEMA_CLUB_INTERNATIONAL = {
  // Collection: clubsInternational
  // Document: {clubId}

  typeActeur: "CLUB",

  // Identité du club
  identite: {
    nom: String,
    nomCourt: String,           // Sigle: PSG, OM
    pays: String,
    ville: String,
    annee_fondation: Number,
    logo_url: String,
    couleurs: Array,            // ["Bleu", "Blanc"]
    hymne: String
  },

  // Structure
  structure: {
    president: String,
    directeur_general: String,
    entraineur_principal: String,
    entraineur_assistant: String,
    capitaine: String,
    
    // Contact
    email: String,
    telephone: String,
    site_officiel: String,
    adresse: String,
    
    // Infrastructure
    stade: {
      nom: String,
      capacite: Number,
      annee_construction: Number,
      pays: String,
      ville: String,
      image_url: String
    }
  },

  // Sports pratiqués
  sports_et_divisions: [
    {
      sport: String,            // "Football"
      divisions: Array,         // ["Hommes", "Femmes", "Jeunes"]
      categories_age: Array
    }
  ],

  // Effectif actuel
  effectif: {
    nombre_joueurs_actifs: Number,
    nombre_equipes: Number,
    
    joueurs_actuels: [
      {
        joueurId: String,
        nom: String,
        numero: Number,
        position: String,
        nationalite: String,
        dateSignature: String
      }
    ],

    staff_technique: [
      {
        nom: String,
        fonction: String,
        specialite: String,
        experience: Number
      }
    ]
  },

  // Compétitions & Palmarès
  competitions: {
    ligue_nationale: String,    // "Ligue 1 Gabon"
    niveau_europeen: String,    // "Ligue des Champions"
    
    participations: [
      {
        competition: String,
        saison: String,
        position_finale: Number,
        matchs_joues: Number
      }
    ],

    trophees_remportes: [
      {
        titre: String,
        competition: String,
        annee: Number,
        nombre_fois: Number
      }
    ],

    palmares_historique: {
      championships_nationaux: Number,
      couppes_nationales: Number,
      trophees_africains: Number,
      trophees_europeens: Number,
      trophees_mondiaux: Number
    }
  },

  // Finances & Budget
  finances: {
    budget_annuel: Number,
    devise: String,             // "EUR"
    revenus_principaux: Array,
    masse_salariale: Number,
    valeur_globale: Number,
    dette: Number,
    notation_financiere: String  // "A+" | "A" | "BBB"
  },

  // Académie & Formation
  academie: {
    existe: Boolean,
    nombre_categories: Number,
    ages_acceptes: String,
    joueurs_academie: Number,
    joueurs_venus_academie: Array
  },

  // Réseaux sociaux & Média
  media: {
    instagram_followers: Number,
    twitter_followers: Number,
    facebook_followers: Number,
    youtube_abonnes: Number,
    instagram: String,
    twitter: String,
    facebook: String,
    youtube: String,
    photos_galerie: Array
  },

  // Relations
  rivalites: [
    {
      club: String,
      pays: String,
      motif: String
    }
  ],

  partenaires: Array,
  sponsors_principaux: Array,

  // Métadonnées
  createdAt: Timestamp,
  updatedAt: Timestamp,
  verifie: Boolean,
  official: Boolean,
  popularity_score: Number  // 0-100
};

// ──────────────────────────────────────────────────────────
// FONCTIONS HELPERS
// ──────────────────────────────────────────────────────────

export async function initialiserCollections() {
  console.log('🔄 Initialisation des collections Firestore v5.0...');
  
  // Les collections se créent automatiquement lors du premier document
  console.log('✅ Collections prêtes:');
  console.log('  - sitesSportifs_avancee');
  console.log('  - userProfiles_avancee');
  console.log('  - supporters_enrichi');
  console.log('  - joueursInternational');
  console.log('  - clubsInternational');
  console.log('  - arbitresInternational');
}

export async function validerSchema(data, schema) {
  const errors = [];
  
  for (const [key, type] of Object.entries(schema)) {
    if (data[key] === undefined && type !== 'optional') {
      errors.push(`Champ manquant: ${key}`);
    }
  }

  return {
    valide: errors.length === 0,
    erreurs: errors
  };
}

console.log('✅ Schémas Firestore v5.0 chargés');
