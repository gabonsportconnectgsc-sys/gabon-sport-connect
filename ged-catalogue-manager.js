/**
 * ══════════════════════════════════════════════════════════════════════
 *  GED-CATALOGUE-MANAGER.JS — Gestion Électronique des Documents (GED)
 *  Gabon Sport Connect · Module Admin 1/4 · 2026
 *
 *  Bibliothèque de modèles officiels organisée par :
 *    Discipline → Type de structure → Catégorie (Administratif / Juridique
 *    / Financier / Sportif). Remplace la dépendance à la liste statique de
 *    disciplines-config.js : l'admin peut créer/modifier/archiver ses
 *    propres définitions de documents, avec loi de référence, version,
 *    date d'entrée en vigueur et statut.
 *
 *  Ne modifie ni ne remplace gsc-structures-compliance.js (laissé intact).
 *  S'injecte en complément, à la fin de la section #conformite existante,
 *  via un panneau à onglets créé dynamiquement (aucune édition HTML requise
 *  dans admin.html — seule une balise <script>/<link> est ajoutée).
 *
 *  Collections Firestore (SDK compat, comme gsc-structures-compliance.js) :
 *   - ged_catalogue : définitions de documents { discipline, typeStructure,
 *     categorie, nom, description, obligatoire, texteReference, version,
 *     dateEntreeVigueur, statut('actif'|'archive'), secteurFeminin }
 *   - ged_modeles : fichier modèle par entrée catalogue { url, fileName,
 *     size, version, uploadedAt, uploadedBy, historique[] }
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const D = () => window.GSCDisciplines;
  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmtDate(d) { try { return d ? new Date(d.toDate ? d.toDate() : d).toLocaleDateString('fr-FR') : '—'; } catch (e) { return '—'; } }
  function uid() { return (window.firebase && firebase.auth().currentUser) ? firebase.auth().currentUser.uid : 'admin'; }

  const CATEGORIES = [
    ['administratif', '📋 Documents administratifs'],
    ['juridique', '⚖️ Documents juridiques'],
    ['financier', '💰 Documents financiers'],
    ['sportif', '🏆 Documents sportifs']
  ];

  function catRef() { return window.db ? window.db.collection('ged_catalogue') : null; }
  function modelesRef() { return window.db ? window.db.collection('ged_modeles') : null; }

  let _catalogueCache = [];

  async function loadCatalogue() {
    const ref = catRef();
    if (!ref) return [];
    const snap = await ref.get();
    _catalogueCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return _catalogueCache;
  }

  function getCatalogueSync() { return _catalogueCache; }

  /* Documents catalogue applicables à une structure (utilisé aussi par
     ged-validation-admin.js et ged-depot-public.js — logique unique). */
  function getCatalogueForStructure(structure, saison) {
    const feminine = (window.GSCComplianceModule && typeof window.GSCComplianceModule.hasFeminineRoster === 'function')
      ? window.GSCComplianceModule.hasFeminineRoster(structure, saison) : false;
    return _catalogueCache.filter(c => {
      if (c.statut !== 'actif') return false;
      if (c.discipline !== structure.discipline) return false;
      if (c.typeStructure !== 'tous' && c.typeStructure !== structure.type) return false;
      if (c.secteurFeminin && !feminine) return false;
      return true;
    });
  }

  /* ── Badge de conformité GED (indépendant du badge legacy, basé sur le
     catalogue administré). Si aucune entrée catalogue pour la discipline,
     l'emplacement reste vide (conforme au cahier des charges). ── */
  function computeGedBadge(structure, saison) {
    const docs = getCatalogueForStructure(structure, saison);
    const mandatory = docs.filter(d => d.obligatoire);
    if (!mandatory.length) return null;
    const gedDocs = ((structure.saisons || {})[saison] || {}).gedDocuments || {};
    const valides = mandatory.filter(d => gedDocs[d.id] && gedDocs[d.id].statut === 'valide').length;
    return D().computeComplianceBadge(valides, mandatory.length);
  }

  /* ══════════════════════════════════════════════════════════════════
   * RENDU — PANNEAU CATALOGUE (admin)
   * ══════════════════════════════════════════════════════════════════ */
  function renderCatalogueTree() {
    const disciplines = D().list();
    const grouped = {};
    _catalogueCache.forEach(c => {
      grouped[c.discipline] = grouped[c.discipline] || [];
      grouped[c.discipline].push(c);
    });

    const options = disciplines.map(name => `<option value="${esc(name)}">${D().getIcon(name) || ''} ${esc(name)}</option>`).join('');

    return `
      <div class="ged-toolbar">
        <select id="ged-cat-discipline">${options}</select>
        <button class="btn btn-secondary" onclick="GEDCatalogue.openEntryForm()">➕ Nouveau document</button>
      </div>
      <div id="ged-cat-tree"></div>
    `;
  }

  function renderCategoryBlock(discipline, categorieCode, categorieLabel, entries) {
    const rows = entries.map(e => {
      const model = e._model;
      return `
        <div class="ged-doc-row ${e.statut === 'archive' ? 'ged-archived' : ''}">
          <div class="ged-doc-main">
            <div class="ged-doc-name">${esc(e.nom)} ${e.obligatoire ? '<span class="ged-req">Obligatoire</span>' : '<span class="ged-opt">Optionnel</span>'} ${e.secteurFeminin ? '🚺' : ''}</div>
            <div class="ged-doc-meta">${esc(e.description || '')}</div>
            <div class="ged-doc-meta">${e.texteReference ? '📜 ' + esc(e.texteReference) + ' · ' : ''}v${esc(e.version || '1')} ${e.dateEntreeVigueur ? '· en vigueur depuis ' + fmtDate(e.dateEntreeVigueur) : ''} · ${esc(e.typeStructure)}</div>
          </div>
          <div class="ged-doc-model">
            ${model
              ? `<a class="btn-sm" href="${esc(model.url)}" target="_blank">📄 ${esc(model.fileName || 'Modèle')}</a>
                 <button class="btn-sm" onclick="GEDCatalogue.uploadModel('${esc(e.id)}')">🔄 Remplacer</button>`
              : `<span class="ged-empty">Aucun modèle</span>
                 <button class="btn-sm" onclick="GEDCatalogue.uploadModel('${esc(e.id)}')">📤 Importer</button>`}
          </div>
          <div class="ged-doc-actions">
            <button class="btn-sm" onclick="GEDCatalogue.openEntryForm('${esc(e.id)}')">✏️</button>
            <button class="btn-sm" onclick="GEDCatalogue.toggleArchive('${esc(e.id)}','${e.statut}')">${e.statut === 'archive' ? '♻️' : '🗄️'}</button>
            <button class="btn-sm danger" onclick="GEDCatalogue.deleteEntry('${esc(e.id)}')">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
    return `
      <div class="dash-card ged-cat-card">
        <div class="dash-card-title">${categorieLabel} (${entries.length})</div>
        ${rows || '<p class="ged-empty-msg">Aucun document dans cette catégorie.</p>'}
      </div>
    `;
  }

  async function renderTreeInto(discipline) {
    const el = document.getElementById('ged-cat-tree');
    if (!el) return;
    el.innerHTML = '<p class="ged-empty-msg">Chargement…</p>';
    await loadCatalogue();
    const models = await (async () => {
      const ref = modelesRef();
      if (!ref) return {};
      const snap = await ref.get();
      const m = {};
      snap.docs.forEach(d => { m[d.id] = d.data(); });
      return m;
    })();

    const forDiscipline = _catalogueCache.filter(c => c.discipline === discipline);
    forDiscipline.forEach(c => { c._model = models[c.id] || null; });

    const blocks = CATEGORIES.map(([code, label]) => {
      const entries = forDiscipline.filter(c => c.categorie === code);
      return renderCategoryBlock(discipline, code, label, entries);
    }).join('');

    el.innerHTML = blocks;
  }

  /* ══════════════════════════════════════════════════════════════════
   * FORMULAIRE CRÉATION / ÉDITION D'UNE ENTRÉE CATALOGUE
   * ══════════════════════════════════════════════════════════════════ */
  function openEntryForm(entryId) {
    const discipline = document.getElementById('ged-cat-discipline').value;
    const existing = entryId ? _catalogueCache.find(c => c.id === entryId) : null;
    const structureTypes = D().getStructureTypes(discipline);
    const typeOptions = ['tous'].concat(structureTypes).map(t =>
      `<option value="${esc(t)}" ${existing && existing.typeStructure === t ? 'selected' : ''}>${t === 'tous' ? 'Toutes structures' : esc(t)}</option>`
    ).join('');
    const catOptions = CATEGORIES.map(([code, label]) =>
      `<option value="${code}" ${existing && existing.categorie === code ? 'selected' : ''}>${label}</option>`
    ).join('');

    const html = `
      <div class="modal-overlay open" id="ged-entry-modal" onclick="this.classList.remove('open');this.remove()">
        <div class="modal" style="max-width:520px;" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">${existing ? '✏️ Modifier' : '➕ Nouveau'} document — ${esc(discipline)}</div>
            <button class="modal-close" onclick="document.getElementById('ged-entry-modal').remove()">✕</button>
          </div>
          <div class="modal-content">
            <div class="ged-form-field"><label>Nom du document</label><input id="ged-f-nom" value="${esc(existing?.nom)}" placeholder="Ex : Statuts du club"></div>
            <div class="ged-form-field"><label>Description</label><textarea id="ged-f-desc" rows="2">${esc(existing?.description)}</textarea></div>
            <div class="ged-form-row">
              <div class="ged-form-field"><label>Catégorie</label><select id="ged-f-cat">${catOptions}</select></div>
              <div class="ged-form-field"><label>Type de structure</label><select id="ged-f-type">${typeOptions}</select></div>
            </div>
            <div class="ged-form-row">
              <div class="ged-form-field"><label>Obligatoire</label><select id="ged-f-obl"><option value="1" ${existing?.obligatoire !== false ? 'selected' : ''}>Oui</option><option value="0" ${existing?.obligatoire === false ? 'selected' : ''}>Non</option></select></div>
              <div class="ged-form-field"><label>Secteur féminin uniquement</label><select id="ged-f-fem"><option value="0" ${!existing?.secteurFeminin ? 'selected' : ''}>Non</option><option value="1" ${existing?.secteurFeminin ? 'selected' : ''}>Oui</option></select></div>
            </div>
            <div class="ged-form-field"><label>Loi / texte réglementaire de référence</label><input id="ged-f-ref" value="${esc(existing?.texteReference)}" placeholder="Ex : Loi n°XX/2020"></div>
            <div class="ged-form-row">
              <div class="ged-form-field"><label>Version</label><input id="ged-f-ver" value="${esc(existing?.version || '1')}"></div>
              <div class="ged-form-field"><label>Date d'entrée en vigueur</label><input type="date" id="ged-f-date" value="${existing?.dateEntreeVigueur ? new Date(existing.dateEntreeVigueur.toDate ? existing.dateEntreeVigueur.toDate() : existing.dateEntreeVigueur).toISOString().slice(0, 10) : ''}"></div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-primary" onclick="GEDCatalogue.saveEntry('${existing ? esc(existing.id) : ''}','${esc(discipline)}')">💾 Enregistrer</button>
              <button class="btn btn-secondary" onclick="document.getElementById('ged-entry-modal').remove()">Annuler</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  async function saveEntry(entryId, discipline) {
    const data = {
      discipline,
      nom: document.getElementById('ged-f-nom').value.trim(),
      description: document.getElementById('ged-f-desc').value.trim(),
      categorie: document.getElementById('ged-f-cat').value,
      typeStructure: document.getElementById('ged-f-type').value,
      obligatoire: document.getElementById('ged-f-obl').value === '1',
      secteurFeminin: document.getElementById('ged-f-fem').value === '1',
      texteReference: document.getElementById('ged-f-ref').value.trim(),
      version: document.getElementById('ged-f-ver').value.trim() || '1',
      dateEntreeVigueur: document.getElementById('ged-f-date').value ? new Date(document.getElementById('ged-f-date').value) : null,
      statut: 'actif',
      updatedAt: new Date()
    };
    if (!data.nom) { alert('Le nom du document est requis.'); return; }

    try {
      const ref = catRef();
      if (!ref) return;
      if (entryId) {
        await ref.doc(entryId).update(data);
      } else {
        data.createdAt = new Date();
        await ref.add(data);
      }
      document.getElementById('ged-entry-modal')?.remove();
      await renderTreeInto(discipline);
    } catch (err) {
      alert('❌ Erreur enregistrement : ' + (err.message || err));
    }
  }

  async function toggleArchive(entryId, currentStatut) {
    const ref = catRef();
    if (!ref) return;
    await ref.doc(entryId).update({ statut: currentStatut === 'archive' ? 'actif' : 'archive' });
    const discipline = document.getElementById('ged-cat-discipline').value;
    await renderTreeInto(discipline);
  }

  async function deleteEntry(entryId) {
    if (!confirm('Supprimer définitivement cette définition de document du catalogue ? (les modèles/dépôts déjà liés resteront archivés dans l\'historique des structures)')) return;
    const ref = catRef();
    if (!ref) return;
    await ref.doc(entryId).delete();
    const discipline = document.getElementById('ged-cat-discipline').value;
    await renderTreeInto(discipline);
  }

  /* ══════════════════════════════════════════════════════════════════
   * IMPORT / REMPLACEMENT DU FICHIER MODÈLE (PDF/DOCX/XLSX)
   * ══════════════════════════════════════════════════════════════════ */
  function uploadModel(entryId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xlsx';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        if (!window.firebase || !window.firebase.storage) { alert('Firebase Storage non disponible'); return; }
        const entry = _catalogueCache.find(c => c.id === entryId) || {};
        const version = entry.version || '1';
        const path = `ged-modeles/${entryId}/v${version}_${Date.now()}_${file.name}`;
        const ref = window.firebase.storage().ref(path);
        const snapshot = await ref.put(file);
        const url = await snapshot.ref.getDownloadURL();

        const mRef = modelesRef();
        if (!mRef) return;
        const prevSnap = await mRef.doc(entryId).get();
        const prev = prevSnap.exists ? prevSnap.data() : null;
        const historique = prev ? (prev.historique || []).concat([{ version: prev.version, url: prev.url, fileName: prev.fileName, uploadedAt: prev.uploadedAt, uploadedBy: prev.uploadedBy, action: 'remplacé' }]) : [];

        await mRef.doc(entryId).set({
          url, fileName: file.name, size: file.size, version,
          uploadedAt: new Date(), uploadedBy: uid(), historique
        });

        alert('✅ Modèle importé');
        const discipline = document.getElementById('ged-cat-discipline').value;
        await renderTreeInto(discipline);
      } catch (err) {
        alert('❌ Erreur import : ' + (err.message || err));
      }
    };
    input.click();
  }

  /* ══════════════════════════════════════════════════════════════════
   * INJECTION UI — panneau ajouté en bas de #conformite
   * ══════════════════════════════════════════════════════════════════ */
  function injectPanel() {
    if (document.getElementById('ged-catalogue-panel')) return;
    const host = document.getElementById('conformite');
    if (!host) return;

    const panel = document.createElement('div');
    panel.id = 'ged-catalogue-panel';
    panel.className = 'dash-card ged-panel';
    panel.innerHTML = `
      <div class="dash-card-title">📚 Gestion Électronique des Documents — Catalogue &amp; Modèles Officiels</div>
      <p class="ged-panel-sub">Bibliothèque administrée par discipline, type de structure et catégorie. Import, remplacement, versions et archivage des modèles téléchargeables par les structures.</p>
      ${renderCatalogueTree()}
    `;
    host.appendChild(panel);

    const sel = document.getElementById('ged-cat-discipline');
    sel.addEventListener('change', () => renderTreeInto(sel.value));
    renderTreeInto(sel.value);
  }

  function boot() {
    const target = document.getElementById('conformite');
    if (target) { injectPanel(); return; }
    const obs = new MutationObserver(() => {
      if (document.getElementById('conformite')) { injectPanel(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.GEDCatalogue = {
    loadCatalogue, getCatalogueSync, getCatalogueForStructure, computeGedBadge,
    openEntryForm, saveEntry, toggleArchive, deleteEntry, uploadModel,
    renderTreeInto
  };

})(window);
