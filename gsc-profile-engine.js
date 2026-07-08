/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC PROFILE ENGINE — Moteur de fiches dynamiques
 *  Gabon Sport Connect · v2.0 · 2026
 *
 *  Ce fichier remplace les fonctions de rendu de fiches par des versions
 *  adaptées à chaque discipline sportive et chaque rôle d'acteur.
 *
 *  Stratégie : monkey-patch des 3 fonctions ciblées après leur définition
 *  dans index.html, sans modifier l'architecture Firestore ni les fonctions
 *  non liées aux fiches (auth, galerie, QR code, admin, carte, actualités).
 *
 *  Backward-compatible : tous les anciens champs Firestore (`matchsJoues`,
 *  `buts`, `passes`, `cartonsJaunes`, `cartonsRouges`, `arrets`, `pied`, etc.)
 *  restent lus et affichés via les nouvelles fonctions.
 * ══════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
   * 1. DICTIONNAIRE DES SPORTS — Labels des stats par sport × rôle
   * ══════════════════════════════════════════════════════════════════ */

  /**
   * Retourne les champs de statistiques à afficher/éditer pour un sport donné
   * et un rôle d'acteur.
   * Chaque entrée : { key, label, icon, type, default, unit }
   *   - key     : nom du champ Firestore
   *   - label   : texte affiché dans la fiche
   *   - icon    : emoji de l'indicateur
   *   - type    : 'number' | 'text' | 'select'
   *   - default : valeur par défaut pour affichage
   *   - unit    : unité optionnelle ('s', 'm', 'km/h', etc.)
   */
  function getSportStatFields(sport, role, poste) {
    const s = (sport || 'Football').trim();
    const r = role || 'joueur';

    /* ── ARBITRE ── */
    if (r === 'arbitre') {
      const arbBase = [
        { key: 'matchsArbitres', label: 'Matchs arbitrés', icon: '🟨', type: 'number', default: 0 },
        { key: 'saisonsActif',   label: 'Saisons d\'activité', icon: '📅', type: 'number', default: 0 },
        { key: 'trophees',       label: 'Distinctions',   icon: '🏆', type: 'number', default: 0 },
      ];
      if (s === 'Football') return [
        ...arbBase,
        { key: 'cartonsTotaux',  label: 'Cartons distribués', icon: '🃏', type: 'number', default: 0 },
        { key: 'penaltySiffles', label: 'Penaltys sifflés',   icon: '⚽', type: 'number', default: 0 },
      ];
      if (s === 'Basketball' || s === 'Handball') return [
        ...arbBase,
        { key: 'fautes',         label: 'Fautes sifflées',   icon: '🚫', type: 'number', default: 0 },
      ];
      if (s === 'Volleyball') return [
        ...arbBase,
        { key: 'setsDiriges',    label: 'Sets dirigés',      icon: '🏐', type: 'number', default: 0 },
      ];
      if (s === 'Boxe' || s === 'Judo' || s === 'Taekwondo') return [
        ...arbBase,
        { key: 'combatsDiriges', label: 'Combats dirigés',   icon: '🥊', type: 'number', default: 0 },
      ];
      if (s === 'Athlétisme') return [
        ...arbBase,
        { key: 'epreuvesDirigees', label: 'Épreuves dirigées', icon: '🏃', type: 'number', default: 0 },
      ];
      if (s === 'Natation') return [
        ...arbBase,
        { key: 'coursesJugees',  label: 'Courses jugées',    icon: '🏊', type: 'number', default: 0 },
      ];
      return arbBase;
    }

    /* ── ENTRAÎNEUR ── */
    if (r === 'entraineur') {
      const coachBase = [
        { key: 'anneesExperience', label: 'Années d\'expérience', icon: '📅', type: 'number', default: 0 },
        { key: 'clubsEntraines',   label: 'Clubs entraînés',       icon: '🏟️', type: 'number', default: 0 },
        { key: 'titresRemportes',  label: 'Titres remportés',      icon: '🏆', type: 'number', default: 0 },
      ];
      if (s === 'Football') return [
        ...coachBase,
        { key: 'matchsCoaches',    label: 'Matchs dirigés',        icon: '⚽', type: 'number', default: 0 },
        { key: 'victoiresCoach',   label: 'Victoires',             icon: '✅', type: 'number', default: 0 },
      ];
      if (s === 'Basketball') return [
        ...coachBase,
        { key: 'matchsCoaches',    label: 'Matchs dirigés',        icon: '🏀', type: 'number', default: 0 },
        { key: 'victoiresCoach',   label: 'Victoires',             icon: '✅', type: 'number', default: 0 },
      ];
      return [
        ...coachBase,
        { key: 'matchsCoaches',    label: 'Sessions encadrées',    icon: '📋', type: 'number', default: 0 },
      ];
    }

    /* ── INDÉPENDANT / ÉLÈVE / ÉTRANGER ── */
    if (['independant', 'eleve_etudiant', 'sportif_etranger'].includes(r)) {
      return _getAthleteStats(s, poste);
    }

    /* ── JOUEUR / ATHLÈTE (rôle par défaut) ── */
    return _getAthleteStats(s, poste);
  }

  /** Statistiques pour un athlète selon son sport et son poste */
  function _getAthleteStats(sport, poste) {
    const p = (poste || '').toLowerCase();

    switch (sport) {

      case 'Football':
        if (p === 'gardien') return [
          { key: 'matchsJoues',    label: 'Matchs joués',  icon: '🥅', type: 'number', default: 0 },
          { key: 'arrets',         label: 'Arrêts',         icon: '✋', type: 'number', default: 0 },
          { key: 'cleanSheets',    label: 'Clean sheets',   icon: '🧤', type: 'number', default: 0 },
          { key: 'butsEncaissés',  label: 'Buts encaissés', icon: '😓', type: 'number', default: 0 },
          { key: 'pctArrets',      label: '% d\'arrêts',   icon: '📊', type: 'number', default: 0, unit: '%' },
          { key: 'trophees',       label: 'Trophées',       icon: '🏆', type: 'number', default: 0 },
        ];
        return [
          { key: 'matchsJoues',    label: 'Matchs',         icon: '⚽', type: 'number', default: 0 },
          { key: 'buts',           label: 'Buts',           icon: '🥅', type: 'number', default: 0 },
          { key: 'passes',         label: 'Passes déc.',    icon: '🅰️', type: 'number', default: 0 },
          { key: 'cartonsJaunes',  label: 'C. jaunes',     icon: '🟨', type: 'number', default: 0 },
          { key: 'cartonsRouges',  label: 'C. rouges',     icon: '🟥', type: 'number', default: 0 },
          { key: 'trophees',       label: 'Trophées',       icon: '🏆', type: 'number', default: 0 },
        ];

      case 'Basketball':
        return [
          { key: 'matchsJoues',    label: 'Matchs',         icon: '🏀', type: 'number', default: 0 },
          { key: 'buts',           label: 'Points',          icon: '🎯', type: 'number', default: 0 },
          { key: 'passes',         label: 'Passes',          icon: '🅰️', type: 'number', default: 0 },
          { key: 'tacles',         label: 'Rebonds',         icon: '💪', type: 'number', default: 0 },
          { key: 'interceptions',  label: 'Contres',         icon: '🛡️', type: 'number', default: 0 },
          { key: 'trophees',       label: 'Trophées',        icon: '🏆', type: 'number', default: 0 },
        ];

      case 'Handball':
        if (p === 'gardien') return [
          { key: 'matchsJoues',    label: 'Matchs',          icon: '🤾', type: 'number', default: 0 },
          { key: 'arrets',         label: 'Arrêts',          icon: '✋', type: 'number', default: 0 },
          { key: 'pctArrets',      label: '% d\'arrêts',    icon: '📊', type: 'number', default: 0, unit: '%' },
          { key: 'cleanSheets',    label: 'Clean sheets',    icon: '🧤', type: 'number', default: 0 },
          { key: 'trophees',       label: 'Trophées',        icon: '🏆', type: 'number', default: 0 },
        ];
        return [
          { key: 'matchsJoues',    label: 'Matchs',          icon: '🤾', type: 'number', default: 0 },
          { key: 'buts',           label: 'Buts',            icon: '🥅', type: 'number', default: 0 },
          { key: 'passes',         label: 'Passes déc.',     icon: '🅰️', type: 'number', default: 0 },
          { key: 'cartonsJaunes',  label: 'Cartons',         icon: '🟨', type: 'number', default: 0 },
          { key: 'trophees',       label: 'Trophées',        icon: '🏆', type: 'number', default: 0 },
        ];

      case 'Volleyball':
        if (p === 'libéro') return [
          { key: 'matchsJoues',    label: 'Matchs',          icon: '🏐', type: 'number', default: 0 },
          { key: 'tacles',         label: 'Réceptions',      icon: '🛡️', type: 'number', default: 0 },
          { key: 'interceptions',  label: 'Passes en jeu',   icon: '🔄', type: 'number', default: 0 },
          { key: 'trophees',       label: 'Trophées',        icon: '🏆', type: 'number', default: 0 },
        ];
        return [
          { key: 'matchsJoues',    label: 'Matchs',          icon: '🏐', type: 'number', default: 0 },
          { key: 'buts',           label: 'Points inscrits', icon: '🎯', type: 'number', default: 0 },
          { key: 'passes',         label: 'Aces',            icon: '💥', type: 'number', default: 0 },
          { key: 'tacles',         label: 'Blocs',           icon: '✋', type: 'number', default: 0 },
          { key: 'trophees',       label: 'Trophées',        icon: '🏆', type: 'number', default: 0 },
        ];

      case 'Athlétisme':
        return [
          { key: 'matchsJoues',    label: 'Compétitions',    icon: '🏟️', type: 'number', default: 0 },
          { key: 'buts',           label: 'Médailles d\'or', icon: '🥇', type: 'number', default: 0 },
          { key: 'passes',         label: 'Médailles d\'argent', icon: '🥈', type: 'number', default: 0 },
          { key: 'tacles',         label: 'Médailles de bronze', icon: '🥉', type: 'number', default: 0 },
          { key: 'recordPersonnel', label: 'Record perso.',  icon: '⏱️', type: 'text',   default: '—', unit: '' },
          { key: 'trophees',       label: 'Trophées',        icon: '🏆', type: 'number', default: 0 },
        ];

      case 'Natation':
        return [
          { key: 'matchsJoues',    label: 'Compétitions',    icon: '🏊', type: 'number', default: 0 },
          { key: 'buts',           label: 'Médailles d\'or', icon: '🥇', type: 'number', default: 0 },
          { key: 'passes',         label: 'Médailles d\'argent', icon: '🥈', type: 'number', default: 0 },
          { key: 'tacles',         label: 'Médailles de bronze', icon: '🥉', type: 'number', default: 0 },
          { key: 'recordPersonnel', label: 'Meilleur temps', icon: '⏱️', type: 'text',   default: '—', unit: 's' },
          { key: 'trophees',       label: 'Trophées',        icon: '🏆', type: 'number', default: 0 },
        ];

      case 'Boxe':
        return [
          { key: 'matchsJoues',    label: 'Combats',         icon: '🥊', type: 'number', default: 0 },
          { key: 'buts',           label: 'Victoires',       icon: '✅', type: 'number', default: 0 },
          { key: 'passes',         label: 'K.-O.',           icon: '💥', type: 'number', default: 0 },
          { key: 'tacles',         label: 'Défaites',        icon: '❌', type: 'number', default: 0 },
          { key: 'interceptions',  label: 'Nuls',            icon: '⚖️', type: 'number', default: 0 },
          { key: 'trophees',       label: 'Titres',          icon: '🏆', type: 'number', default: 0 },
        ];

      case 'Judo':
      case 'Taekwondo':
      case 'Lutte': {
        const icon = sport === 'Judo' ? '🥋' : sport === 'Taekwondo' ? '🦵' : '🤼';
        return [
          { key: 'matchsJoues',    label: 'Combats',         icon,        type: 'number', default: 0 },
          { key: 'buts',           label: 'Victoires',       icon: '✅', type: 'number', default: 0 },
          { key: 'passes',         label: 'Ippons (Judo)',   icon: '⭐', type: 'number', default: 0 },
          { key: 'tacles',         label: 'Défaites',        icon: '❌', type: 'number', default: 0 },
          { key: 'trophees',       label: 'Titres & médailles', icon: '🏆', type: 'number', default: 0 },
        ];
      }

      case 'Tennis':
        return [
          { key: 'matchsJoues',    label: 'Matchs joués',    icon: '🎾', type: 'number', default: 0 },
          { key: 'buts',           label: 'Victoires',       icon: '✅', type: 'number', default: 0 },
          { key: 'passes',         label: 'Tournois gagnés', icon: '🏆', type: 'number', default: 0 },
          { key: 'tacles',         label: 'Aces',            icon: '💥', type: 'number', default: 0 },
          { key: 'classementATP',  label: 'Classement',     icon: '📊', type: 'text',   default: '—', unit: '' },
          { key: 'trophees',       label: 'Titres',          icon: '🥇', type: 'number', default: 0 },
        ];

      case 'Rugby':
        return [
          { key: 'matchsJoues',    label: 'Matchs',          icon: '🏉', type: 'number', default: 0 },
          { key: 'buts',           label: 'Essais',          icon: '🎯', type: 'number', default: 0 },
          { key: 'passes',         label: 'Transformations', icon: '⚡', type: 'number', default: 0 },
          { key: 'tacles',         label: 'Plaquages',       icon: '💪', type: 'number', default: 0 },
          { key: 'trophees',       label: 'Trophées',        icon: '🏆', type: 'number', default: 0 },
        ];

      case 'Cyclisme':
        return [
          { key: 'matchsJoues',    label: 'Courses',         icon: '🚴', type: 'number', default: 0 },
          { key: 'buts',           label: 'Victoires',       icon: '✅', type: 'number', default: 0 },
          { key: 'passes',         label: 'Podiums',         icon: '🥈', type: 'number', default: 0 },
          { key: 'recordPersonnel', label: 'Meilleure perf.',icon: '⏱️', type: 'text',   default: '—', unit: '' },
          { key: 'trophees',       label: 'Titres',          icon: '🏆', type: 'number', default: 0 },
        ];

      default:
        /* Fallback générique multisport */
        return [
          { key: 'matchsJoues',    label: 'Participations',  icon: '🏅', type: 'number', default: 0 },
          { key: 'buts',           label: 'Points / Buts',  icon: '🎯', type: 'number', default: 0 },
          { key: 'trophees',       label: 'Trophées',        icon: '🏆', type: 'number', default: 0 },
        ];
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. CHAMPS DU PROFIL PHYSIQUE — Labels dynamiques par sport
   * ══════════════════════════════════════════════════════════════════ */

  /**
   * Retourne les champs du profil physique pertinents pour un sport/rôle.
   * Format : [{ key, label, icon }]
   */
  function getPhysicalFields(sport, role) {
    const s = sport || 'Football';
    const r = role || 'joueur';

    /* Champs communs à tous */
    const common = [
      { key: 'taille',        label: 'Taille',   icon: '📏', unit: 'cm' },
      { key: 'poids',         label: 'Poids',    icon: '⚖️', unit: 'kg' },
      { key: 'dateNaissance', label: 'Âge',      icon: '🎂', unit: 'ans', derived: true },
    ];

    /* Champs sportifs spécifiques */
    if (['arbitre', 'entraineur'].includes(r)) return common;

    switch (s) {
      case 'Football':
      case 'Basketball':
      case 'Handball':
      case 'Rugby':
      case 'Volleyball':
        return [...common, { key: 'pied', label: 'Pied fort', icon: '🦶', unit: '' }];

      case 'Boxe':
      case 'Judo':
      case 'Taekwondo':
      case 'Lutte':
        return [...common, { key: 'categoriesPoids', label: 'Catégorie', icon: '⚖️', unit: '' }];

      case 'Athlétisme':
        return [...common, { key: 'envergure', label: 'Envergure', icon: '↔️', unit: 'cm' }];

      case 'Natation':
        return [...common, { key: 'envergure', label: 'Envergure', icon: '↔️', unit: 'cm' }];

      case 'Tennis':
        return [...common, { key: 'main', label: 'Main', icon: '🤝', unit: '' }];

      case 'Cyclisme':
        return common;

      default:
        return [...common, { key: 'pied', label: 'Pied / Main fort(e)', icon: '🦶', unit: '' }];
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. HELPER — Lit une valeur Firestore avec fallback
   * ══════════════════════════════════════════════════════════════════ */

  function readVal(profile, field) {
    if (field.derived && field.key === 'dateNaissance') {
      if (!profile.dateNaissance) return '—';
      const age = new Date().getFullYear() - new Date(profile.dateNaissance).getFullYear();
      return isNaN(age) ? '—' : age + ' ans';
    }
    const v = profile[field.key];
    if (v === undefined || v === null || v === '') return field.default !== undefined ? field.default : '—';
    return field.unit ? v + ' ' + field.unit : v;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. NOUVELLE FONCTION renderSportStats — Vue "Mon Profil"
   * ══════════════════════════════════════════════════════════════════ */

  function renderSportStats_v2(p) {
    const container = document.getElementById('sport-stats-display');
    if (!container) return;

    const fields = getSportStatFields(p.sport, p.role, p.poste);

    container.innerHTML = fields.map(f => {
      let val = p[f.key];
      if (val === undefined || val === null || val === '') val = f.default !== undefined ? f.default : '—';
      if (f.unit) val = val + ' ' + f.unit;
      return `<div class="sport-stat-item">
        <div class="sport-stat-icon">${f.icon}</div>
        <div>
          <div class="sport-stat-val">${val}</div>
          <div class="sport-stat-lbl">${f.label}</div>
        </div>
      </div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. NOUVELLE SECTION renderProfile physique — labels dynamiques
   * ══════════════════════════════════════════════════════════════════ */

  function updatePhysicalCardLabels(p) {
    const fields = getPhysicalFields(p.sport, p.role);

    /* Mise à jour des valeurs dans les cartes fixes */
    const tailleEl = document.getElementById('prof-taille');
    const poidsEl  = document.getElementById('prof-poids');
    const ageEl    = document.getElementById('prof-age');
    const piedEl   = document.getElementById('prof-pied');

    if (tailleEl) tailleEl.textContent = p.taille || '—';
    if (poidsEl)  poidsEl.textContent  = p.poids || '—';
    if (ageEl) {
      if (p.dateNaissance) {
        const age = new Date().getFullYear() - new Date(p.dateNaissance).getFullYear();
        ageEl.textContent = isNaN(age) ? '—' : age;
      } else {
        ageEl.textContent = '—';
      }
    }

    /* Champ 4e colonne : adapté au sport */
    if (piedEl) {
      const sport = p.sport || 'Football';
      if (['Football', 'Basketball', 'Handball', 'Rugby', 'Volleyball'].includes(sport)) {
        // Pied fort (déjà dans Firestore comme `pied`)
        piedEl.textContent = p.pied || '—';
        const lbl = piedEl.closest('.phys-card')?.querySelector('.phys-lbl');
        if (lbl) lbl.textContent = 'Pied fort';
      } else if (['Boxe', 'Judo', 'Taekwondo', 'Lutte'].includes(sport)) {
        // Catégorie de poids
        piedEl.textContent = p.categoriesPoids || p.poste || '—';
        const lbl = piedEl.closest('.phys-card')?.querySelector('.phys-lbl');
        if (lbl) lbl.textContent = 'Catégorie';
      } else if (['Tennis'].includes(sport)) {
        piedEl.textContent = p.main || '—';
        const lbl = piedEl.closest('.phys-card')?.querySelector('.phys-lbl');
        if (lbl) lbl.textContent = 'Main dominante';
      } else if (['Athlétisme', 'Natation'].includes(sport)) {
        piedEl.textContent = p.envergure ? p.envergure + ' cm' : '—';
        const lbl = piedEl.closest('.phys-card')?.querySelector('.phys-lbl');
        if (lbl) lbl.textContent = 'Envergure';
      } else {
        piedEl.textContent = p.pied || p.main || '—';
        const lbl = piedEl.closest('.phys-card')?.querySelector('.phys-lbl');
        if (lbl) lbl.textContent = 'Latéralité';
      }
    }

    /* Labels des colonnes Taille/Poids (icônes mise à jour) */
    const physcards = document.querySelectorAll('#prof-physique-card .phys-card');
    if (physcards.length >= 2) {
      // Colonne Taille
      const tailleLabel = physcards[0]?.querySelector('.phys-lbl');
      if (tailleLabel) tailleLabel.textContent = 'Taille (cm)';
      // Colonne Poids
      const poidsLabel = physcards[1]?.querySelector('.phys-lbl');
      if (poidsLabel) poidsLabel.textContent = 'Poids (kg)';
      // Colonne Âge
      const ageLabel = physcards[2]?.querySelector('.phys-lbl');
      if (ageLabel) ageLabel.textContent = 'Âge';
    }

    /* Titre de la section selon rôle */
    const cardTitle = document.querySelector('#prof-physique-card .card-title');
    if (cardTitle) {
      const icons = {
        arbitre: '🟨 Profil de l\'arbitre',
        entraineur: '📋 Profil de l\'entraîneur',
        independant: '🏃 Profil physique',
        eleve_etudiant: '🎓 Profil sportif',
        sportif_etranger: '🌍 Profil physique',
        handisport: '🦾 Profil physique adapté',
      };
      cardTitle.textContent = icons[p.role] || '💪 Profil physique';
    }

    /* Titre de la section statistiques */
    const statTitle = document.querySelector('#prof-stats-card .card-title');
    if (statTitle) {
      const statTitles = {
        Football:    '⚽ Statistiques football',
        Basketball:  '🏀 Statistiques basketball',
        Handball:    '🤾 Statistiques handball',
        Volleyball:  '🏐 Statistiques volleyball',
        Athlétisme:  '🏃 Palmarès & performances',
        Natation:    '🏊 Palmarès & chrono',
        Boxe:        '🥊 Bilan de combats',
        Judo:        '🥋 Palmarès & combats',
        Taekwondo:   '🦵 Palmarès & combats',
        Tennis:      '🎾 Statistiques tennis',
        Rugby:       '🏉 Statistiques rugby',
        Cyclisme:    '🚴 Palmarès cyclisme',
        Lutte:       '🤼 Bilan de combats',
      };
      const sport = p.sport || 'Football';
      const roleLabels = {
        arbitre: '🟨 Bilan d\'arbitrage',
        entraineur: '📋 Bilan d\'entraîneur',
      };
      statTitle.textContent = roleLabels[p.role] || statTitles[sport] || '📊 Statistiques sportives';
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 6. SECTION STATS dans buildEditForm — remplace la section joueur
   * ══════════════════════════════════════════════════════════════════ */

  function buildStatsEditSection(p) {
    const fields = getSportStatFields(p.sport, p.role, p.poste)
      .filter(f => f.type === 'number' || f.type === 'text'); // tout sauf select

    if (!fields.length) return '';

    const sport = p.sport || 'Football';
    const sportIcons = {
      Football:'⚽', Basketball:'🏀', Handball:'🤾', Volleyball:'🏐',
      Athlétisme:'🏃', Natation:'🏊', Boxe:'🥊', Judo:'🥋',
      Tennis:'🎾', Rugby:'🏉', Cyclisme:'🚴', Taekwondo:'🦵', Lutte:'🤼',
    };
    const roleLabels = {
      arbitre: '🟨 Bilan d\'arbitrage',
      entraineur: '📋 Bilan d\'entraîneur',
    };
    const sectionTitle = roleLabels[p.role] || (sportIcons[sport] || '📊') + ' Statistiques ' + sport;

    /* Rendu en grille 2 colonnes */
    const rows = [];
    for (let i = 0; i < fields.length; i += 2) {
      const f1 = fields[i];
      const f2 = fields[i + 1];
      let row = `<div style="display:grid;grid-template-columns:${f2 ? '1fr 1fr' : '1fr'};gap:12px;">`;
      row += buildStatInput(f1, p);
      if (f2) row += buildStatInput(f2, p);
      row += `</div>`;
      rows.push(row);
    }

    return `
      <div class="section-divider green">${sectionTitle}</div>
      ${rows.join('\n')}
    `;
  }

  function buildStatInput(f, p) {
    const val = p[f.key] !== undefined ? p[f.key] : (f.default !== undefined ? f.default : '');
    const inputId = 'edit-stat-' + f.key;
    const inputType = f.type === 'number' ? 'number' : 'text';
    const extraAttr = f.type === 'number' ? ' min="0"' : '';
    return `<div class="form-group">
      <label>${f.icon} ${f.label}${f.unit ? ' (' + f.unit + ')' : ''}</label>
      <input type="${inputType}" id="${inputId}" value="${val}" placeholder="${f.default || ''}"${extraAttr}>
    </div>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 7. COLLECTE des stats depuis le formulaire (remplace saveProfile stats)
   * ══════════════════════════════════════════════════════════════════ */

  function collectStatsFromForm(p) {
    const fields = getSportStatFields(p.sport, p.role, p.poste);
    const updates = {};
    fields.forEach(f => {
      const el = document.getElementById('edit-stat-' + f.key);
      if (!el) return;
      if (f.type === 'number') {
        updates[f.key] = parseInt(el.value) || 0;
      } else {
        updates[f.key] = el.value.trim() || '';
      }
    });
    return updates;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 8. SECTION openActorDetail — stats dans la fiche modale publique
   * ══════════════════════════════════════════════════════════════════ */

  function buildActorDetailStats(a) {
    const fields = getSportStatFields(a.sport, a.role, a.poste);
    if (!fields.length) return '';

    const sport = a.sport || 'Football';
    const roleLabels = {
      arbitre: '🟨 Bilan d\'arbitrage',
      entraineur: '📋 Bilan d\'entraîneur',
    };
    const sportIcons = {
      Football:'⚽', Basketball:'🏀', Handball:'🤾', Volleyball:'🏐',
      Athlétisme:'🏃', Natation:'🏊', Boxe:'🥊', Judo:'🥋',
      Tennis:'🎾', Rugby:'🏉', Cyclisme:'🚴', Taekwondo:'🦵', Lutte:'🤼',
    };
    const sectionTitle = roleLabels[a.role] || (sportIcons[sport] || '📊') + ' Statistiques ' + sport;

    /* Filtrer les champs vides (0 ou '—') pour une fiche publique propre */
    const nonEmpty = fields.filter(f => {
      const v = a[f.key];
      return v !== undefined && v !== null && v !== '' && v !== 0 && v !== '—';
    });

    /* Si tout est vide, afficher quand même les 3 premiers champs */
    const displayFields = nonEmpty.length ? nonEmpty : fields.slice(0, 3);

    let html = `<div class="adm-section"><div class="adm-section-title">${sectionTitle}</div>`;
    html += `<div class="adm-stats-grid">`;
    displayFields.forEach(f => {
      let val = a[f.key];
      if (val === undefined || val === null || val === '') val = f.default !== undefined ? f.default : '—';
      if (f.unit && val !== '—') val = val + ' ' + f.unit;
      html += `<div class="adm-stat">
        <div class="adm-stat-val">${val}</div>
        <div class="adm-stat-lbl">${f.icon} ${f.label}</div>
      </div>`;
    });
    html += `</div></div>`;
    return html;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 9. SECTION physique dans openActorDetail — riche et adaptée
   * ══════════════════════════════════════════════════════════════════ */

  function buildActorDetailPhysical(a, isVisitor) {
    if (isVisitor) return '';

    const hasPhysical = a.taille || a.poids || a.dateNaissance;
    if (!hasPhysical) return '';

    const sport = a.sport || 'Football';
    let html = `<div class="adm-section"><div class="adm-section-title">💪 Profil physique</div>`;
    html += `<div class="adm-stats-grid">`;

    if (a.taille) html += `<div class="adm-stat"><div class="adm-stat-val">${a.taille}</div><div class="adm-stat-lbl">📏 Taille cm</div></div>`;
    if (a.poids)  html += `<div class="adm-stat"><div class="adm-stat-val">${a.poids}</div><div class="adm-stat-lbl">⚖️ Poids kg</div></div>`;

    if (a.dateNaissance) {
      const age = new Date().getFullYear() - new Date(a.dateNaissance).getFullYear();
      if (!isNaN(age)) html += `<div class="adm-stat"><div class="adm-stat-val">${age}</div><div class="adm-stat-lbl">🎂 Âge</div></div>`;
    }

    /* Champ spécifique au sport */
    if (['Football', 'Basketball', 'Handball', 'Rugby', 'Volleyball'].includes(sport) && a.pied) {
      html += `<div class="adm-stat"><div class="adm-stat-val">${a.pied}</div><div class="adm-stat-lbl">🦶 Pied fort</div></div>`;
    } else if (['Tennis'].includes(sport) && a.main) {
      html += `<div class="adm-stat"><div class="adm-stat-val">${a.main}</div><div class="adm-stat-lbl">🤝 Main</div></div>`;
    } else if (['Boxe', 'Judo', 'Taekwondo', 'Lutte'].includes(sport) && (a.categoriesPoids || a.poste)) {
      html += `<div class="adm-stat"><div class="adm-stat-val">${a.categoriesPoids || a.poste}</div><div class="adm-stat-lbl">⚖️ Catégorie</div></div>`;
    } else if (['Athlétisme', 'Natation', 'Cyclisme'].includes(sport) && a.envergure) {
      html += `<div class="adm-stat"><div class="adm-stat-val">${a.envergure} cm</div><div class="adm-stat-lbl">↔️ Envergure</div></div>`;
    }

    html += `</div></div>`;
    return html;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 10. CHAMPS supplémentaires dans buildEditForm par rôle
   * ══════════════════════════════════════════════════════════════════ */

  /**
   * Retourne des champs de formulaire supplémentaires spécifiques au rôle
   * (diplômes, certifications, niveau arbitrage, etc.)
   */
  function buildRoleSpecificFields(p) {
    let h = '';

    if (p.role === 'arbitre') {
      h += `<div class="section-divider blue">🟨 Informations d'arbitrage</div>`;
      h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Niveau d'arbitrage</label>
          <select id="edit-niveau-arbitrage">
            <option value="">—</option>
            ${['Régional', 'National', 'International', 'FIFA / CAF', 'FIBA', 'Certificat'].map(v =>
              `<option${p.niveauArbitrage === v ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Numéro de badge / licence</label>
          <input type="text" id="edit-badge-arbitre" value="${p.badgeArbitre || ''}" placeholder="ARB-2026-XXXX">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Date d'accréditation</label>
          <input type="date" id="edit-accreditation-date" value="${p.accreditationDate || ''}">
        </div>
        <div class="form-group"><label>Expire le</label>
          <input type="date" id="edit-accreditation-exp" value="${p.accreditationExpire || ''}">
        </div>
      </div>`;
    }

    if (p.role === 'entraineur') {
      h += `<div class="section-divider blue">📋 Certifications & formation</div>`;
      h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Diplôme le plus élevé</label>
          <select id="edit-diplome-coach">
            <option value="">—</option>
            ${['CAF Licence A', 'CAF Licence B', 'CAF Licence C', 'CAF Licence D (Basic)', 'UEFA Licence Pro', 'FIBA Level 1', 'FIBA Level 2', 'FIBA Level 3', 'Brevet d\'État', 'Formation fédérale', 'Sans diplôme officiel'].map(v =>
              `<option${p.diplomeCoach === v ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Années d'expérience</label>
          <input type="number" id="edit-stat-anneesExperience" value="${p.anneesExperience || 0}" min="0">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Clubs entraînés</label>
          <input type="number" id="edit-stat-clubsEntraines" value="${p.clubsEntraines || 0}" min="0">
        </div>
        <div class="form-group"><label>Titres remportés</label>
          <input type="number" id="edit-stat-titresRemportes" value="${p.titresRemportes || 0}" min="0">
        </div>
      </div>`;
    }

    if (p.role === 'eleve_etudiant') {
      // Liste des établissements reconnus (Université Omar Bongo, USTM, USS, etc.)
      // Voir la constante ETABLISSEMENTS_GA, déclarée globalement dans index.html.
      const etabList = (typeof ETABLISSEMENTS_GA !== 'undefined') ? ETABLISSEMENTS_GA : [];
      const etabGroups = {};
      etabList.forEach(e => { (etabGroups[e.type] = etabGroups[e.type] || []).push(e); });
      const etabOrder = ['Université', 'Lycée', 'Collège', 'International'];
      const currentEtab = p.etablissement || '';
      const currentKnown = etabList.some(e => e.nom === currentEtab);
      let etabOptionsHtml = '<option value="">Sélectionner…</option>';
      etabOrder.forEach(type => {
        if (!etabGroups[type]) return;
        etabOptionsHtml += `<optgroup label="${type === 'Université' ? '🎓 Université' : type}">`;
        etabOptionsHtml += etabGroups[type].map(e =>
          `<option value="${e.nom}"${currentEtab === e.nom ? ' selected' : ''}>${e.nom} — ${e.ville}</option>`).join('');
        etabOptionsHtml += '</optgroup>';
      });
      etabOptionsHtml += `<option value="__autre__"${currentEtab && !currentKnown ? ' selected' : ''}>➕ Établissement non listé</option>`;

      h += `<div class="section-divider blue">🎓 Scolarité</div>`;
      h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Niveau scolaire</label>
          <select id="edit-niveau-scolaire">
            <option value="">—</option>
            ${['6ème','5ème','4ème','3ème','2nde','1ère','Terminale','Licence 1','Licence 2','Licence 3','Master 1','Master 2','Doctorat'].map(v =>
              `<option${p.niveauScolaire === v ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Université / Établissement</label>
          <select id="edit-etablissement" onchange="document.getElementById('edit-etablissement-autre').style.display=this.value==='__autre__'?'block':'none';">
            ${etabOptionsHtml}
          </select>
          <input type="text" id="edit-etablissement-autre" value="${!currentKnown ? currentEtab : ''}" placeholder="Nom de l'établissement" style="margin-top:8px;${currentEtab && !currentKnown ? '' : 'display:none;'}">
        </div>
      </div>
      <div class="form-group"><label>Filière / Spécialité</label>
        <input type="text" id="edit-filiere" value="${p.filiere || ''}" placeholder="Sciences, Lettres, Droit…">
      </div>`;
    }

    if (p.role === 'sportif_etranger') {
      h += `<div class="section-divider blue">🌍 Statut international</div>`;
      h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Statut professionnel</label>
          <select id="edit-statut-pro">
            <option value="">—</option>
            ${['Professionnel sous contrat', 'Amateur / Invitation', 'En essai', 'Expatrié indépendant'].map(v =>
              `<option${p.statutPro === v ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Club / Employeur</label>
          <input type="text" id="edit-employeur-etranger" value="${p.employeur || ''}" placeholder="Nom du club…">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Type de document</label>
          <select id="edit-document-type">
            <option value="">—</option>
            ${['Carte de travail sportif', 'Visa sportif', 'Permis de séjour', 'Passeport CEDEAO'].map(v =>
              `<option${p.documentType === v ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>N° de document</label>
          <input type="text" id="edit-document-num" value="${p.documentNumero || ''}" placeholder="Numéro…">
        </div>
      </div>`;
    }

    return h;
  }

  /* Collecte les champs spécifiques au rôle lors du save */
  function collectRoleSpecificFields(p) {
    const updates = {};

    if (p.role === 'arbitre') {
      const nv = document.getElementById('edit-niveau-arbitrage');
      const ba = document.getElementById('edit-badge-arbitre');
      const ad = document.getElementById('edit-accreditation-date');
      const ae = document.getElementById('edit-accreditation-exp');
      if (nv) updates.niveauArbitrage = nv.value || '';
      if (ba) updates.badgeArbitre = ba.value.trim() || '';
      if (ad) updates.accreditationDate = ad.value || '';
      if (ae) updates.accreditationExpire = ae.value || '';
    }

    if (p.role === 'entraineur') {
      const dc = document.getElementById('edit-diplome-coach');
      if (dc) updates.diplomeCoach = dc.value || '';
      // Les stats (anneesExperience, clubsEntraines, titresRemportes) sont collectées via collectStatsFromForm
    }

    if (p.role === 'eleve_etudiant') {
      const ns = document.getElementById('edit-niveau-scolaire');
      const et = document.getElementById('edit-etablissement');
      const etAutre = document.getElementById('edit-etablissement-autre');
      const fi = document.getElementById('edit-filiere');
      if (ns) updates.niveauScolaire = ns.value || '';
      if (et) updates.etablissement = (et.value === '__autre__' ? (etAutre?.value.trim() || '') : et.value) || '';
      if (fi) updates.filiere = fi.value.trim() || '';
    }

    if (p.role === 'sportif_etranger') {
      const sp = document.getElementById('edit-statut-pro');
      const ee = document.getElementById('edit-employeur-etranger');
      const dt = document.getElementById('edit-document-type');
      const dn = document.getElementById('edit-document-num');
      if (sp) updates.statutPro = sp.value || '';
      if (ee) updates.employeur = ee.value.trim() || '';
      if (dt) updates.documentType = dt.value || '';
      if (dn) updates.documentNumero = dn.value.trim() || '';
    }

    return updates;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 11. SECTION ENTRAÎNEUR dans openActorDetail
   * ══════════════════════════════════════════════════════════════════ */

  function buildCoachDetailSection(a) {
    if (a.role !== 'entraineur') return '';
    if (!a.diplomeCoach && !a.niveauArbitrage) return '';
    let html = `<div class="adm-section"><div class="adm-section-title">📋 Formation & certifications</div>`;
    if (a.diplomeCoach) html += `<div class="adm-info-row"><span class="adm-info-label">Diplôme</span><span class="adm-info-val">🎓 ${a.diplomeCoach}</span></div>`;
    html += `</div>`;
    return html;
  }

  function buildArbiterDetailSection(a) {
    if (a.role !== 'arbitre') return '';
    let html = `<div class="adm-section"><div class="adm-section-title">🟨 Profil d'arbitrage</div>`;
    if (a.niveauArbitrage) html += `<div class="adm-info-row"><span class="adm-info-label">Niveau</span><span class="adm-info-val">📊 ${a.niveauArbitrage}</span></div>`;
    if (a.badgeArbitre)    html += `<div class="adm-info-row"><span class="adm-info-label">Badge / Licence</span><span class="adm-info-val">🪪 ${a.badgeArbitre}</span></div>`;
    if (a.accreditationDate) html += `<div class="adm-info-row"><span class="adm-info-label">Accréditation</span><span class="adm-info-val">${a.accreditationDate}${a.accreditationExpire ? ' → ' + a.accreditationExpire : ''}</span></div>`;
    if (a.licenceNumero)   html += `<div class="adm-info-row"><span class="adm-info-label">Licence officielle</span><span class="adm-info-val">${a.licenceNumero}</span></div>`;
    html += `</div>`;
    return html;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 12. MONKEY-PATCH — Remplacement des fonctions existantes
   *     Exécuté après DOMContentLoaded et firebase-ready
   * ══════════════════════════════════════════════════════════════════ */

  function applyPatches() {

    /* ─── Patch renderSportStats ─────────────────────────────────── */
    if (typeof window.renderSportStats === 'function') {
      const _orig = window.renderSportStats;
      window.renderSportStats = function (p) {
        renderSportStats_v2(p);
      };
    } else {
      window.renderSportStats = renderSportStats_v2;
    }

    /* ─── Patch renderProfile : ajout des labels dynamiques ───────── */
    if (typeof window.renderProfile === 'function') {
      const _origRenderProfile = window.renderProfile;
      window.renderProfile = function () {
        _origRenderProfile.call(this);
        // Après le rendu original, on met à jour les labels physiques
        if (window.userProfile) {
          updatePhysicalCardLabels(window.userProfile);
          // Afficher la section stats pour tous les rôles personnels (pas seulement joueur)
          const statsCard = document.getElementById('prof-stats-card');
          if (statsCard && window.userProfile) {
            const isPersonnel = ['joueur', 'arbitre', 'entraineur', 'independant',
              'eleve_etudiant', 'ecole_universite', 'sportif_etranger', 'handisport'].includes(window.userProfile.role);
            statsCard.style.display = isPersonnel ? '' : 'none';
            if (isPersonnel) renderSportStats_v2(window.userProfile);
          }
        }
      };
    }

    /* ─── Patch buildEditForm : wrapper qui injecte les nouvelles sections ── */
    if (typeof window.buildEditForm === 'function') {
      const _origBuildEditForm = window.buildEditForm;
      window.buildEditForm = function (p) {
        // Appel de la fonction originale
        _origBuildEditForm.call(this, p);

        const isPersonnel = ['joueur', 'arbitre', 'entraineur', 'independant',
          'eleve_etudiant', 'ecole_universite', 'sportif_etranger', 'handisport'].includes(p.role);
        if (!isPersonnel) return;

        const target = document.getElementById('edit-form-body');
        if (!target) return;
        if (target.querySelector('#gsc-engine-stats-injected')) return;

        // Marqueur anti-doublon
        const marker = document.createElement('div');
        marker.id = 'gsc-engine-stats-injected';
        marker.style.display = 'none';
        target.appendChild(marker);

        // Masquer l'ancienne section stats football (si présente)
        const allDividers = target.querySelectorAll('.section-divider');
        allDividers.forEach(d => {
          const t = d.textContent || '';
          // La section "📊 Statistiques" de l'ancien code football uniquement
          if (t.includes('Statistiques') && !t.includes('Bilan') && !t.includes(p.sport || '')) {
            let el = d;
            const toHide = [el];
            while (el.nextElementSibling) {
              el = el.nextElementSibling;
              if (el.classList && el.classList.contains('section-divider')) break;
              if (el.classList && el.classList.contains('btn-save')) break;
              if (el.id && el.id.includes('gsc-engine')) break;
              toHide.push(el);
            }
            toHide.forEach(e => { if (!e.id?.includes('gsc-engine')) e.style.display = 'none'; });
          }
        });

        // Injecter nouvelles sections avant le bouton Enregistrer
        const newStatsHtml = buildStatsEditSection(p);
        const roleHtml = buildRoleSpecificFields(p);
        const saveBtn = target.querySelector('.btn-save');
        if (saveBtn && (newStatsHtml || roleHtml)) {
          saveBtn.insertAdjacentHTML('beforebegin', newStatsHtml + roleHtml);
        }
      };
    }

    /* ─── Patch saveProfile : collecte des nouvelles stats ────────── */
    if (typeof window.saveProfile === 'function') {
      const _origSaveProfile = window.saveProfile;
      window.saveProfile = async function () {
        // Collecte les nouvelles stats AVANT d'appeler saveProfile original
        // puis on les injecte dans Firestore via un updateDoc supplémentaire
        const p = window.userProfile;
        if (p) {
          const statUpdates = collectStatsFromForm(p);
          const roleUpdates = collectRoleSpecificFields(p);
          const allExtra = { ...statUpdates, ...roleUpdates };

          // Injecter dans les inputs cachés ou directement après le save
          // Stratégie : on ajoute les updates APRÈS que saveProfile a écrit,
          // via un second updateDoc différé.
          const originalSave = _origSaveProfile.bind(this);
          await originalSave();

          // Maintenant on sauve les champs supplémentaires si Firebase est dispo
          if (window.db && window.currentUser && Object.keys(allExtra).length &&
              typeof window.updateDoc === 'function' && typeof window.doc === 'function') {
            try {
              await window.updateDoc(
                window.doc(window.db, 'users', window.currentUser.uid),
                { ...allExtra, updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date() }
              );
              // Mettre à jour le profil en mémoire
              Object.assign(window.userProfile, allExtra);
            } catch (e) {
              console.warn('[GSC Profile Engine] saveProfile extra fields:', e);
            }
          }
        } else {
          await _origSaveProfile.call(this);
        }
      };
    }

    /* ─── Patch openActorDetail : stats dans la fiche publique ────── */
    if (typeof window.openActorDetail === 'function') {
      const _origOpenActorDetail = window.openActorDetail;
      window.openActorDetail = function (uid) {
        _origOpenActorDetail.call(this, uid);
        // Après l'ouverture, on enrichit la section stats dans adm-body
        setTimeout(() => {
          _enrichActorDetailModal(uid);
        }, 30);
      };
    }

    console.log('[GSC Profile Engine v2] Patches appliqués ✓');
  }

  /* ──────────────────────────────────────────────────────────────────
   * Enrichissement de la modale actor-detail après son rendu original
   * ────────────────────────────────────────────────────────────────── */
  function _enrichActorDetailModal(uid) {
    const body = document.getElementById('adm-body');
    if (!body) return;

    const allActors = window.allActors || [];
    const allAdminUsers = window.allAdminUsers || [];
    const a = allActors.find(x => (x.uid || x.id) === uid) ||
              allAdminUsers.find(x => (x.uid || x.id) === uid);
    if (!a) return;

    const isPersonnel = ['joueur', 'arbitre', 'entraineur', 'independant',
      'eleve_etudiant', 'ecole_universite', 'sportif_etranger', 'handisport'].includes(a.role);
    if (!isPersonnel) return;

    /* Remplacer la section stats existante (ancienne) par la nouvelle */
    const oldStatSections = body.querySelectorAll('.adm-section');
    let statsSection = null;
    let physSection = null;

    oldStatSections.forEach(s => {
      const title = s.querySelector('.adm-section-title');
      if (!title) return;
      const t = title.textContent || '';
      if (t.includes('Statistiques') || t.includes('Bilan')) statsSection = s;
      if (t.includes('Profil physique') || t.includes('physique')) physSection = s;
    });

    /* Nouvelle section stats */
    const newStatsHtml = buildActorDetailStats(a);

    if (statsSection && newStatsHtml) {
      statsSection.outerHTML = newStatsHtml;
    } else if (newStatsHtml) {
      /* Insérer après les infos générales (1ère section) */
      const firstSection = body.querySelector('.adm-section');
      if (firstSection) {
        firstSection.insertAdjacentHTML('afterend', newStatsHtml);
      }
    }

    /* Nouvelle section physique enrichie */
    const newPhysHtml = buildActorDetailPhysical(a, window.isVisitor);
    if (physSection && newPhysHtml) {
      physSection.outerHTML = newPhysHtml;
    }

    /* Insérer sections rôle spécifique (coach, arbitre) */
    const coachHtml = buildCoachDetailSection(a);
    const arbiterHtml = buildArbiterDetailSection(a);
    if (coachHtml || arbiterHtml) {
      const bio = Array.from(body.querySelectorAll('.adm-section')).find(s => {
        const t = s.querySelector('.adm-section-title')?.textContent || '';
        return t.includes('Biographie') || t.includes('bio');
      });
      if (bio) {
        if (coachHtml) bio.insertAdjacentHTML('beforebegin', coachHtml);
        if (arbiterHtml) bio.insertAdjacentHTML('beforebegin', arbiterHtml);
      } else {
        body.insertAdjacentHTML('beforeend', coachHtml + arbiterHtml);
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 13. PATCH buildEditForm — Injection de la section stats dynamique
   *     et des champs rôle-spécifiques via remplacement du HTML généré
   * ══════════════════════════════════════════════════════════════════ */

  /**
   * On observe les mutations sur edit-form-body pour injecter nos sections
   * après que buildEditForm (fonction locale non patchable) ait écrit son HTML.
   */
  function watchEditFormBody() {
    const target = document.getElementById('edit-form-body');
    if (!target) return;

    const observer = new MutationObserver(() => {
      const p = window.userProfile;
      if (!p) return;

      const isPersonnel = ['joueur', 'arbitre', 'entraineur', 'independant',
        'eleve_etudiant', 'ecole_universite', 'sportif_etranger', 'handisport'].includes(p.role);
      if (!isPersonnel) return;

      /* Vérifier si on a déjà injecté nos sections (éviter les boucles) */
      if (target.querySelector('#gsc-engine-stats-injected')) return;

      /* Marqueur pour éviter les doubles injections */
      const marker = document.createElement('div');
      marker.id = 'gsc-engine-stats-injected';
      marker.style.display = 'none';
      target.appendChild(marker);

      /* Supprimer l'ancienne section stats football fixe si elle existe */
      const oldStatsDividers = target.querySelectorAll('.section-divider');
      let oldStatsStart = null;
      oldStatsDividers.forEach(d => {
        const t = d.textContent || '';
        if (t.includes('Statistiques') && !d.id?.includes('gsc-engine')) {
          oldStatsStart = d;
        }
      });

      /* Construire la nouvelle section stats */
      const newStatsHtml = buildStatsEditSection(p);
      const roleHtml = buildRoleSpecificFields(p);

      /* Trouver le bon point d'insertion : après la section "Présentation" ou avant le bouton save */
      const saveBtn = target.querySelector('.btn-save');
      if (saveBtn) {
        saveBtn.insertAdjacentHTML('beforebegin', newStatsHtml + roleHtml);
      } else {
        target.insertAdjacentHTML('beforeend', newStatsHtml + roleHtml);
      }

      /* Si l'ancienne section stats (football) existe, la masquer */
      if (oldStatsStart) {
        /* Cherche les éléments adjacents qui constituent la section stats */
        let el = oldStatsStart;
        const toHide = [el];
        while (el.nextElementSibling) {
          el = el.nextElementSibling;
          if (el.classList && el.classList.contains('section-divider')) break;
          if (el.id && el.id.includes('gsc-engine-stats')) break;
          toHide.push(el);
        }
        toHide.forEach(e => {
          if (!e.id?.includes('gsc-engine')) e.style.display = 'none';
        });
      }

    });

    observer.observe(target, { childList: true, subtree: false });
  }

  /* ══════════════════════════════════════════════════════════════════
   * 14. EXPOSITION PUBLIQUE des fonctions utiles
   * ══════════════════════════════════════════════════════════════════ */

  window.GSCProfileEngine = {
    getSportStatFields,
    getPhysicalFields,
    buildActorDetailStats,
    buildActorDetailPhysical,
    buildStatsEditSection,
    buildRoleSpecificFields,
    collectStatsFromForm,
    collectRoleSpecificFields,
    renderSportStats: renderSportStats_v2,
    updatePhysicalCardLabels,
  };

  /* ══════════════════════════════════════════════════════════════════
   * 15. INITIALISATION — attendre firebase-ready puis patcher
   * ══════════════════════════════════════════════════════════════════ */

  function init() {
    applyPatches();
    // watchEditFormBody est un fallback de sécurité (au cas où buildEditForm
    // ne serait pas encore exposé au moment du patch)
    if (document.readyState !== 'loading') watchEditFormBody();
    else document.addEventListener('DOMContentLoaded', watchEditFormBody, { once: true });
  }

  /* Attente de firebase-ready pour que les fonctions originales soient définies */
  document.addEventListener('firebase-ready', init, { once: true });

  /* Fallback si firebase-ready est déjà passé (chargement asynchrone) */
  if (window._firebaseReady) init();

})();
