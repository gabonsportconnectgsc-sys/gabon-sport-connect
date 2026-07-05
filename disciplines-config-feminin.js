/**
 * ══════════════════════════════════════════════════════════════════════
 *  DISCIPLINES-CONFIG-FEMININ.JS — Couche "Secteur Féminin" par discipline
 *  Gabon Sport Connect · 2026
 *
 *  Ajoute, SANS modifier disciplines-config.js, des données spécifiques
 *  au secteur féminin pour chaque discipline :
 *   - documents administratifs propres au féminin (ex. affiliation à une
 *     ligue/commission féminine, licence spécifique, etc.)
 *   - organismes féminins dédiés (nom, sigle, site)
 *   - catégories d'âge / compétitions propres au championnat féminin
 *
 *  Principe : couche 100% additive. Si une discipline n'a pas d'entrée
 *  ci-dessous, les fonctions renvoient des tableaux vides — aucune
 *  régression, aucun comportement par défaut inventé.
 *
 *  À charger APRÈS disciplines-config.js et disciplines-config-adapter.js.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  if (!window.GSCDisciplines) {
    console.error('[DisciplinesFeminin] window.GSCDisciplines introuvable. ' +
      'Vérifiez que disciplines-config.js est chargé AVANT ce module.');
    return;
  }

  const G = window.GSCDisciplines;

  /* ══════════════════════════════════════════════════════════════════
   * 1. RÉFÉRENTIEL — DONNÉES PAR DISCIPLINE
   *
   *  Chaque entrée est optionnelle et partielle : on ne renseigne que
   *  ce qui est confirmé. Un administrateur pourra compléter ce
   *  référentiel au fil de l'eau sans toucher au code des modules
   *  compliance / admin.
   * ══════════════════════════════════════════════════════════════════ */
  const FEMININ_DATA = {
    'Football': {
      organismes: [
        { sigle: 'FEGAFOOT', nom: 'Commission Football Féminin de la FEGAFOOT', url: '' },
        { sigle: 'CAF', nom: 'CAF Féminin (compétitions continentales dames)', url: '' }
      ],
      categories: ['Seniors Dames', 'U20 Dames', 'U17 Dames'],
      documents: [
        { id: 'fem-fball-affiliation', label: 'Attestation d\'affiliation Football Féminin (FEGAFOOT)', organisme: 'federation_feminine', obligatoire: true },
        { id: 'fem-fball-licences', label: 'Registre des licences joueuses saison en cours', organisme: 'federation_feminine', obligatoire: true }
      ]
    },
    'Basketball': {
      organismes: [
        { sigle: 'FGBB', nom: 'Commission Basketball Féminin de la FGBB', url: '' }
      ],
      categories: ['Seniors Dames', 'U18 Dames'],
      documents: [
        { id: 'fem-bball-affiliation', label: 'Attestation d\'affiliation Championnat Dames', organisme: 'federation_feminine', obligatoire: true }
      ]
    },
    'Handball': {
      organismes: [
        { sigle: 'FGHB', nom: 'Commission Handball Féminin de la FGHB', url: '' }
      ],
      categories: ['Seniors Dames', 'U18 Dames'],
      documents: [
        { id: 'fem-hball-affiliation', label: 'Attestation d\'affiliation Championnat Dames', organisme: 'federation_feminine', obligatoire: true }
      ]
    },
    'Volleyball': {
      organismes: [
        { sigle: 'FGVB', nom: 'Commission Volleyball Féminin de la FGVB', url: '' }
      ],
      categories: ['Seniors Dames', 'U18 Dames'],
      documents: [
        { id: 'fem-vball-affiliation', label: 'Attestation d\'affiliation Championnat Dames', organisme: 'federation_feminine', obligatoire: true }
      ]
    }
    /* ── Autres disciplines (Rugby, Athlétisme, Natation, Tennis, Boxe,
       Judo, Taekwondo, Lutte, Handisport) : ajouter ici au fur et à
       mesure que les informations officielles (fédérations, organismes
       féminins, documents requis) sont confirmées. Tant qu'une
       discipline n'a pas d'entrée, elle reste "non configurée" —
       voir isFeminineConfigured(). ── */
  };

  /* ══════════════════════════════════════════════════════════════════
   * 2. API PUBLIQUE — GREFFÉE SUR window.GSCDisciplines
   * ══════════════════════════════════════════════════════════════════ */

  /** Documents spécifiques au secteur féminin pour une discipline (peut être vide). */
  function getFeminineDocuments(discipline) {
    const entry = FEMININ_DATA[discipline];
    return (entry && Array.isArray(entry.documents)) ? entry.documents.slice() : [];
  }

  /** Organismes féminins dédiés pour une discipline (peut être vide). */
  function getFeminineOrganismes(discipline) {
    const entry = FEMININ_DATA[discipline];
    return (entry && Array.isArray(entry.organismes)) ? entry.organismes.slice() : [];
  }

  /** Catégories / championnats propres au secteur féminin (peut être vide). */
  function getFeminineCategories(discipline) {
    const entry = FEMININ_DATA[discipline];
    return (entry && Array.isArray(entry.categories)) ? entry.categories.slice() : [];
  }

  /** true si la discipline a une couche féminine renseignée (au moins un champ non vide). */
  function isFeminineConfigured(discipline) {
    const entry = FEMININ_DATA[discipline];
    if (!entry) return false;
    return (entry.documents && entry.documents.length > 0)
      || (entry.organismes && entry.organismes.length > 0)
      || (entry.categories && entry.categories.length > 0);
  }

  /**
   * Documents combinés (génériques + féminins) pour une discipline.
   * N'affecte PAS G.getDocuments() existant : nouvelle fonction dédiée,
   * à utiliser explicitement là où la vue "féminin" en a besoin
   * (ex. conformité d'une structure ayant des effectifs féminins).
   */
  function getCombinedDocuments(discipline, { includeFeminine = true } = {}) {
    const base = (typeof G.getDocuments === 'function') ? G.getDocuments(discipline) : [];
    if (!includeFeminine) return base.slice();
    return base.concat(getFeminineDocuments(discipline));
  }

  /** Liste des disciplines ayant une couche féminine renseignée. */
  function listConfiguredDisciplines() {
    return Object.keys(FEMININ_DATA).filter(isFeminineConfigured);
  }

  G.getFeminineDocuments = getFeminineDocuments;
  G.getFeminineOrganismes = getFeminineOrganismes;
  G.getFeminineCategories = getFeminineCategories;
  G.isFeminineConfigured = isFeminineConfigured;
  G.getCombinedDocuments = getCombinedDocuments;
  G.listFeminineConfiguredDisciplines = listConfiguredDisciplines;

  console.log('[DisciplinesFeminin] Couche secteur féminin chargée ✅ ' +
    `(${listConfiguredDisciplines().length} discipline(s) configurée(s))`);

})(window);
