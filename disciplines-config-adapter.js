/**
 * ══════════════════════════════════════════════════════════════════════
 *  DISCIPLINES-CONFIG-ADAPTER.JS — Adaptateur de compatibilité
 *  Gabon Sport Connect · 2026
 *
 *  Ajoute des alias sur window.GSCDisciplines pour les nouveaux modules
 *  (compliance, infrastructures, form-manager) SANS modifier le fichier
 *  disciplines-config.js existant.
 *
 *  À charger JUSTE APRÈS disciplines-config.js et AVANT tous les
 *  nouveaux modules (structures-manager.js, gsc-structures-*.js).
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  if (!window.GSCDisciplines) {
    console.error('[DisciplinesAdapter] window.GSCDisciplines introuvable. ' +
      'Vérifiez que disciplines-config.js est chargé AVANT cet adaptateur.');
    return;
  }

  const G = window.GSCDisciplines;

  /* Alias : liste des noms de disciplines */
  if (!G.getDisciplines) {
    G.getDisciplines = G.list;
  }

  /* Alias : documents administratifs requis (Ministère/Fédération/Ligue/FIFA/CAF) */
  if (!G.getDocuments) {
    G.getDocuments = G.getRequiredDocuments;
  }

  /* Alias : types d'infrastructures pertinents pour la discipline */
  if (!G.getInfrastructures) {
    G.getInfrastructures = G.getInfrastructureTypes;
  }

  /* Alias : rôles d'encadrement */
  if (!G.getEncadrement) {
    G.getEncadrement = G.getEncadrementRoles;
  }

  /* Alias : types de structures autorisées */
  if (!G.getTypes) {
    G.getTypes = G.getStructureTypes;
  }

  console.log('[DisciplinesAdapter] Alias de compatibilité chargés ✅');

})(window);
