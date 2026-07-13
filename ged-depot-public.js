/**
 * ══════════════════════════════════════════════════════════════════════
 *  GED-DEPOT-PUBLIC.JS — Espace Conformité (GED) — Structures
 *  Gabon Sport Connect · Intégration index.html · 2026
 *
 *  Ajoute, pour tout compte club/association/fédération/organisateur relié
 *  à une fiche `structuresSportives` (via userProfile.structureId — même
 *  convention que gsc-sync-comptes-reels.js), un panneau "Conformité"
 *  injecté juste après #prof-club-info-card sur la page de profil :
 *    - modèles officiels téléchargeables (filtrés par discipline/type)
 *    - dépôt de ses propres documents
 *    - statut (en attente / validé / refusé), observations, date de
 *      validation
 *    - badge Bronze/Argent/Or et taux de conformité
 *
 *  Chaque structure ne voit que ses propres documents (lecture directe de
 *  sa propre fiche `structuresSportives/{structureId}` — aucune requête
 *  transverse). Écriture Firestore/Storage réservée à la structure
 *  connectée elle-même.
 *
 *  ⚠️ SDK Firebase modulaire (aligné sur index.html) : window.db, doc,
 *  getDoc, updateDoc, collection, getDocs, query, where, serverTimestamp,
 *  sRef, uploadBytesResumable, getDownloadURL (voir bloc <script
 *  type="module"> de index.html).
 *
 *  Monkey-patch non-invasif de window.renderProfile (pattern déjà utilisé
 *  par gsc-profile-engine.js) : n'édite pas index.html.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const ORG_ROLES = ['club', 'association', 'federation', 'organisateur'];
  const CATEGORIES = { administratif: '📋 Administratif', juridique: '⚖️ Juridique', financier: '💰 Financier', sportif: '🏆 Sportif' };
  const STATUT_LABELS = { en_attente: '🕓 En attente', valide: '✅ Validé', refuse: '❌ Refusé', correction: '✏️ Correction demandée' };

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmtDate(d) { try { return d ? new Date(d.toDate ? d.toDate() : d).toLocaleDateString('fr-FR') : '—'; } catch (e) { return '—'; } }
  function D() { return window.GSCDisciplines; }

  let _structure = null;
  let _saison = null;

  function hasFeminineRoster(structure, saison) {
    const eff = ((structure.saisons || {})[saison] || {}).effectifs || {};
    return (eff.femmes || 0) > 0;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 1. CHARGEMENT DES DONNÉES
   * ══════════════════════════════════════════════════════════════════ */
  async function loadStructure(structureId) {
    if (!window.db || typeof window.getDoc !== 'function') return null;
    const ref = window.doc(window.db, 'structuresSportives', structureId);
    const snap = await window.getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  async function loadCatalogue(discipline, typeStructure, feminine) {
    if (!window.db || typeof window.getDocs !== 'function') return [];
    try {
      const ref = window.collection(window.db, 'ged_catalogue');
      const q = window.query(ref, window.where('discipline', '==', discipline));
      const snap = await window.getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c =>
        c.statut === 'actif' &&
        (c.typeStructure === 'tous' || c.typeStructure === typeStructure) &&
        (!c.secteurFeminin || feminine)
      );
    } catch (err) {
      console.error('[GEDDepotPublic] loadCatalogue erreur:', err);
      return [];
    }
  }

  async function loadModeles(catalogueIds) {
    const models = {};
    if (!catalogueIds.length || !window.db) return models;
    await Promise.all(catalogueIds.map(async (id) => {
      try {
        const ref = window.doc(window.db, 'ged_modeles', id);
        const snap = await window.getDoc(ref);
        if (snap.exists()) models[id] = snap.data();
      } catch (e) { /* pas de modèle pour ce document */ }
    }));
    return models;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. CALCUL DU BADGE
   * ══════════════════════════════════════════════════════════════════ */
  function computeBadge(catalogue, gedDocs) {
    const mandatory = catalogue.filter(c => c.obligatoire);
    if (!mandatory.length) return null;
    const valides = mandatory.filter(c => gedDocs[c.id] && gedDocs[c.id].statut === 'valide').length;
    return D().computeComplianceBadge(valides, mandatory.length);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. RENDU DU PANNEAU
   * ══════════════════════════════════════════════════════════════════ */
  function renderPanel(structure, catalogue, models, saison) {
    const gedDocs = ((structure.saisons || {})[saison] || {}).gedDocuments || {};
    const badge = computeBadge(catalogue, gedDocs);

    const badgeHtml = badge ? `
      <div class="ged-pub-badge" style="border-color:${badge.color};">
        <span class="ged-pub-badge-emoji">${badge.level === 'or' ? '🥇' : badge.level === 'argent' ? '🥈' : '🥉'}</span>
        <div><div class="ged-pub-badge-label" style="color:${badge.color};">Badge ${badge.label}</div><div class="ged-pub-badge-pct">${badge.pct}% de conformité</div></div>
      </div>
    ` : '<p class="ged-pub-empty">Aucun document obligatoire configuré pour votre discipline pour le moment.</p>';

    const byCat = {};
    catalogue.forEach(c => { byCat[c.categorie] = byCat[c.categorie] || []; byCat[c.categorie].push(c); });

    const sections = Object.entries(byCat).map(([cat, docs]) => {
      const rows = docs.map(c => {
        const dep = gedDocs[c.id];
        const model = models[c.id];
        const statut = dep ? dep.statut : null;
        const canUpload = !statut || statut === 'refuse' || statut === 'correction';
        return `
          <div class="ged-pub-doc-row">
            <div class="ged-pub-doc-info">
              <div class="ged-pub-doc-name">${esc(c.nom)} ${c.obligatoire ? '<span class="ged-req">Obligatoire</span>' : ''}</div>
              ${c.description ? `<div class="ged-pub-doc-desc">${esc(c.description)}</div>` : ''}
              ${dep && dep.observation ? `<div class="ged-pub-observation">💬 ${esc(dep.observation)}</div>` : ''}
              ${dep && dep.dateValidation ? `<div class="ged-pub-doc-desc">Validé le ${fmtDate(dep.dateValidation)}</div>` : ''}
            </div>
            <div class="ged-pub-doc-side">
              ${model ? `<a class="btn-sm" href="${esc(model.url)}" target="_blank">📄 Modèle</a>` : ''}
              ${statut ? `<span class="ged-status ged-status-${esc(statut)}">${STATUT_LABELS[statut]}</span>` : '<span class="ged-status">Non déposé</span>'}
              ${canUpload ? `<button class="btn-sm" onclick="GEDDepotPublic.upload('${esc(c.id)}')">📤 Déposer</button>` : ''}
              ${dep && dep.url ? `<a class="btn-sm" href="${esc(dep.url)}" target="_blank">👁️ Voir mon dépôt</a>` : ''}
            </div>
          </div>
        `;
      }).join('');
      return `<div class="ged-pub-cat-block"><div class="ged-pub-cat-title">${CATEGORIES[cat] || cat}</div>${rows}</div>`;
    }).join('') || '<p class="ged-pub-empty">Aucun document requis pour votre discipline pour le moment.</p>';

    return `
      <div class="dash-card-title">📋 Conformité — Gestion Électronique des Documents</div>
      ${badgeHtml}
      ${sections}
    `;
  }

  async function refresh(structureId) {
    const host = document.getElementById('ged-depot-panel');
    if (!host) return;
    host.innerHTML = '<p class="ged-pub-empty">Chargement…</p>';

    _structure = await loadStructure(structureId);
    if (!_structure) { host.innerHTML = '<p class="ged-pub-empty">Fiche structure introuvable.</p>'; return; }

    _saison = _structure.saisonCourante || '2025-2026';
    const feminine = hasFeminineRoster(_structure, _saison);
    const catalogue = await loadCatalogue(_structure.discipline, _structure.type, feminine);
    const models = await loadModeles(catalogue.map(c => c.id));

    host.innerHTML = renderPanel(_structure, catalogue, models, _saison);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. DÉPÔT D'UN DOCUMENT
   * ══════════════════════════════════════════════════════════════════ */
  function upload(catalogueId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png,.xlsx';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file || !_structure) return;
      try {
        if (!window._storageReady || !window.storage) { alert('Stockage indisponible pour le moment. Réessayez plus tard.'); return; }
        const path = `structures/${_structure.id}/ged/${_saison}/${catalogueId}_${Date.now()}_${file.name}`;
        const ref = window.sRef(window.storage, path);
        await window.uploadBytesResumable(ref, file);
        const url = await window.getDownloadURL(ref);

        const dotPath = `saisons.${_saison}.gedDocuments.${catalogueId}`;
        await window.updateDoc(window.doc(window.db, 'structuresSportives', _structure.id), {
          [dotPath]: {
            statut: 'en_attente', url, fileName: file.name, size: file.size,
            uploadedAt: window.serverTimestamp ? window.serverTimestamp() : new Date(),
            uploadedBy: (window.currentUser && window.currentUser.uid) || null,
            observation: '', historique: []
          }
        });

        if (typeof window.toast === 'function') window.toast('✅ Document envoyé, en attente de validation.', 'success');
        else alert('✅ Document envoyé, en attente de validation.');
        await refresh(_structure.id);
      } catch (err) {
        alert('❌ Erreur envoi : ' + (err.message || err));
      }
    };
    input.click();
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. INJECTION — panneau ajouté après #prof-club-info-card
   * ══════════════════════════════════════════════════════════════════ */
  function ensurePanel() {
    let panel = document.getElementById('ged-depot-panel');
    if (panel) return panel;
    const anchor = document.getElementById('prof-club-info-card');
    if (!anchor) return null;
    panel = document.createElement('div');
    panel.id = 'ged-depot-panel';
    panel.className = 'card mb-16 fade-up ged-pub-panel';
    panel.style.display = 'none';
    anchor.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function updatePanelVisibility() {
    const p = window.userProfile;
    const panel = ensurePanel();
    if (!panel) return;
    const isOrg = p && ORG_ROLES.includes(p.role) && p.structureId;
    panel.style.display = isOrg ? '' : 'none';
    if (isOrg) refresh(p.structureId);
  }

  function patchRenderProfile() {
    if (typeof window.renderProfile === 'function' && !window.renderProfile._gedPatched) {
      const _orig = window.renderProfile;
      window.renderProfile = function () {
        const r = _orig.apply(this, arguments);
        try { updatePanelVisibility(); } catch (e) { console.error('[GEDDepotPublic]', e); }
        return r;
      };
      window.renderProfile._gedPatched = true;
    }
  }

  function boot() {
    patchRenderProfile();
    if (typeof window.renderProfile !== 'function') {
      // renderProfile pas encore défini : réessaie une fois le script principal chargé
      window.addEventListener('load', patchRenderProfile);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GEDDepotPublic = { upload, refresh: () => window.userProfile && refresh(window.userProfile.structureId) };

})(window);
