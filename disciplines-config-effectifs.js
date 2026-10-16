/**
 * DISCIPLINES-CONFIG-EFFECTIFS.JS - Regles d'effectifs par discipline
 * Gabon Sport Connect - chantier effectifs et listes publiques des clubs
 *
 * Couche additive (meme principe que disciplines-config-feminin.js) :
 * ne modifie pas disciplines-config.js. Expose window.GSCRosterRules.
 * ATTENTION : valeurs indicatives, a confirmer en phase 0 aupres des
 * federations et des reglements de competition (aVerifier / verifieLe).
 */
(function (window) {
  'use strict';

  var STAFF_ROLES = [
    'Entraîneur principal', 'Entraîneur adjoint', 'Préparateur physique',
    'Médecin du sport', 'Kinésithérapeute', 'Délégué', 'Dirigeant'
  ];

  var RULES = {
    'Football': {
      surTerrain: 11,
      effectif: { min: 11, max: 23 },
      postes: ['Gardien', 'Défenseur', 'Milieu', 'Attaquant'],
      note: "Varie selon la competition (23 dans les grandes competitions FIFA et CAF)",
      sourceOfficielle: '', verifieLe: null, aVerifier: true
    },
    'Basketball': {
      surTerrain: 5,
      effectif: { min: 5, max: 12 },
      postes: ['Meneur', 'Arrière', 'Ailier', 'Ailier fort', 'Pivot'],
      note: "12 joueurs sur la feuille de match (FIBA)",
      sourceOfficielle: '', verifieLe: null, aVerifier: true
    },
    'Volleyball': {
      surTerrain: 6,
      effectif: { min: 6, max: 14 },
      postes: ['Passeur', 'Pointu', 'Réceptionneur-attaquant', 'Central', 'Libéro'],
      note: "12 a 14 selon la competition",
      sourceOfficielle: '', verifieLe: null, aVerifier: true
    }
  };

  function getRules(discipline) { return RULES[discipline] || null; }
  function getPostes(discipline) { var r = RULES[discipline]; return r ? r.postes.slice() : []; }
  function getEffectif(discipline) { var r = RULES[discipline]; return r ? { min: r.effectif.min, max: r.effectif.max } : null; }
  function getStaffRoles() { return STAFF_ROLES.slice(); }
  function hasRules(discipline) { return !!RULES[discipline]; }

  /* Controle d'un effectif cible ou reel : ok / warn (sous le minimum) / error (au-dessus du maximum) */
  function validerEffectif(discipline, nombre) {
    var r = RULES[discipline];
    if (!r) return { ok: true, level: 'ok', message: '' };
    var n = parseInt(nombre, 10);
    if (isNaN(n) || n < 0) return { ok: false, level: 'error', message: 'Effectif invalide' };
    if (n > r.effectif.max) return { ok: false, level: 'error', message: 'Maximum du reglement : ' + r.effectif.max };
    if (n < r.effectif.min) return { ok: true, level: 'warn', message: 'Minimum conseille : ' + r.effectif.min };
    return { ok: true, level: 'ok', message: '' };
  }

  /* Mineur = moins de 18 ans pendant la saison (annee de naissance suffisante) */
  function estMineur(anneeNaissance, anneeSaison) {
    var a = parseInt(anneeNaissance, 10), s = parseInt(anneeSaison, 10);
    if (isNaN(a) || isNaN(s)) return true; /* en cas de doute : protege */
    return (s - a) < 18;
  }

  window.GSCRosterRules = {
    getRules: getRules, getPostes: getPostes, getEffectif: getEffectif,
    getStaffRoles: getStaffRoles, hasRules: hasRules,
    validerEffectif: validerEffectif, estMineur: estMineur,
    disciplines: function () { return Object.keys(RULES); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
