/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC-STRUCTURES-INFRASTRUCTURES.JS — Module Infrastructures
 *  Gabon Sport Connect · Module 4/7 · 2026
 *
 *  Gestion des installations sportives (stades, terrains, salles, etc.)
 *  avec galeries photos, aperçus, affichage plein écran, historisation.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const D = () => window.GSCDisciplines;

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function uid() { return 'i' + Math.random().toString(36).slice(2, 9); }

  /* État interne : structure actuellement ouverte dans la galerie/modale.
     Défini par GSCInfrastructureModule.setCurrentStructure(id) avant tout
     appel d'upload/suppression, appelé par admin-structures-section.html. */
  let _currentStructureId = null;

  /* ══════════════════════════════════════════════════════════════════
   * 1. MODÈLE INFRASTRUCTURE
   * ══════════════════════════════════════════════════════════════════ */
  function getInfraRef(structureId) {
    if (!window.db) return null;
    return window.db.collection('structuresSportives').doc(structureId).collection('infrastructures');
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. RENDU GALERIE — VUE ADMIN
   * ══════════════════════════════════════════════════════════════════ */
  function renderInfrastructureGallery(infrastructures) {
    if (!Array.isArray(infrastructures) || infrastructures.length === 0) {
      return '<p style="text-align:center;color:var(--gray-txt);padding:20px;">Aucune infrastructure ajoutée.</p>';
    }

    const cards = infrastructures.map(infra => {
      const photos = Array.isArray(infra.photos) ? infra.photos : [];
      const mainPhoto = photos.length > 0 ? photos[0].url : null;
      const photoCount = photos.length;

      return `
        <div class="ph-actor-card">
          <div class="ph-photo-zone" onclick="GSCInfrastructureModule.openGallery('${esc(infra.id)}','${esc(infra.nom)}')">
            ${mainPhoto ? `<img src="${esc(mainPhoto)}" style="width:100%;height:100%;object-fit:cover;" alt="">` : '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--gray-txt);font-size:32px;">📷</div>'}
            <div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);color:#fff;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;">
              ${photoCount} photo${photoCount !== 1 ? 's' : ''}
            </div>
          </div>
          <div class="ph-info">
            <div class="ph-name">${esc(infra.nom)}</div>
            <div class="ph-role" style="text-transform:none;margin-bottom:6px;">${esc(infra.type)}</div>
            <p style="font-size:11px;color:var(--gray-txt);margin-bottom:8px;line-height:1.4;">
              ${esc((infra.description || '').substring(0, 60))}${(infra.description || '').length > 60 ? '...' : ''}
            </p>
            <div class="ph-actions">
              <button class="ph-btn upload" onclick="event.stopPropagation();GSCInfrastructureModule.openGallery('${esc(infra.id)}','${esc(infra.nom)}')">🖼️ Galerie</button>
              <button class="ph-btn remove" onclick="event.stopPropagation();GSCInfrastructureModule.deleteInfra('${esc(infra.id)}')">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;">
        ${cards}
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. GALERIE MODALE
   * ══════════════════════════════════════════════════════════════════ */
  function renderGalleryModal(infraId, infraName, photos) {
    if (!Array.isArray(photos)) photos = [];

    const photoGrid = photos.map((p, idx) => `
      <div style="position:relative;aspect-ratio:1/1;border-radius:10px;overflow:hidden;background:#f0f0f0;cursor:pointer;"
           onclick="GSCInfrastructureModule.openFullscreen('${esc(infraId)}',${idx})">
        <img src="${esc(p.url)}" style="width:100%;height:100%;object-fit:cover;" alt="">
        <div style="position:absolute;top:4px;right:4px;">
          <button class="btn-sm" onclick="event.stopPropagation();GSCInfrastructureModule.deletePhoto('${esc(infraId)}',${idx})">✕</button>
        </div>
      </div>
    `).join('');

    const html = `
      <div class="modal-overlay open" id="gallery-modal" onclick="this.classList.remove('open')">
        <div class="modal" style="max-width:90%;max-height:90vh;overflow-y:auto;" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">${esc(infraName)}</div>
              <div class="modal-subtitle">Galerie photos (${photos.length})</div>
            </div>
            <button class="modal-close" onclick="document.getElementById('gallery-modal').classList.remove('open')">✕</button>
          </div>
          <div class="modal-content">
            <div style="margin-bottom:16px;">
              <button class="btn-add" onclick="GSCInfrastructureModule.uploadPhoto('${esc(infraId)}')">
                ➕ Ajouter photo
              </button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">
              ${photoGrid || '<p style="grid-column:1/-1;text-align:center;color:var(--gray-txt);">Aucune photo</p>'}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. AFFICHAGE PLEIN ÉCRAN
   * ══════════════════════════════════════════════════════════════════ */
  function openFullscreen(infraId, photoIndex) {
    // Simple lightbox en plein écran
    const html = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;align-items:center;justify-content:center;"
           id="fullscreen-view" onclick="this.remove()">
        <div style="position:relative;width:90%;height:90%;display:flex;align-items:center;justify-content:center;">
          <img id="fullscreen-img" src="" style="max-width:100%;max-height:100%;object-fit:contain;">
          <button style="position:absolute;top:20px;right:20px;background:#fff;color:#000;border:none;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:20px;font-weight:700;"
                  onclick="document.getElementById('fullscreen-view').remove()">✕</button>
          <button style="position:absolute;left:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.3);color:#fff;border:none;padding:12px 16px;cursor:pointer;font-size:20px;border-radius:6px;"
                  onclick="event.stopPropagation();GSCInfrastructureModule.prevPhoto('${esc(infraId)}')">◀</button>
          <button style="position:absolute;right:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.3);color:#fff;border:none;padding:12px 16px;cursor:pointer;font-size:20px;border-radius:6px;"
                  onclick="event.stopPropagation();GSCInfrastructureModule.nextPhoto('${esc(infraId)}')">▶</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. UPLOAD PHOTOS
   * ══════════════════════════════════════════════════════════════════ */
  async function uploadPhotoInternal(infraId, structureId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      try {
        const refs = window.firebase && window.firebase.storage && window.firebase.storage();
        if (!refs) {
          alert('Firebase Storage non disponible');
          return;
        }

        for (const file of files) {
          const path = `structures/${structureId}/infrastructures/${infraId}/${uid()}_${file.name}`;
          const ref = refs.ref(path);
          const snapshot = await ref.put(file);
          const url = await snapshot.ref.getDownloadURL();

          const infraRef = getInfraRef(structureId);
          if (infraRef) {
            await infraRef.doc(infraId).update({
              photos: window.firebase.firestore.FieldValue.arrayUnion({
                url,
                uploadedAt: new Date(),
                fileName: file.name
              })
            });
          }
        }

        alert('✅ Photo(s) uploadée(s)');
        location.reload();
      } catch (err) {
        console.error('Upload erreur:', err);
        alert('❌ Erreur: ' + (err.message || err));
      }
    };
    input.click();
  }

  async function deletePhoto(infraId, photoIndex) {
    if (!confirm('Supprimer cette photo ?')) return;

    try {
      const infraRef = getInfraRef(_currentStructureId);
      if (infraRef) {
        const doc = await infraRef.doc(infraId).get();
        const photos = (doc.data().photos || []).filter((_, i) => i !== photoIndex);
        await infraRef.doc(infraId).update({ photos });
        alert('✅ Photo supprimée');
        location.reload();
      }
    } catch (err) {
      console.error('Delete erreur:', err);
      alert('❌ Erreur suppression');
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 6. GESTION INFRASTRUCTURES (CRUD)
   * ══════════════════════════════════════════════════════════════════ */
  async function createInfrastructure(structureId, data) {
    try {
      const infraRef = getInfraRef(structureId);
      if (infraRef) {
        const id = uid();
        await infraRef.doc(id).set({
          id,
          nom: data.nom || 'Sans nom',
          type: data.type || 'Autre',
          description: data.description || '',
          capacite: data.capacite || 0,
          adresse: data.adresse || '',
          photos: [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return id;
      }
    } catch (err) {
      console.error('Create infra erreur:', err);
      throw err;
    }
  }

  async function deleteInfra(infraId) {
    if (!confirm('Supprimer cette infrastructure ?')) return;

    try {
      const infraRef = getInfraRef(_currentStructureId);
      if (infraRef) {
        await infraRef.doc(infraId).delete();
        alert('✅ Infrastructure supprimée');
        location.reload();
      }
    } catch (err) {
      console.error('Delete infra erreur:', err);
      alert('❌ Erreur suppression');
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 7. RENDU FORMULAIRE CRÉATION
   * ══════════════════════════════════════════════════════════════════ */
  function renderInfraForm(discipline) {
    const types = D().getInfrastructures(discipline);
    const typeOptions = types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');

    return `
      <div class="modal-overlay open" id="infra-form-modal" onclick="this.classList.remove('open')">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">Ajouter une infrastructure</div>
            <button class="modal-close" onclick="document.getElementById('infra-form-modal').classList.remove('open')">✕</button>
          </div>
          <div class="modal-content">
            <div class="grid2">
              <div class="field">
                <label>Nom</label>
                <input type="text" id="infra-nom" placeholder="Ex: Stade Omnisports">
              </div>
              <div class="field">
                <label>Type</label>
                <select id="infra-type">${typeOptions}</select>
              </div>
            </div>
            <div class="field">
              <label>Description</label>
              <input type="text" id="infra-desc" placeholder="Détails, caractéristiques…">
            </div>
            <div class="grid2">
              <div class="field">
                <label>Capacité (places)</label>
                <input type="number" id="infra-capacite" min="0" placeholder="2000">
              </div>
              <div class="field">
                <label>Adresse</label>
                <input type="text" id="infra-adresse" placeholder="Localisation">
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-primary" onclick="GSCInfrastructureModule.saveInfra()">💾 Ajouter</button>
              <button class="btn btn-secondary" onclick="document.getElementById('infra-form-modal').classList.remove('open')">Annuler</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 8. EXPORT PUBLIC API
   * ══════════════════════════════════════════════════════════════════ */
  async function openGallery(infraId, infraName) {
    let photos = [];
    try {
      if (_currentStructureId) {
        const ref = getInfraRef(_currentStructureId);
        if (ref) {
          const doc = await ref.doc(infraId).get();
          photos = (doc.exists && doc.data().photos) || [];
        }
      }
    } catch (err) {
      console.error('[InfrastructureModule] openGallery erreur:', err);
    }
    renderGalleryModal(infraId, infraName, photos);
  }

  window.GSCInfrastructureModule = {
    renderInfrastructureGallery,
    renderInfraForm,
    renderGalleryModal,
    setCurrentStructure(id) { _currentStructureId = id; },
    getCurrentStructure() { return _currentStructureId; },
    openGallery,
    openFullscreen,
    uploadPhoto(infraId) { return uploadPhotoInternal(infraId, _currentStructureId); },
    deletePhoto,
    deleteInfra,
    createInfrastructure,
    prevPhoto() { console.log('prev'); },
    nextPhoto() { console.log('next'); },
    saveInfra() {
      const nom = document.getElementById('infra-nom').value;
      const type = document.getElementById('infra-type').value;
      const desc = document.getElementById('infra-desc').value;
      const cap = document.getElementById('infra-capacite').value;
      const addr = document.getElementById('infra-adresse').value;

      if (!_currentStructureId) {
        alert('❌ Aucune structure sélectionnée. Sélectionnez d\'abord une structure avant d\'ajouter une infrastructure.');
        return;
      }
      if (!nom || !nom.trim()) {
        alert('❌ Le nom de l\'infrastructure est obligatoire.');
        return;
      }

      createInfrastructure(_currentStructureId, { nom, type, description: desc, capacite: cap, adresse: addr })
        .then(() => { alert('✅ Infrastructure ajoutée'); location.reload(); })
        .catch((err) => alert('❌ Erreur : ' + (err && err.message ? err.message : 'échec de l\'enregistrement')));
    }
  };

  // Signale que le module est prêt : permet aux écrans admin d'attendre
  // son chargement au lieu de planter si le <script> se termine après eux.
  try { document.dispatchEvent(new CustomEvent('gsc-infrastructure-module-ready')); } catch (e) { /* no-op */ }

})();
