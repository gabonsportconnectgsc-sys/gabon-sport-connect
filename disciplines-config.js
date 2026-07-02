/**
 * ══════════════════════════════════════════════════════════════════════
 *  DISCIPLINES-CONFIG.JS — Référentiel des disciplines sportives
 *  Gabon Sport Connect · Module 1/7 · 2026
 *
 *  Fondation partagée par tous les nouveaux modules (structures,
 *  infrastructures, conformité, archivage, formulaires dynamiques).
 *  Ne modifie rien à l'existant : lecture seule, exposé sur window.
 *
 *  Contenu :
 *   - Liste des disciplines + familles (collectif / combat / individuel)
 *   - Catégories d'âge par discipline
 *   - Types de structures autorisés par discipline
 *   - Types d'infrastructures pertinents par discipline
 *   - Rôles d'encadrement par discipline
 *   - Documents administratifs requis par discipline et organisme
 *     (Ministère, Fédération, Ligue, FIFA, CAF, etc.) — paramétrable
 *     par l'admin via compliance-module.js (surcharge Firestore).
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
   * 1. GABARITS DE CATÉGORIES D'ÂGE (mutualisés pour éviter la duplication)
   * ══════════════════════════════════════════════════════════════════ */
  const CAT_COLLECTIF = ['U7', 'U9', 'U11', 'U13', 'U15', 'U17', 'U20', 'Senior', 'Vétéran'];
  const CAT_COMBAT     = ['Poussin', 'Benjamin', 'Minime', 'Cadet', 'Junior', 'Senior', 'Vétéran'];
  const CAT_INDIVIDUEL = ['Poussin', 'Benjamin', 'Minime', 'Cadet', 'Junior', 'Espoir', 'Senior', 'Vétéran'];
  const CAT_HANDISPORT = ['Jeune', 'Senior', 'Vétéran'];

  /* ══════════════════════════════════════════════════════════════════
   * 2. GABARITS D'ENCADREMENT (mutualisés)
   * ══════════════════════════════════════════════════════════════════ */
  const ENCADREMENT_BASE = [
    'Président', 'Vice-président', 'Secrétaire général', 'Trésorier',
    'Directeur technique', 'Entraîneur principal', 'Entraîneur adjoint',
    'Préparateur physique', 'Médecin du sport', 'Kinésithérapeute',
    'Team manager', 'Responsable arbitrage'
  ];
  const ENCADREMENT_COMBAT = [
    'Président', 'Vice-président', 'Secrétaire général', 'Trésorier',
    'Directeur technique', 'Entraîneur principal', 'Entraîneur adjoint',
    'Médecin du sport', 'Kinésithérapeute', 'Responsable pesée',
    'Responsable arbitrage'
  ];
  const ENCADREMENT_INDIVIDUEL = [
    'Président', 'Vice-président', 'Secrétaire général', 'Trésorier',
    'Directeur technique', 'Entraîneur principal', 'Entraîneur adjoint',
    'Préparateur physique', 'Médecin du sport', 'Kinésithérapeute'
  ];

  /* ══════════════════════════════════════════════════════════════════
   * 3. GABARITS D'INFRASTRUCTURES (mutualisés)
   * ══════════════════════════════════════════════════════════════════ */
  const INFRA_COLLECTIF_EXTERIEUR = ['Stade', 'Terrain d\'entraînement', 'Vestiaires', 'Tribune', 'Bureau administratif', 'Internat', 'Salle de musculation', 'Centre d\'entraînement', 'Infirmerie'];
  const INFRA_COLLECTIF_INTERIEUR = ['Salle omnisports', 'Terrain d\'entraînement', 'Vestiaires', 'Bureau administratif', 'Internat', 'Salle de musculation', 'Centre d\'entraînement', 'Infirmerie'];
  const INFRA_COMBAT = ['Salle d\'entraînement (dojo/ring)', 'Salle de musculation', 'Bureau administratif', 'Internat', 'Vestiaires', 'Infirmerie', 'Salle de pesée'];
  const INFRA_ATHLETISME = ['Piste d\'athlétisme', 'Aire de sauts/lancers', 'Salle de musculation', 'Bureau administratif', 'Internat', 'Vestiaires', 'Infirmerie'];
  const INFRA_NATATION = ['Piscine', 'Bassin d\'apprentissage', 'Salle de musculation', 'Bureau administratif', 'Internat', 'Vestiaires', 'Infirmerie'];
  const INFRA_TENNIS = ['Court de tennis', 'Bureau administratif', 'Vestiaires', 'Salle de musculation', 'Infirmerie'];

  /* ══════════════════════════════════════════════════════════════════
   * 4. GABARITS DE DOCUMENTS ADMINISTRATIFS (mutualisés)
   *    organisme : 'ministere' | 'federation' | 'ligue' | 'fifa' | 'caf'
   * ══════════════════════════════════════════════════════════════════ */
  const DOCS_MINISTERE = [
    { id: 'statuts', label: 'Statuts de la structure', organisme: 'ministere', obligatoire: true },
    { id: 'recepisse', label: 'Récépissé de déclaration', organisme: 'ministere', obligatoire: true },
    { id: 'pv_ag', label: 'PV de la dernière Assemblée Générale', organisme: 'ministere', obligatoire: true },
    { id: 'liste_bureau', label: 'Liste des membres du bureau', organisme: 'ministere', obligatoire: true },
    { id: 'rapport_moral', label: 'Rapport moral annuel', organisme: 'ministere', obligatoire: false },
    { id: 'rapport_financier', label: 'Rapport financier annuel', organisme: 'ministere', obligatoire: false }
  ];
  const DOCS_FEDERATION_BASE = [
    { id: 'affiliation_federation', label: 'Attestation d\'affiliation à la fédération', organisme: 'federation', obligatoire: true },
    { id: 'registre_licencies', label: 'Registre des licenciés', organisme: 'federation', obligatoire: true },
    { id: 'certificats_medicaux', label: 'Certificats médicaux des licenciés', organisme: 'federation', obligatoire: true },
    { id: 'attestation_assurance', label: 'Attestation d\'assurance', organisme: 'federation', obligatoire: true }
  ];
  const DOCS_LIGUE_BASE = [
    { id: 'affiliation_ligue', label: 'Attestation d\'affiliation à la ligue', organisme: 'ligue', obligatoire: true },
    { id: 'engagement_championnat', label: 'Fiche d\'engagement au championnat', organisme: 'ligue', obligatoire: false }
  ];
  const DOCS_FOOTBALL_INTERNATIONAL = [
    { id: 'licence_club_fifa', label: 'Licence club FIFA', organisme: 'fifa', obligatoire: false },
    { id: 'certification_stade_caf', label: 'Certification stade CAF', organisme: 'caf', obligatoire: false },
    { id: 'attestation_caf', label: 'Attestation d\'affiliation CAF', organisme: 'caf', obligatoire: false }
  ];

  function buildDocs(sportSpecific) {
    return [...DOCS_MINISTERE, ...DOCS_FEDERATION_BASE, ...DOCS_LIGUE_BASE, ...(sportSpecific || [])];
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. RÉFÉRENTIEL DES DISCIPLINES
   * ══════════════════════════════════════════════════════════════════ */
  const DISCIPLINES = {
    'Football': {
      icon: '⚽', famille: 'collectif',
      categories: CAT_COLLECTIF,
      structureTypes: ['Club', 'Association', 'Académie', 'Centre de formation'],
      infrastructures: INFRA_COLLECTIF_EXTERIEUR,
      encadrement: ENCADREMENT_BASE,
      documents: buildDocs(DOCS_FOOTBALL_INTERNATIONAL),
      organismes: ['Ministère', 'FEGAFOOT (Fédération)', 'Ligue', 'FIFA', 'CAF']
    },
    'Basketball': {
      icon: '🏀', famille: 'collectif',
      categories: CAT_COLLECTIF,
      structureTypes: ['Club', 'Association', 'Académie'],
      infrastructures: INFRA_COLLECTIF_INTERIEUR,
      encadrement: ENCADREMENT_BASE,
      documents: buildDocs([
        { id: 'affiliation_fiba', label: 'Attestation d\'affiliation FIBA Afrique', organisme: 'fiba', obligatoire: false }
      ]),
      organismes: ['Ministère', 'Fédération', 'Ligue', 'FIBA Afrique']
    },
    'Handball': {
      icon: '🤾', famille: 'collectif',
      categories: CAT_COLLECTIF,
      structureTypes: ['Club', 'Association', 'Académie'],
      infrastructures: INFRA_COLLECTIF_INTERIEUR,
      encadrement: ENCADREMENT_BASE,
      documents: buildDocs(),
      organismes: ['Ministère', 'Fédération', 'Ligue']
    },
    'Volleyball': {
      icon: '🏐', famille: 'collectif',
      categories: CAT_COLLECTIF,
      structureTypes: ['Club', 'Association', 'Académie'],
      infrastructures: INFRA_COLLECTIF_INTERIEUR,
      encadrement: ENCADREMENT_BASE,
      documents: buildDocs(),
      organismes: ['Ministère', 'Fédération', 'Ligue']
    },
    'Rugby': {
      icon: '🏉', famille: 'collectif',
      categories: CAT_COLLECTIF,
      structureTypes: ['Club', 'Association'],
      infrastructures: INFRA_COLLECTIF_EXTERIEUR,
      encadrement: ENCADREMENT_BASE,
      documents: buildDocs(),
      organismes: ['Ministère', 'Fédération', 'Ligue']
    },
    'Athlétisme': {
      icon: '🏃', famille: 'individuel',
      categories: CAT_INDIVIDUEL,
      structureTypes: ['Club', 'Association', 'Centre de formation'],
      infrastructures: INFRA_ATHLETISME,
      encadrement: ENCADREMENT_INDIVIDUEL,
      documents: buildDocs(),
      organismes: ['Ministère', 'Fédération']
    },
    'Natation': {
      icon: '🏊', famille: 'individuel',
      categories: CAT_INDIVIDUEL,
      structureTypes: ['Club', 'Association', 'Centre de formation'],
      infrastructures: INFRA_NATATION,
      encadrement: ENCADREMENT_INDIVIDUEL,
      documents: buildDocs(),
      organismes: ['Ministère', 'Fédération']
    },
    'Tennis': {
      icon: '🎾', famille: 'individuel',
      categories: CAT_INDIVIDUEL,
      structureTypes: ['Club', 'Association'],
      infrastructures: INFRA_TENNIS,
      encadrement: ENCADREMENT_INDIVIDUEL,
      documents: buildDocs(),
      organismes: ['Ministère', 'Fédération']
    },
    'Boxe': {
      icon: '🥊', famille: 'combat',
      categories: CAT_COMBAT,
      structureTypes: ['Club', 'Association', 'Académie'],
      infrastructures: INFRA_COMBAT,
      encadrement: ENCADREMENT_COMBAT,
      documents: buildDocs(),
      organismes: ['Ministère', 'Fédération']
    },
    'Judo': {
      icon: '🥋', famille: 'combat',
      categories: CAT_COMBAT,
      structureTypes: ['Club', 'Association', 'Dojo'],
      infrastructures: INFRA_COMBAT,
      encadrement: ENCADREMENT_COMBAT,
      documents: buildDocs(),
      organismes: ['Ministère', 'Fédération']
    },
    'Taekwondo': {
      icon: '🦵', famille: 'combat',
      categories: CAT_COMBAT,
      structureTypes: ['Club', 'Association', 'Dojo'],
      infrastructures: INFRA_COMBAT,
      encadrement: ENCADREMENT_COMBAT,
      documents: buildDocs(),
      organismes: ['Ministère', 'Fédération']
    },
    'Lutte': {
      icon: '🤼', famille: 'combat',
      categories: CAT_COMBAT,
      structureTypes: ['Club', 'Association'],
      infrastructures: INFRA_COMBAT,
      encadrement: ENCADREMENT_COMBAT,
      documents: buildDocs(),
      organismes: ['Ministère', 'Fédération']
    },
    'Handisport': {
      icon: '🦾', famille: 'handisport',
      categories: CAT_HANDISPORT,
      structureTypes: ['Club', 'Association'],
      infrastructures: INFRA_COLLECTIF_INTERIEUR,
      encadrement: ENCADREMENT_INDIVIDUEL,
      documents: buildDocs(),
      organismes: ['Ministère', 'Fédération']
    }
  };

  /* Discipline par défaut si un sport non répertorié est rencontré
     (ex: nouvelles disciplines créées par l'admin) */
  const DEFAULT_DISCIPLINE = {
    icon: '🏅', famille: 'individuel',
    categories: CAT_INDIVIDUEL,
    structureTypes: ['Club', 'Association', 'Académie'],
    infrastructures: INFRA_COLLECTIF_INTERIEUR,
    encadrement: ENCADREMENT_INDIVIDUEL,
    documents: buildDocs(),
    organismes: ['Ministère', 'Fédération']
  };

  /* ══════════════════════════════════════════════════════════════════
   * 6. API PUBLIQUE
   * ══════════════════════════════════════════════════════════════════ */
  function listDisciplines() {
    return Object.keys(DISCIPLINES);
  }

  function getDiscipline(sport) {
    return DISCIPLINES[sport] || DEFAULT_DISCIPLINE;
  }

  function getCategories(sport) {
    return getDiscipline(sport).categories.slice();
  }

  function getStructureTypes(sport) {
    return getDiscipline(sport).structureTypes.slice();
  }

  function getInfrastructureTypes(sport) {
    return getDiscipline(sport).infrastructures.slice();
  }

  function getEncadrementRoles(sport) {
    return getDiscipline(sport).encadrement.slice();
  }

  function getRequiredDocuments(sport) {
    return getDiscipline(sport).documents.map(d => ({ ...d }));
  }

  function getOrganismes(sport) {
    return getDiscipline(sport).organismes.slice();
  }

  function getIcon(sport) {
    return getDiscipline(sport).icon;
  }

  function getFamille(sport) {
    return getDiscipline(sport).famille;
  }

  /**
   * Calcule le badge de conformité en fonction des documents fournis.
   * @param {number} fournis  nombre de documents obligatoires fournis
   * @param {number} total    nombre total de documents obligatoires requis
   * @returns {{level:string,label:string,pct:number,color:string}}
   */
  function computeComplianceBadge(fournis, total) {
    const pct = total > 0 ? Math.round((fournis / total) * 100) : 0;
    if (pct >= 100) return { level: 'or', label: 'Or', pct, color: '#FFD700' };
    if (pct >= 50) return { level: 'argent', label: 'Argent', pct, color: '#C0C0C0' };
    return { level: 'bronze', label: 'Bronze', pct, color: '#CD7F32' };
  }

  /* ══════════════════════════════════════════════════════════════════
   * 7. EXPOSITION GLOBALE (namespace unique, pas de pollution window)
   * ══════════════════════════════════════════════════════════════════ */
  window.GSCDisciplines = {
    list: listDisciplines,
    get: getDiscipline,
    getCategories,
    getStructureTypes,
    getInfrastructureTypes,
    getEncadrementRoles,
    getRequiredDocuments,
    getOrganismes,
    getIcon,
    getFamille,
    computeComplianceBadge,
    // Accès direct en lecture seule pour cas avancés
    _raw: DISCIPLINES
  };

})(window);
