/**
 * ══════════════════════════════════════════════════════════════════════
 *  STRUCTURES-INFRASTRUCTURE-MODULE.JS — Infrastructures + galeries
 *  Gabon Sport Connect · Module 3/7 · 2026
 *
 *  Dépendances : disciplines-config.js, structures-manager.js,
 *  uploadToCloudinary() (défini dans index.html), CSS .photo-gallery /
 *  .gallery-item / .gallery-modal (déjà présent dans index.html/admin.html).
 *
 *  Modèle de données ajouté sur sitesSportifs/{id} :
 *    infrastructures: [
 *      { id, type, nom, description, photos:[url,...] }
 *    ]
 *
 *  Utilisation :
 *    GSCStructureInfra.init('infra-container', structure, structureId, sport, editable)
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const D = () => window.GSCDisciplines;

  const state = {
    containerId: null,
    structure: null,
    structureId: null,
    sport: null,
    editable: false,
    showAddPanel: false,
    // modale plein écran
    activeInfraId: null,
    activePhotoIdx: -1
  };

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function attr(s) { return (s || '').toString().replace(/"/g, '&quot;'); }
  function uid() { return 'infra_' + Math.random().toString(36).slice(2, 9); }

  /* ══════════════════════════════════════════════════════════════════
   * 1. PERSISTENCE
   * ══════════════════════════════════════════════════════════════════ */
  async function persist() {
    if (!window.structuresManager) throw new Error('structuresManager indisponible');
    await window.structuresManager.update(state.structureId, {
      infrastructures: state.structure.infrastructures || []
    });
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. RENDU PRINCIPAL
   * ══════════════════════════════════════════════════════════════════ */
  function init(containerId, structure, structureId, sport, editable) {
    state.containerId = containerId;
    state.structure = structure;
    state.structureId = structureId;
    state.sport = sport || structure.discipline || 'Football';
    state.editable = !!editable;
    structure.infrastructures = structure.infrastructures || [];
    render();
  }

  function render() {
    const el = document.getElementById(state.containerId);
    if (!el) return;
    const list = state.structure.infrastructures || [];

    const cards = list.map(infra => renderInfraCard(infra)).join('');
    const empty = !list.length
      ? `<p style="font-size:12px;color:var(--gray-txt);">Aucune infrastructure renseignée.</p>` : '';

    const addBtn = state.editable
      ? `<button type="button" class="btn-sm" onclick="GSCStructureInfra.toggleAddPanel()">+ Ajouter une infrastructure</button>`
      : '';
    const addPanel = state.editable && state.showAddPanel ? renderAddPanel() : '';

    el.innerHTML = `
      <div class="adm-section">
        <div class="adm-section-title">🏗️ Infrastructures</div>
        ${empty}
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">${cards}</div>
        ${addBtn}
        ${addPanel}
      </div>`;
  }

  function renderInfraCard(infra) {
    const photos = infra.photos || [];
    const thumbs = photos.map((url, i) => `
      <div class="gallery-item" onclick="GSCStructureInfra.openPhotoModal('${attr(infra.id)}',${i})">
        <img src="${attr(url)}" alt="${attr(infra.nom)}" loading="lazy">
      </div>`).join('');
    const addPhotoBtn = state.editable ? `
      <div class="gallery-item gallery-add" onclick="document.getElementById('infra-upload-${attr(infra.id)}').click()" title="Ajouter une photo">📷</div>
      <input type="file" id="infra-upload-${attr(infra.id)}" accept="image/*" multiple style="display:none;" onchange="GSCStructureInfra.uploadPhotos('${attr(infra.id)}',this)">
    ` : '';
    const editControls = state.editable ? `
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button type="button" class="btn-sm" onclick="GSCStructureInfra.editInfra('${attr(infra.id)}')">✏️ Modifier</button>
        <button type="button" class="btn-icon-danger" onclick="GSCStructureInfra.removeInfra('${attr(infra.id)}')">🗑️</button>
      </div>` : '';

    return `
      <div class="card" style="padding:14px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div>
            <div style="font-weight:700;font-size:14px;">${D().getIcon(state.sport)} ${esc(infra.nom)}</div>
            <div style="font-size:11px;color:var(--gray-txt);">${esc(infra.type)}</div>
          </div>
        </div>
        ${infra.description ? `<p style="font-size:12px;margin-top:6px;">${esc(infra.description)}</p>` : ''}
        <div class="photo-gallery" style="margin-top:10px;">${thumbs}${addPhotoBtn}</div>
        ${editControls}
      </div>`;
  }

  function renderAddPanel(existingInfra) {
    const types = D().getInfrastructureTypes(state.sport);
    const isEdit = !!existingInfra;
    const opts = types.map(t => `<option value="${attr(t)}" ${existingInfra && existingInfra.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('');
    return `
      <div class="form-section" id="infra-add-panel" style="border:1px dashed var(--gray-bd);border-radius:10px;padding:12px;margin-top:10px;">
        <div class="form-group"><label>Type d'infrastructure</label>
          <select id="infra-f-type">${opts}</select></div>
        <div class="form-group"><label>Nom</label>
          <input type="text" id="infra-f-nom" value="${attr(existingInfra ? existingInfra.nom : '')}" placeholder="Stade principal, Terrain B…"></div>
        <div class="form-group"><label>Description</label>
          <textarea id="infra-f-desc" rows="2" placeholder="État, équipements, capacité…">${esc(existingInfra ? existingInfra.description : '')}</textarea></div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn-cancel" onclick="GSCStructureInfra.toggleAddPanel()">Annuler</button>
          <button type="button" class="btn-save" onclick="GSCStructureInfra.${isEdit ? `saveEditInfra('${attr(existingInfra.id)}')` : 'saveNewInfra()'}">${isEdit ? '💾 Enregistrer' : '➕ Ajouter'}</button>
        </div>
      </div>`;
  }

  function toggleAddPanel() {
    state.showAddPanel = !state.showAddPanel;
    render();
  }

  function editInfra(infraId) {
    const infra = (state.structure.infrastructures || []).find(i => i.id === infraId);
    if (!infra) return;
    const el = document.getElementById(state.containerId);
    const existingPanel = document.getElementById('infra-add-panel');
    if (existingPanel) existingPanel.remove();
    el.insertAdjacentHTML('beforeend', renderAddPanel(infra));
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. CRUD INFRASTRUCTURE
   * ══════════════════════════════════════════════════════════════════ */
  async function saveNewInfra() {
    const type = document.getElementById('infra-f-type').value;
    const nom = document.getElementById('infra-f-nom').value.trim();
    const description = document.getElementById('infra-f-desc').value.trim();
    if (!nom) { window.toast ? toast('Le nom est requis.', 'error') : alert('Le nom est requis.'); return; }
    state.structure.infrastructures = state.structure.infrastructures || [];
    state.structure.infrastructures.push({ id: uid(), type, nom, description, photos: [] });
    try {
      await persist();
      state.showAddPanel = false;
      render();
      window.toast && toast('✅ Infrastructure ajoutée.', 'success');
    } catch (e) {
      window.toast ? toast('Erreur : ' + e.message, 'error') : alert(e.message);
    }
  }

  async function saveEditInfra(infraId) {
    const infra = (state.structure.infrastructures || []).find(i => i.id === infraId);
    if (!infra) return;
    infra.type = document.getElementById('infra-f-type').value;
    infra.nom = document.getElementById('infra-f-nom').value.trim();
    infra.description = document.getElementById('infra-f-desc').value.trim();
    try {
      await persist();
      render();
      window.toast && toast('✅ Infrastructure mise à jour.', 'success');
    } catch (e) {
      window.toast ? toast('Erreur : ' + e.message, 'error') : alert(e.message);
    }
  }

  async function removeInfra(infraId) {
    if (!confirm('Supprimer cette infrastructure et toutes ses photos ?')) return;
    state.structure.infrastructures = (state.structure.infrastructures || []).filter(i => i.id !== infraId);
    try {
      await persist();
      render();
      window.toast && toast('🗑️ Infrastructure supprimée.', 'info');
    } catch (e) {
      window.toast ? toast('Erreur : ' + e.message, 'error') : alert(e.message);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. GALERIE PHOTOS PAR INFRASTRUCTURE (upload Cloudinary)
   * ══════════════════════════════════════════════════════════════════ */
  async function uploadPhotos(infraId, inputEl) {
    if (typeof window.uploadToCloudinary !== 'function') {
      window.toast ? toast('⚠️ Upload indisponible.', 'error') : alert('Upload indisponible.');
      return;
    }
    const infra = (state.structure.infrastructures || []).find(i => i.id === infraId);
    if (!infra || !inputEl.files.length) return;
    const files = Array.from(inputEl.files).slice(0, 10);
    window.toast && toast('📤 Upload de ' + files.length + ' photo(s)…', 'info');
    const newUrls = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { window.toast && toast('Photo trop lourde (max 5 Mo) : ' + file.name, 'error'); continue; }
      try {
        const url = await window.uploadToCloudinary(file, 'image');
        newUrls.push(url);
      } catch (e) { window.toast && toast('Erreur upload : ' + e.message, 'error'); }
    }
    if (newUrls.length) {
      infra.photos = [...(infra.photos || []), ...newUrls];
      try {
        await persist();
        render();
        window.toast && toast('✅ ' + newUrls.length + ' photo(s) ajoutée(s).', 'success');
      } catch (e) {
        window.toast ? toast('Erreur : ' + e.message, 'error') : alert(e.message);
      }
    }
    inputEl.value = '';
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. APERÇU PLEIN ÉCRAN (modale dédiée, partagée entre toutes les cartes)
   * ══════════════════════════════════════════════════════════════════ */
  function openPhotoModal(infraId, idx) {
    const infra = (state.structure.infrastructures || []).find(i => i.id === infraId);
    if (!infra) return;
    const url = (infra.photos || [])[idx];
    if (!url) return;
    state.activeInfraId = infraId;
    state.activePhotoIdx = idx;
    const img = document.getElementById('infra-media-modal-img');
    const modal = document.getElementById('infra-media-modal');
    const toolbar = document.getElementById('infra-media-modal-toolbar');
    if (!img || !modal || !toolbar) return;
    img.src = url;
    toolbar.innerHTML = `
      <button class="gallery-modal-btn" onclick="GSCStructureInfra.downloadCurrentPhoto()">⬇️ Télécharger</button>
      ${state.editable ? `<button class="gallery-modal-btn danger" onclick="GSCStructureInfra.deleteCurrentPhoto()">🗑️ Supprimer</button>` : ''}
    `;
    modal.classList.add('open');
  }

  function closePhotoModal() {
    const modal = document.getElementById('infra-media-modal');
    const img = document.getElementById('infra-media-modal-img');
    if (modal) modal.classList.remove('open');
    if (img) img.src = '';
    state.activeInfraId = null;
    state.activePhotoIdx = -1;
  }

  function downloadCurrentPhoto() {
    const infra = (state.structure.infrastructures || []).find(i => i.id === state.activeInfraId);
    const url = infra && infra.photos && infra.photos[state.activePhotoIdx];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = 'infrastructure-gsc.jpg'; a.target = '_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  async function deleteCurrentPhoto() {
    if (!confirm('Supprimer cette photo ?')) return;
    const infra = (state.structure.infrastructures || []).find(i => i.id === state.activeInfraId);
    if (!infra) return;
    infra.photos.splice(state.activePhotoIdx, 1);
    try {
      await persist();
      closePhotoModal();
      render();
      window.toast && toast('🗑️ Photo supprimée.', 'info');
    } catch (e) {
      window.toast ? toast('Erreur : ' + e.message, 'error') : alert(e.message);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 6. EXPOSITION GLOBALE
   * ══════════════════════════════════════════════════════════════════ */
  window.GSCStructureInfra = {
    init, render,
    toggleAddPanel, editInfra,
    saveNewInfra, saveEditInfra, removeInfra,
    uploadPhotos,
    openPhotoModal, closePhotoModal,
    downloadCurrentPhoto, deleteCurrentPhoto
  };

})(window);
