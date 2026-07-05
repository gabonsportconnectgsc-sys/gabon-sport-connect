/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC GABON SPORTS DATA — Référentiel réel des acteurs sportifs gabonais
 *  Gabon Sport Connect · v1.0 · 2026
 *
 *  Source de vérité pour :
 *   - la liste déroulante "Club / Structure" du formulaire d'inscription
 *   - le moteur de validation d'affiliation (gsc-club-validation.js)
 *   - toute autre fiche qui a besoin de connaître les structures officielles
 *
 *  ⚠️ DONNÉES SPORTIVES VIVANTES : les compositions de championnat,
 *  montées/descentes et bureaux fédéraux changent chaque saison.
 *  Ce fichier a été constitué à partir de sources publiques (site de la
 *  fédération, presse sportive gabonaise, agrégateurs de scores) au
 *  moment de sa rédaction (saison 2025-2026, National Foot 1 démarré le
 *  7 mars 2026). Un encart admin est prévu (voir gsc-club-validation-admin.js)
 *  pour corriger/actualiser ces informations sans toucher au code.
 *
 *  Ne bloque rien si absent : tous les modules qui le consomment
 *  vérifient sa présence avant de l'utiliser.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
   * 1. FÉDÉRATIONS SPORTIVES GABONAISES
   * ══════════════════════════════════════════════════════════════════ */
  const FEDERATIONS = [
    { id: 'FEGAFOOT',   nom: 'Fédération Gabonaise de Football',              sigle: 'FEGAFOOT',  sport: 'Football',    type: 'federation' },
    { id: 'FEGABASKET', nom: 'Fédération Gabonaise de Basketball',            sigle: 'FEGABASKET',sport: 'Basketball',  type: 'federation' },
    { id: 'FGHAND',      nom: 'Fédération Gabonaise de Handball',              sigle: 'FGHAND',     sport: 'Handball',    type: 'federation' },
    { id: 'FGVOLLEY',    nom: 'Fédération Gabonaise de Volleyball',            sigle: 'FGVOLLEY',   sport: 'Volleyball',  type: 'federation' },
    { id: 'FGA',         nom: "Fédération Gabonaise d'Athlétisme",             sigle: 'FGA',        sport: 'Athlétisme',  type: 'federation' },
    { id: 'FGBOXE',      nom: 'Fédération Gabonaise de Boxe',                  sigle: 'FGBOXE',     sport: 'Boxe',        type: 'federation' },
    { id: 'FGNAT',       nom: 'Fédération Gabonaise de Natation',              sigle: 'FGNAT',      sport: 'Natation',    type: 'federation' },
    { id: 'FGJUDO',      nom: 'Fédération Gabonaise de Judo',                  sigle: 'FGJUDO',     sport: 'Judo',        type: 'federation' },
    { id: 'FGTKD',       nom: 'Fédération Gabonaise de Taekwondo',             sigle: 'FGTKD',      sport: 'Taekwondo',   type: 'federation' },
    { id: 'CNOSG',       nom: 'Comité National Olympique et Sportif Gabonais',  sigle: 'CNOSG',      sport: 'Multisports', type: 'federation' },
  ];

  /* ══════════════════════════════════════════════════════════════════
   * 2. CHAMPIONNAT NATIONAL FOOT 1 — Saison 2025-2026 (14 clubs)
   *    Ligue organisatrice : LINAFP (Ligue Nationale de Football
   *    Professionnel), sous l'égide de la FEGAFOOT.
   *    Saison 2025-2026 : coup d'envoi le 7 mars 2026, clôture prévue
   *    le 6 septembre 2026 (48e édition, 1re à 14 clubs).
   *    Promus 2025-2026 : Stade Migovéen, Oyem AC, Ogooué FC.
   *    Relégués fin 2024-2025 : CFF Mounana, CS Bendjé.
   * ══════════════════════════════════════════════════════════════════ */
  const CLUBS_D1_FOOTBALL_2025_2026 = [
    { id: 'as-mangasport',      nom: 'AS Mangasport',                 ville: 'Moanda',       tenantDuTitre: true  },
    { id: 'as-stade-mandji',    nom: 'AS Stade Mandji',               ville: 'Port-Gentil' },
    { id: 'fc-105-libreville',  nom: 'FC 105 Libreville',             ville: 'Libreville',   aliasHistorique: 'FC Canon 105' },
    { id: 'oyem-ac',            nom: 'Oyem Athletic Club',            ville: 'Oyem',         promu2025: true },
    { id: 'cercle-mberi',       nom: 'AO Cercle Mbéri Sportif',       ville: 'Franceville',  sigle: 'CMS' },
    { id: 'stade-migoveen',     nom: 'Stade Migovéen',                ville: 'Moanda',       promu2025: true },
    { id: 'lambarene-ac',       nom: 'Lambaréné Athletic Club',       ville: 'Lambaréné' },
    { id: 'ogooue-fc',          nom: 'Ogooué FC',                     ville: 'Port-Gentil',  promu2025: true },
    { id: 'vautour-club',       nom: 'Vautour Club',                  ville: 'Port-Gentil' },
    { id: 'us-oyem',            nom: "Union Sportive d'Oyem",         ville: 'Oyem',         sigle: 'USO' },
    { id: 'as-bouenguidi',      nom: 'AS Bouenguidi (Bouenguidi Sports)', ville: 'Franceville' },
    { id: 'lozo-sports',        nom: 'Lozo Sports',                   ville: 'Port-Gentil' },
    { id: 'us-bitam',           nom: 'Union Sportive de Bitam',       ville: 'Bitam',        sigle: 'US Bitam' },
    { id: 'as-dikaki',          nom: 'AS Dikaki',                     ville: 'Port-Gentil' },
  ].map(c => Object.assign(c, {
    sport: 'Football',
    division: 'National Foot 1 (D1)',
    saison: '2025-2026',
    federationId: 'FEGAFOOT',
    type: 'club',
    // Un club peut valider/refuser les demandes d'affiliation de ses acteurs
    // (joueurs sous contrat, staff, dirigeants) une fois son propre compte
    // "club" créé et rattaché à cet id sur la plateforme.
    validationCapable: true,
  }));

  /* Clubs / structures notoires hors D1 ou autres disciplines — liste non
     exhaustive, à enrichir depuis le panneau admin au fil de l'eau. */
  const AUTRES_STRUCTURES = [
    { id: 'cff-mounana',       nom: 'CFF Mounana',                   ville: 'Mounana',      sport: 'Football', division: 'National Foot 2 (relégué 2025)', federationId: 'FEGAFOOT', type: 'club', validationCapable: true },
    { id: 'cs-bendje',         nom: 'CS Bendjé',                     ville: 'Port-Gentil',  sport: 'Football', division: 'National Foot 2 (relégué 2025)', federationId: 'FEGAFOOT', type: 'club', validationCapable: true },
    { id: 'bc-libreville',     nom: 'BC Libreville',                 ville: 'Libreville',   sport: 'Basketball', division: 'Championnat national', federationId: 'FEGABASKET', type: 'club', validationCapable: true },
    { id: 'patronage-ste-marie', nom: 'Patronage Sainte-Marie',      ville: 'Libreville',   sport: 'Basketball', division: 'Championnat national', federationId: 'FEGABASKET', type: 'club', validationCapable: true },
    { id: 'asptt-libreville',  nom: 'ASPTT Libreville',              ville: 'Libreville',   sport: 'Multisports', division: '—', federationId: null, type: 'club', validationCapable: true },
  ];

  /* Établissements scolaires / universitaires — pas de validation
     d'affiliation "club" mais pertinents pour le champ employeur des
     élèves/étudiants sportifs. */
  const ETABLISSEMENTS = [
    { id: 'uob',   nom: 'Université Omar Bongo',        ville: 'Libreville', type: 'etablissement', validationCapable: false },
    { id: 'insg',  nom: 'INSG',                          ville: 'Libreville', type: 'etablissement', validationCapable: false },
    { id: 'ista',  nom: 'ISTA',                           ville: 'Libreville', type: 'etablissement', validationCapable: false },
    { id: 'lnlm',  nom: 'Lycée National Léon Mba',       ville: 'Libreville', type: 'etablissement', validationCapable: false },
  ];

  const ALL_CLUBS = [].concat(CLUBS_D1_FOOTBALL_2025_2026, AUTRES_STRUCTURES);
  const ALL_STRUCTURES = [].concat(FEDERATIONS, ALL_CLUBS, ETABLISSEMENTS);

  const SPORTS_LIST = [
    'Football', 'Basketball', 'Handball', 'Volleyball', 'Athlétisme',
    'Boxe', 'Natation', 'Judo', 'Taekwondo', 'Multisports',
  ];

  /* ══════════════════════════════════════════════════════════════════
   * 3. HELPERS
   * ══════════════════════════════════════════════════════════════════ */
  function getFederationBySport(sport) {
    return FEDERATIONS.find(f => f.sport === sport) || null;
  }
  function getClubsBySport(sport) {
    if (!sport || sport === 'Tous' || sport === 'Multisports') return ALL_CLUBS;
    return ALL_CLUBS.filter(c => c.sport === sport);
  }
  function getStructureById(id) {
    return ALL_STRUCTURES.find(s => s.id === id) || null;
  }
  /** Retrouve une structure "validation-capable" (club/fédération) à partir
   *  d'un id OU d'un nom saisi/sélectionné (tolérant à la casse/accents). */
  function findValidationCapableStructure(idOrName) {
    if (!idOrName) return null;
    const norm = s => (s || '').toString().trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const target = norm(idOrName);
    return ALL_STRUCTURES.find(s => s.validationCapable && (
      norm(s.id) === target || norm(s.nom) === target || norm(s.sigle) === target
    )) || null;
  }

  window.GSC_GABON_SPORTS_DATA = {
    FEDERATIONS,
    CLUBS_D1_FOOTBALL_2025_2026,
    AUTRES_STRUCTURES,
    ETABLISSEMENTS,
    ALL_CLUBS,
    ALL_STRUCTURES,
    SPORTS_LIST,
    getFederationBySport,
    getClubsBySport,
    getStructureById,
    findValidationCapableStructure,
  };

})(window);
