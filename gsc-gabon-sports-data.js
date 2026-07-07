/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC GABON SPORTS DATA — Référentiel réel des acteurs sportifs gabonais
 *  Gabon Sport Connect · v1.1 · 2026
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
 *
 *  ─────────────────────────────────────────────────────────────────
 *  MISE À JOUR v1.1 (juillet 2026) — Champs officiels ajoutés :
 *  président, secrétaire général, adresse/siège, contact (tél/email
 *  officiels), site web, quand publiquement disponibles et vérifiables
 *  (presse gabonaise, sites fédéraux/olympiques officiels, FIFA/FIBA/
 *  IHF/FIVB, ANOC/Olympics.com). Champ vide = information non trouvée
 *  de façon fiable → À NE PAS INVENTER, à compléter par la suite via
 *  la prise en main manuelle (panneau admin Structures).
 *  Ces mandats/bureaux peuvent changer (élections, démissions) : à
 *  vérifier périodiquement.
 *  ─────────────────────────────────────────────────────────────────
 */
(function (window) {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
   * 1. FÉDÉRATIONS SPORTIVES GABONAISES
   * ══════════════════════════════════════════════════════════════════ */
  const FEDERATIONS = [
    {
      id: 'FEGAFOOT', nom: 'Fédération Gabonaise de Football', sigle: 'FEGAFOOT', sport: 'Football', type: 'federation',
      president: 'Pierre Alain Mounguengui',
      secretaireGeneral: '',
      adresse: 'Owendo (Maison Alexandre Sambat), Libreville',
      telephone: '', email: '', siteWeb: 'https://fegafoot.ga',
      sourceNote: "Comité exécutif maintenu en fonction par la FIFA/CAF jusqu'aux élections, échéance au plus tard le 31/12/2026.",
    },
    {
      id: 'FEGABASKET', nom: 'Fédération Gabonaise de Basketball', sigle: 'FEGABAB', sport: 'Basketball', type: 'federation',
      president: 'Willy Conrad Asseko',
      secretaireGeneral: '',
      adresse: 'B.P. 679, Libreville',
      telephone: '', email: '', siteWeb: '',
      sourceNote: '',
    },
    {
      id: 'FGHAND', nom: 'Fédération Gabonaise de Handball', sigle: 'FEGAHAND', sport: 'Handball', type: 'federation',
      president: 'Général Sylvain Florient Pangou Mbembo',
      secretaireGeneral: '',
      adresse: 'Libreville',
      telephone: '', email: '', siteWeb: '',
      sourceNote: 'Réélu le 02/08/2025 pour un 2e mandat de 4 ans. Occupe aussi la présidence du CNOSG depuis mai 2026.',
    },
    {
      id: 'FGVOLLEY', nom: 'Fédération Gabonaise de Volleyball', sigle: 'FEGAVOLLEY', sport: 'Volleyball', type: 'federation',
      president: 'Raymond Bernard Bivigou',
      secretaireGeneral: '',
      adresse: 'Angondjè, Libreville',
      telephone: '', email: '', siteWeb: '',
      sourceNote: 'Réélu candidat unique, mandat depuis le 13/01/2024 (4 ans).',
    },
    {
      id: 'FGA', nom: "Fédération Gabonaise d'Athlétisme", sigle: 'FGA', sport: 'Athlétisme', type: 'federation',
      president: 'Anaclet Mathieu Taty',
      secretaireGeneral: '',
      adresse: 'Libreville',
      telephone: '', email: '', siteWeb: '',
      sourceNote: 'Taty est également Secrétaire Général du CNOSG depuis mai 2026.',
    },
    {
      id: 'FGBOXE', nom: 'Fédération Gabonaise de Boxe', sigle: 'FGBOXE', sport: 'Boxe', type: 'federation',
      president: '',
      secretaireGeneral: '',
      adresse: '',
      telephone: '', email: '', siteWeb: '',
      sourceNote: 'Présidence vacante publiquement rapportée (démission de Bonaventure Nzigou Manfoumbi) — à confirmer/actualiser.',
    },
    {
      id: 'FGNAT', nom: 'Fédération Gabonaise de Natation', sigle: 'FEGANA', sport: 'Natation', type: 'federation',
      president: 'Stéphane Soami Mabiala',
      secretaireGeneral: '',
      adresse: 'Libreville',
      telephone: '', email: '', siteWeb: '',
      sourceNote: 'Élu le 04/04/2024, succède à Crésant Pambo.',
    },
    {
      id: 'FGJUDO', nom: 'Fédération Gabonaise de Judo', sigle: 'FGJUDO', sport: 'Judo', type: 'federation',
      president: '',
      secretaireGeneral: '',
      adresse: '',
      telephone: '', email: '', siteWeb: '',
      sourceNote: 'Présidence non confirmée par une source publique fiable au moment de la rédaction.',
    },
    {
      id: 'FGTKD', nom: 'Fédération Gabonaise de Taekwondo', sigle: 'FEGATAE', sport: 'Taekwondo', type: 'federation',
      president: 'Me Denis Mboumba',
      secretaireGeneral: '',
      adresse: 'Akanda, Libreville',
      telephone: '', email: '', siteWeb: '',
      sourceNote: '',
    },
    {
      id: 'CNOSG', nom: 'Comité National Olympique et Sportif Gabonais', sigle: 'CNOSG', sport: 'Multisports', type: 'federation',
      president: 'Général Sylvain Florient Pangou Mbembo',
      secretaireGeneral: 'Anaclet Mathieu Taty',
      adresse: "Stade de l'Amitié Sino-Gabonaise, Angondjè, BP 447, Libreville",
      telephone: '+241 01 45 32 43', email: 'cnogab@gmail.com', siteWeb: 'https://www.cnog.ga',
      sourceNote: "Élu le 02/05/2026 (10 voix contre 7 à Crésant Pambo). Renommage officiel CNOG → CNOSG en cours au moment de la rédaction. 1er VP : José Walter Foula · 2e VP : Edith Florida Biyoghe · 3e VP : Sylvain Lindzondzo Dynah · Trésorière : Rachel Benzeng Amvane · Représentante des athlètes : Lisa Aline Ngounga.",
    },
  ];

  /* Instances non "structures sportives" au sens de l'app, mais utiles
     comme référence pour les champs "organisateur/tutelle" des fiches
     (ex. Football → LINAFP, Ministère de tutelle). Non injectées comme
     structures par défaut (voir gsc-structures-seed.js). */
  const INSTANCES_REFERENCE = [
    {
      id: 'LINAFP', nom: 'Ligue Nationale de Football Professionnel', sigle: 'LINAFP', type: 'ligue', sport: 'Football',
      president: 'Brice Mbika Ndjambou',
      sourceNote: "Organise le National Foot 1, sous l'égide de la FEGAFOOT.",
    },
    {
      id: 'MINISTERE_SPORTS', nom: 'Ministère de la Jeunesse, des Sports, du Rayonnement Culturel et des Arts, chargé de la Vie Associative', sigle: 'MJSRCA', type: 'ministere', sport: 'Multisports',
      ministre: 'Paul Ulrich Kessany (Zategwa)',
      sourceNote: 'Ministère de tutelle du mouvement sportif gabonais.',
    },
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
    INSTANCES_REFERENCE,
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
