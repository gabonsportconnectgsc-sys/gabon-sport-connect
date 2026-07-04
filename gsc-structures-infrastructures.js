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
          lat: data.lat ?? null,
          lng: data.lng ?? null,
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
   * 6bis. GÉOLOCALISATION — GPS natif, lien Google Maps / WhatsApp
   * ══════════════════════════════════════════════════════════════════ */
  function setInfraGeoHint(msg, isError) {
    const el = document.getElementById('infra-geo-hint');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? '#dc2626' : 'var(--gray-txt)';
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setInfraGeoHint('⚠️ Géolocalisation non disponible sur cet appareil/navigateur.', true); return; }
    setInfraGeoHint('📡 Récupération de la position en cours…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latEl = document.getElementById('infra-lat');
        const lngEl = document.getElementById('infra-lng');
        if (latEl) latEl.value = pos.coords.latitude.toFixed(6);
        if (lngEl) lngEl.value = pos.coords.longitude.toFixed(6);
        setInfraGeoHint('✅ Position GPS récupérée et remplie automatiquement.');
      },
      (err) => setInfraGeoHint('❌ Impossible de récupérer la position : ' + (err.message || 'accès refusé.'), true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Même logique que pour les structures : accepte les liens Google Maps classiques
  // et les liens que WhatsApp affiche/génère lors du partage d'une position.
  function extractLatLngFromLink() {
    const link = document.getElementById('infra-maps-link')?.value?.trim() || '';
    if (!link) { setInfraGeoHint('⚠️ Collez d\'abord un lien Google Maps ou WhatsApp.', true); return; }
    const m = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      || link.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
      || link.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
      || link.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (!m) {
      setInfraGeoHint('⚠️ Coordonnées introuvables dans ce lien. Si c\'est un lien court (maps.app.goo.gl ou lien WhatsApp raccourci), ouvrez-le d\'abord dans le navigateur puis collez l\'adresse complète qui s\'affiche.', true);
      return;
    }
    const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
    const latEl = document.getElementById('infra-lat');
    const lngEl = document.getElementById('infra-lng');
    if (latEl) latEl.value = lat;
    if (lngEl) lngEl.value = lng;
    setInfraGeoHint(`✅ Coordonnées extraites du lien : ${lat}, ${lng}`);
  }

  function openInMaps() {
    const lat = document.getElementById('infra-lat')?.value;
    const lng = document.getElementById('infra-lng')?.value;
    if (!lat || !lng) { setInfraGeoHint('⚠️ Renseignez d\'abord la latitude/longitude (ou utilisez le GPS).', true); return; }
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }

  function shareLocationWhatsApp() {
    const lat = document.getElementById('infra-lat')?.value;
    const lng = document.getElementById('infra-lng')?.value;
    if (!lat || !lng) { setInfraGeoHint('⚠️ Renseignez d\'abord la latitude/longitude (ou utilisez le GPS).', true); return; }
    const nom = document.getElementById('infra-nom')?.value?.trim() || 'Infrastructure GSC';
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const text = encodeURIComponent(`📍 ${nom} — Localisation : ${mapsUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
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
            <div class="grid2">
              <div class="field">
                <label>Latitude GPS</label>
                <input type="number" id="infra-lat" step="any" placeholder="ex: 0.4162">
              </div>
              <div class="field">
                <label>Longitude GPS</label>
                <input type="number" id="infra-lng" step="any" placeholder="ex: 9.4673">
              </div>
            </div>
            <div class="field" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-top:4px;">
              <label>📍 Localisation rapide</label>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0;">
                <button type="button" class="btn-sm" onclick="GSCInfrastructureModule.useMyLocation()">📡 Utiliser ma position GPS</button>
                <button type="button" class="btn-sm" onclick="GSCInfrastructureModule.openInMaps()">🗺️ Voir sur Google Maps</button>
                <button type="button" class="btn-sm" onclick="GSCInfrastructureModule.shareLocationWhatsApp()">💬 Partager via WhatsApp</button>
              </div>
              <div style="display:flex;gap:8px;">
                <input type="text" id="infra-maps-link" placeholder="Coller un lien Google Maps ou WhatsApp (localisation partagée)…" style="flex:1;">
                <button type="button" class="btn-sm" onclick="GSCInfrastructureModule.extractLatLngFromLink()">Extraire</button>
              </div>
              <div id="infra-geo-hint" style="font-size:11px;color:var(--gray-txt);margin-top:6px;">Astuce : sur WhatsApp, partagez la position du lieu, copiez le lien Google Maps généré, puis collez-le ci-dessus.</div>
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
    useMyLocation, extractLatLngFromLink, openInMaps, shareLocationWhatsApp,
    saveInfra() {
      const nom = document.getElementById('infra-nom').value;
      const type = document.getElementById('infra-type').value;
      const desc = document.getElementById('infra-desc').value;
      const cap = document.getElementById('infra-capacite').value;
      const addr = document.getElementById('infra-adresse').value;
      const lat = document.getElementById('infra-lat')?.value;
      const lng = document.getElementById('infra-lng')?.value;

      if (!_currentStructureId) {
        alert('❌ Aucune structure sélectionnée. Sélectionnez d\'abord une structure avant d\'ajouter une infrastructure.');
        return;
      }
      if (!nom || !nom.trim()) {
        alert('❌ Le nom de l\'infrastructure est obligatoire.');
        return;
      }

      createInfrastructure(_currentStructureId, {
        nom, type, description: desc, capacite: cap, adresse: addr,
        lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null
      })
        .then(() => { alert('✅ Infrastructure ajoutée'); location.reload(); })
        .catch((err) => alert('❌ Erreur : ' + (err && err.message ? err.message : 'échec de l\'enregistrement')));
    }
  };

  // Signale que le module est prêt : permet aux écrans admin d'attendre
  // son chargement au lieu de planter si le <script> se termine après eux.
  try { document.dispatchEvent(new CustomEvent('gsc-infrastructure-module-ready')); } catch (e) { /* no-op */ }

})();
