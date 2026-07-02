/**
 * ══════════════════════════════════════════════════════════════════════
 *  STRUCTURES-PROFILE-ENGINE.JS — Moteur de profils enrichis
 *  Gabon Sport Connect · Module 2/7 · 2026
 *
 *  Modèle de données (sitesSportifs/{id}) :
 *  {
 *    nom, sigle, type, discipline, disciplinesSecondaires:[],
 *    ville, lat, lng, adresse, telephone, email, logoUrl,
 *    gouvernance: { bureau:[{role,nom,telephone,email}], mandatDebut, mandatFin },
 *    statutJuridique: { formeJuridique, numeroRecepisse, dateRecepisse, siegeSocial },
 *    affiliations: [{organisme, numeroAffiliation, dateAffiliation}],
 *    saisonCourante: "2025-2026",
 *    saisons: {
 *      "2025-2026": {
 *        effectifs: { hommes:0, femmes:0, parCategorie:{ "U13":{hommes,femmes}, ... } },
 *        roster: { "U13":[{id,nom,age,dateNaissance,poste,infos}], ... },
 *        encadrement: [{role,nom,telephone,email}]
 *      }
 *    },
 *    status:'active', addedBy, createdAt, updatedAt
 *  }
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const D = () => window.GSCDisciplines;

  /* ══════════════════════════════════════════════════════════════════
   * 1. GESTION DES SAISONS
   * ══════════════════════════════════════════════════════════════════ */
  function getCurrentSeasonLabel() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  }

  function listSeasons(structure) {
    const saisons = (structure && structure.saisons) || {};
    return Object.keys(saisons).sort().reverse();
  }

  function emptySeasonData(sport) {
    const categories = D().getCategories(sport);
    const parCategorie = {};
    categories.forEach(c => { parCategorie[c] = { hommes: 0, femmes: 0 }; });
    const roster = {};
    categories.forEach(c => { roster[c] = []; });
    return {
      effectifs: { hommes: 0, femmes: 0, parCategorie },
      roster,
      encadrement: []
    };
  }

  function ensureSeason(structure, saison, sport) {
    structure.saisons = structure.saisons || {};
    if (!structure.saisons[saison]) {
      structure.saisons[saison] = emptySeasonData(sport);
    } else {
      // Compléter les catégories manquantes si la discipline a évolué
      const empty = emptySeasonData(sport);
      structure.saisons[saison].effectifs = structure.saisons[saison].effectifs || empty.effectifs;
      structure.saisons[saison].effectifs.parCategorie = {
        ...empty.effectifs.parCategorie,
        ...(structure.saisons[saison].effectifs.parCategorie || {})
      };
      structure.saisons[saison].roster = { ...empty.roster, ...(structure.saisons[saison].roster || {}) };
      structure.saisons[saison].encadrement = structure.saisons[saison].encadrement || [];
    }
    return structure.saisons[saison];
  }

  function computeEffectifsTotals(saisonData) {
    const pc = (saisonData && saisonData.effectifs && saisonData.effectifs.parCategorie) || {};
    let hommes = 0, femmes = 0;
    Object.values(pc).forEach(c => { hommes += (c.hommes || 0); femmes += (c.femmes || 0); });
    return { hommes, femmes, total: hommes + femmes };
  }

  function computeRosterCount(saisonData) {
    const roster = (saisonData && saisonData.roster) || {};
    return Object.values(roster).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. RENDU — VUE LECTURE (visiteur + admin détail)
   * ══════════════════════════════════════════════════════════════════ */
  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function renderIdentityBlock(s) {
    const icon = D().getIcon(s.discipline);
    return `
      <div class="adm-section">
        <div class="adm-section-title">${icon} Identité</div>
        <div class="detail-grid">
          <div><strong>Nom</strong><br>${esc(s.nom)}</div>
          <div><strong>Sigle</strong><br>${esc(s.sigle) || '—'}</div>
          <div><strong>Type</strong><br>${esc(s.type)}</div>
          <div><strong>Discipline</strong><br>${icon} ${esc(s.discipline)}</div>
          <div><strong>Ville</strong><br>${esc(s.ville)}</div>
        </div>
      </div>`;
  }

  function renderGovernanceBlock(s) {
    const g = s.gouvernance || {};
    const bureau = Array.isArray(g.bureau) ? g.bureau : [];
    const rows = bureau.map(b => `
      <tr><td>${esc(b.role)}</td><td>${esc(b.nom)}</td><td>${esc(b.telephone) || '—'}</td><td>${esc(b.email) || '—'}</td></tr>
    `).join('');
    return `
      <div class="adm-section">
        <div class="adm-section-title">🏛️ Gouvernance</div>
        <p style="font-size:12px;color:var(--gray-txt);margin-bottom:8px;">
          Mandat : ${esc(g.mandatDebut) || '—'} → ${esc(g.mandatFin) || '—'}
        </p>
        <table class="mini-table"><thead><tr><th>Rôle</th><th>Nom</th><th>Tél.</th><th>Email</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">Aucun membre renseigné</td></tr>'}</tbody></table>
      </div>`;
  }

  function renderLegalBlock(s) {
    const j = s.statutJuridique || {};
    return `
      <div class="adm-section">
        <div class="adm-section-title">⚖️ Statut administratif et juridique</div>
        <div class="detail-grid">
          <div><strong>Forme juridique</strong><br>${esc(j.formeJuridique) || '—'}</div>
          <div><strong>N° Récépissé</strong><br>${esc(j.numeroRecepisse) || '—'}</div>
          <div><strong>Date récépissé</strong><br>${esc(j.dateRecepisse) || '—'}</div>
          <div><strong>Siège social</strong><br>${esc(j.siegeSocial) || '—'}</div>
        </div>
      </div>`;
  }

  function renderAffiliationsBlock(s) {
    const list = Array.isArray(s.affiliations) ? s.affiliations : [];
    const rows = list.map(a => `
      <tr><td>${esc(a.organisme)}</td><td>${esc(a.numeroAffiliation) || '—'}</td><td>${esc(a.dateAffiliation) || '—'}</td></tr>
    `).join('');
    return `
      <div class="adm-section">
        <div class="adm-section-title">🔗 Affiliations</div>
        <table class="mini-table"><thead><tr><th>Organisme</th><th>N° d'affiliation</th><th>Date</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3">Aucune affiliation renseignée</td></tr>'}</tbody></table>
      </div>`;
  }

  function renderEffectifsBlock(saisonData, sport) {
    const pc = (saisonData.effectifs && saisonData.effectifs.parCategorie) || {};
    const totals = computeEffectifsTotals(saisonData);
    const rows = Object.entries(pc).map(([cat, v]) => `
      <tr><td>${esc(cat)}</td><td>${v.hommes || 0}</td><td>${v.femmes || 0}</td><td>${(v.hommes || 0) + (v.femmes || 0)}</td></tr>
    `).join('');
    return `
      <div class="adm-section">
        <div class="adm-section-title">👥 Effectifs</div>
        <p style="font-size:12px;color:var(--gray-txt);margin-bottom:8px;">
          Total : <strong>${totals.total}</strong> (${totals.hommes} hommes · ${totals.femmes} femmes)
        </p>
        <table class="mini-table"><thead><tr><th>Catégorie</th><th>Hommes</th><th>Femmes</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>`;
  }

  /**
   * viewerRole : 'public' (visiteur anonyme ou non autorisé) | 'manager' | 'admin'
   * Le détail nominatif (nom, date de naissance) des joueurs/athlètes — dont
   * une part est mineure (catégories U7 à U20) — n'est jamais exposé au
   * public : seuls les effectifs agrégés par catégorie sont visibles.
   * Seuls 'manager' (dirigeant de la structure) et 'admin' voient le roster
   * nominatif complet.
   */
  function renderRosterBlock(saisonData, sport, saison, viewerRole) {
    const roster = saisonData.roster || {};
    const cats = Object.keys(roster).filter(c => (roster[c] || []).length);
    const canSeeIdentities = viewerRole === 'admin' || viewerRole === 'manager';

    if (!cats.length) {
      return `
        <div class="adm-section">
          <div class="adm-section-title">📋 Joueurs / Athlètes — Saison ${esc(saison)}</div>
          <p style="font-size:12px;color:var(--gray-txt);">Aucun joueur/athlète enregistré pour cette saison.</p>
        </div>`;
    }

    if (!canSeeIdentities) {
      const rows = cats.map(cat => `
        <tr><td>${esc(cat)}</td><td>${roster[cat].length}</td></tr>
      `).join('');
      return `
        <div class="adm-section">
          <div class="adm-section-title">📋 Effectifs par catégorie — Saison ${esc(saison)}</div>
          <p style="font-size:11px;color:var(--gray-txt);margin-bottom:6px;">
            Liste nominative réservée aux dirigeants de la structure et à l'administration (protection des données des mineurs).
          </p>
          <table class="mini-table"><thead><tr><th>Catégorie</th><th>Effectif</th></tr></thead>
          <tbody>${rows}</tbody></table>
        </div>`;
    }

    const blocks = cats.map(cat => {
      const rows = (roster[cat] || []).map(p => `
        <tr><td>${esc(p.nom)}</td><td>${p.age ?? '—'}</td><td>${esc(p.poste) || '—'}</td><td>${esc(p.dateNaissance) || '—'}</td><td>${esc(p.infos) || '—'}</td></tr>
      `).join('');
      return `
        <div style="margin-bottom:14px;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${esc(cat)} (${roster[cat].length})</div>
          <table class="mini-table"><thead><tr><th>Nom</th><th>Âge</th><th>Poste</th><th>Naissance</th><th>Infos</th></tr></thead>
          <tbody>${rows}</tbody></table>
        </div>`;
    }).join('');
    return `
      <div class="adm-section">
        <div class="adm-section-title">📋 Joueurs / Athlètes (nominatif) — Saison ${esc(saison)}</div>
        <p style="font-size:11px;color:var(--gray-txt);margin-bottom:6px;">
          Données sensibles (mineurs) — visibles uniquement par vous (dirigeant/admin).
        </p>
        ${blocks}
      </div>`;
  }

  function renderEncadrementBlock(saisonData, saison) {
    const list = Array.isArray(saisonData.encadrement) ? saisonData.encadrement : [];
    const rows = list.map(e => `
      <tr><td>${esc(e.role)}</td><td>${esc(e.nom)}</td><td>${esc(e.telephone) || '—'}</td><td>${esc(e.email) || '—'}</td></tr>
    `).join('');
    return `
      <div class="adm-section">
        <div class="adm-section-title">🎓 Encadrement — Saison ${esc(saison)}</div>
        <table class="mini-table"><thead><tr><th>Rôle</th><th>Nom</th><th>Tél.</th><th>Email</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">Aucun encadrant renseigné</td></tr>'}</tbody></table>
      </div>`;
  }

  function renderContactBlock(s) {
    return `
      <div class="adm-section">
        <div class="adm-section-title">📞 Coordonnées</div>
        <div class="detail-grid">
          <div><strong>Adresse</strong><br>${esc(s.adresse) || '—'}</div>
          <div><strong>Téléphone</strong><br>${esc(s.telephone || s.contact) || '—'}</div>
          <div><strong>Email</strong><br>${esc(s.email) || '—'}</div>
        </div>
      </div>`;
  }

  function renderSeasonSelector(structure, activeSaison, onChangeFnName) {
    const seasons = listSeasons(structure);
    if (!seasons.includes(activeSaison)) seasons.unshift(activeSaison);
    const opts = seasons.map(sn => `<option value="${esc(sn)}" ${sn === activeSaison ? 'selected' : ''}>${esc(sn)}</option>`).join('');
    return `
      <div class="form-group" style="max-width:220px;">
        <label>Saison / Période</label>
        <select onchange="${onChangeFnName}(this.value)">${opts}</select>
      </div>`;
  }

  /**
   * Rendu complet d'une fiche structure (lecture).
   * @param {object} structure  document Firestore complet
   * @param {string} [saison]   saison à afficher (défaut : saisonCourante ou saison actuelle)
   * @param {string} [seasonSelectorCallback] nom de la fonction globale appelée au changement de saison
   * @param {string} [viewerRole] 'public' | 'manager' | 'admin' — contrôle l'accès au roster nominatif
   */
  function renderFullProfile(structure, saison, seasonSelectorCallback, viewerRole) {
    const sport = structure.discipline || 'Football';
    const activeSaison = saison || structure.saisonCourante || getCurrentSeasonLabel();
    const saisonData = ensureSeason(structure, activeSaison, sport);
    const role = viewerRole || 'public';

    return `
      ${seasonSelectorCallback ? renderSeasonSelector(structure, activeSaison, seasonSelectorCallback) : ''}
      ${renderIdentityBlock(structure)}
      ${renderGovernanceBlock(structure)}
      ${renderLegalBlock(structure)}
      ${renderAffiliationsBlock(structure)}
      ${renderEffectifsBlock(saisonData, sport)}
      ${renderRosterBlock(saisonData, sport, activeSaison, role)}
      ${renderEncadrementBlock(saisonData, activeSaison)}
      ${renderContactBlock(structure)}
    `;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. EXPOSITION GLOBALE
   * ══════════════════════════════════════════════════════════════════ */
  window.GSCStructureProfile = {
    getCurrentSeasonLabel,
    listSeasons,
    emptySeasonData,
    ensureSeason,
    computeEffectifsTotals,
    computeRosterCount,
    renderFullProfile,
    renderIdentityBlock,
    renderGovernanceBlock,
    renderLegalBlock,
    renderAffiliationsBlock,
    renderEffectifsBlock,
    renderRosterBlock,
    renderEncadrementBlock,
    renderContactBlock
  };

})(window);
