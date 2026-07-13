/**
 * ══════════════════════════════════════════════════════════════════════
 *  STRUCTURES-PUBLIC-VIEW.JS — Annuaire public des structures sportives
 *  Gabon Sport Connect · Intégration index.html · 2026
 *
 *  ⚠️ SYNTAXE FIREBASE MODULAIRE (pas compat) — aligné sur index.html qui
 *  expose window.collection, window.getDocs, window.query, window.where,
 *  window.doc, window.getDoc, window.onSnapshot (voir bloc <script type=
 *  "module"> de index.html, ligne ~2789).
 *
 *  Collection dédiée : 'structuresSportives' (distincte de 'sitesSportifs'
 *  qui reste réservée à la carte des sites/stades existante — aucune
 *  collision, aucune donnée existante touchée).
 *
 *  Dépendances (déjà présentes dans index.html ou livrées avec ce module,
 *  sans logique Firebase propre donc réutilisables telles quelles) :
 *    - disciplines-config.js       → window.GSCDisciplines
 *    - disciplines-config-adapter.js
 *    - structures-profile-engine.js → window.GSCStructureProfile
 *      (renderFullProfile appelé ici avec viewerRole='public' : le roster
 *      nominatif des mineurs reste masqué, seuls les effectifs agrégés
 *      par catégorie sont visibles — comportement hérité, non modifié)
 *
 *  Lecture seule : aucune écriture Firestore depuis ce module. La création/
 *  édition reste réservée à l'admin (admin.html + structures-manager.js).
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const COLLECTION = 'structuresSportives';
  let _structures = [];
  let _currentFilter = 'all';
  let _currentSearch = '';
  let _currentFeminineOnly = false;
  let _unsub = null;

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function D() { return window.GSCDisciplines; }
  function P() { return window.GSCStructureProfile; }

  /* ══════════════════════════════════════════════════════════════════
   * 1. CHARGEMENT (temps réel si possible, sinon lecture ponctuelle)
   * ══════════════════════════════════════════════════════════════════ */
  async function load() {
    if (!window.db || !window.collection) {
      console.warn('[StructuresPublicView] Firebase modulaire indisponible — nouvelle tentative après firebase-ready');
      document.addEventListener('firebase-ready', load, { once: true });
      return;
    }
    try {
      if (typeof window.onSnapshot === 'function' && !_unsub) {
        const ref = window.collection(window.db, COLLECTION);
        _unsub = window.onSnapshot(ref, (snap) => {
          _structures = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(isVisible);
          render();
        }, (err) => {
          console.error('[StructuresPublicView] onSnapshot erreur:', err);
          loadOnce();
        });
      } else {
        await loadOnce();
      }
    } catch (err) {
      console.error('[StructuresPublicView] load() erreur:', err);
      await loadOnce();
    }
  }

  // Une structure est visible publiquement tant qu'elle n'est pas explicitement
  // archivée/désactivée. Avant, seul status === 'active' était accepté, ce qui
  // masquait toute structure créée sans ce champ (désynchro avec l'admin, qui
  // affiche TOUTES les structures sans ce filtre). On aligne donc le public
  // sur l'admin : tout ce qui n'est pas 'archived'/'inactive'/'disabled' compte.
  function isVisible(s) {
    const st = (s.status || 'active').toLowerCase();
    return st !== 'archived' && st !== 'inactive' && st !== 'disabled' && st !== 'deleted';
  }

  async function loadOnce() {
    try {
      const ref = window.collection(window.db, COLLECTION);
      const snap = await window.getDocs(ref);
      _structures = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(isVisible);
      render();
    } catch (err) {
      console.error('[StructuresPublicView] loadOnce() erreur:', err);
      const el = document.getElementById('structures-public-list');
      if (el) el.innerHTML = '<div class="empty-state"><h3>Chargement impossible</h3><p>Réessayez plus tard.</p></div>';
    }
  }

  async function getOne(id) {
    try {
      const ref = window.doc(window.db, COLLECTION, id);
      const snap = await window.getDoc(ref);
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (err) {
      console.error('[StructuresPublicView] getOne() erreur:', err);
      return null;
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. FILTRES / RECHERCHE
   * ══════════════════════════════════════════════════════════════════ */
  function filterByDiscipline(discipline, btn) {
    _currentFilter = discipline;
    document.querySelectorAll('#structures-public-filters [data-pub-filter]').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    render();
  }

  function search(query) {
    _currentSearch = (query || '').toLowerCase();
    render();
  }

  /* Effectif féminin (saison en cours) d'une structure — même modèle de
     données que structures-form-builder.js / structures-manager.js :
     s.saisons[saison].effectifs.femmes. */
  function feminineCount(s) {
    const saison = s.saisonCourante || (P() ? P().getCurrentSeasonLabel() : '');
    const saisonData = (s.saisons && s.saisons[saison]) || {};
    return (saisonData.effectifs && saisonData.effectifs.femmes) || 0;
  }

  function setFeminineOnly(active) {
    _currentFeminineOnly = !!active;
    render();
  }

  function isFeminineOnly() { return _currentFeminineOnly; }

  function initFilters() {
    const container = document.getElementById('structures-public-filters');
    if (!container || !D()) return;
    container.innerHTML = `
      <button class="site-filter-btn active" data-pub-filter="all" onclick="GSCPublicStructures.filterByDiscipline('all', this)">🏅 Toutes</button>
      ${D().list().map(d => `
        <button class="site-filter-btn" data-pub-filter="${esc(d)}" onclick="GSCPublicStructures.filterByDiscipline('${esc(d)}', this)">
          ${D().getIcon(d)} ${esc(d)}
        </button>
      `).join('')}
    `;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. RENDU — LISTE
   * ══════════════════════════════════════════════════════════════════ */
  function render() {
    const container = document.getElementById('structures-public-list');
    const countEl = document.getElementById('structures-public-count');
    if (!container) return;

    let list = _structures.slice();
    if (_currentFilter !== 'all') list = list.filter(s => s.discipline === _currentFilter);
    if (_currentSearch) {
      list = list.filter(s =>
        (s.nom || '').toLowerCase().includes(_currentSearch) ||
        (s.ville || '').toLowerCase().includes(_currentSearch) ||
        (s.type || '').toLowerCase().includes(_currentSearch)
      );
    }
    if (_currentFeminineOnly) list = list.filter(s => feminineCount(s) > 0);

    if (countEl) countEl.textContent = list.length ? `(${list.length})` : '';

    if (!list.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Aucune structure trouvée</h3>
          <p>${_currentFeminineOnly ? 'Aucune structure avec effectif féminin pour ces filtres.' : 'Modifiez vos filtres ou votre recherche.'}</p>
        </div>`;
      return;
    }

    container.innerHTML = list.map(s => {
      const icon = D() ? D().getIcon(s.discipline) : '🏅';
      const saison = s.saisonCourante || (P() ? P().getCurrentSeasonLabel() : '');
      const saisonData = (s.saisons && s.saisons[saison]) || {};
      const totals = P() ? P().computeEffectifsTotals(saisonData) : { total: 0 };
      const femmes = feminineCount(s);

      return `
        <div class="site-item" onclick="GSCPublicStructures.openDetail('${esc(s.id)}')" style="cursor:pointer;">
          ${s.logoUrl
            ? `<img src="${esc(s.logoUrl)}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
            : `<div class="site-icon-dot">${icon}</div>`
          }
          <div class="site-info">
            <div class="site-name">${esc(s.nom)}</div>
            <div class="site-meta">${esc(s.type)} · ${icon} ${esc(s.discipline)} · ${esc(s.ville) || '—'} · 👥 ${totals.total}${femmes > 0 ? ` · 🚺 ${femmes}` : ''}</div>
          </div>
          <button class="btn-sm" onclick="event.stopPropagation();GSCPublicStructures.openDetail('${esc(s.id)}')">Voir 📋</button>
        </div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. FICHE DÉTAIL (lecture publique — nominatif mineurs masqué)
   * ══════════════════════════════════════════════════════════════════ */
  async function openDetail(id) {
    const modal = document.getElementById('structure-public-modal');
    const body = document.getElementById('structure-public-modal-body');
    const title = document.getElementById('structure-public-modal-title');
    if (!modal || !body) return;

    body.innerHTML = '<div class="empty-state"><h3>Chargement…</h3></div>';
    modal.classList.add('open');

    const structure = await getOne(id);
    if (!structure) {
      body.innerHTML = '<div class="empty-state"><h3>Structure introuvable</h3></div>';
      return;
    }

    if (title) title.textContent = structure.nom || 'Fiche structure';

    if (P()) {
      const up = window.userProfile;
      const role = (up && up.role === 'admin') ? 'admin' : (up && up.structureId === id) ? 'manager' : 'public';
      body.innerHTML = P().renderFullProfile(structure, structure.saisonCourante, null, role);
    } else {
      body.innerHTML = '<p>Moteur de profil indisponible.</p>';
    }

    // Google Maps / WhatsApp (détection auto GPS + téléphone)
    if (window.GSCContactLinks) {
      body.insertAdjacentHTML('beforeend', window.GSCContactLinks.render(structure));
    }

    // Infrastructures (lecture seule, sous-collection)
    renderInfrastructuresReadOnly(id);
  }

  async function renderInfrastructuresReadOnly(structureId) {
    const el = document.getElementById('structure-public-modal-body');
    if (!el || !window.collection || !window.getDocs) return;
    try {
      const ref = window.collection(window.db, COLLECTION, structureId, 'infrastructures');
      const snap = await window.getDocs(ref);
      const infras = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!infras.length) return;

      const html = `
        <div class="adm-section">
          <div class="adm-section-title">🏗️ Infrastructures</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">
            ${infras.map(i => {
              const photo = (Array.isArray(i.photos) && i.photos[0]) ? i.photos[0].url : null;
              return `
                <div style="border-radius:10px;overflow:hidden;background:var(--gray-bg);">
                  <div style="aspect-ratio:1/1;overflow:hidden;cursor:pointer;" onclick="GSCPublicStructures.openFullscreenPhoto('${esc(photo || '')}')">
                    ${photo ? `<img src="${esc(photo)}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;">📷</div>'}
                  </div>
                  <div style="padding:6px 8px;font-size:11px;font-weight:700;">${esc(i.nom)}</div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
      el.insertAdjacentHTML('beforeend', html);
    } catch (err) {
      console.error('[StructuresPublicView] infrastructures erreur:', err);
    }
  }

  function openFullscreenPhoto(url) {
    if (!url) return;
    const html = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;"
           onclick="this.remove()">
        <img src="${esc(url)}" style="max-width:92%;max-height:92%;object-fit:contain;">
        <button style="position:absolute;top:20px;right:20px;background:#fff;border:none;width:40px;height:40px;border-radius:50%;font-size:18px;font-weight:700;cursor:pointer;"
                onclick="this.parentElement.remove()">✕</button>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function closeDetail() {
    // Réutilise le helper global closeModal(id) déjà défini dans index.html
    if (typeof window.closeModal === 'function') {
      window.closeModal('structure-public-modal');
    } else {
      const modal = document.getElementById('structure-public-modal');
      if (modal) modal.classList.remove('open');
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. INTÉGRATION NON DESTRUCTIVE AVEC showView() EXISTANTE
   * ══════════════════════════════════════════════════════════════════ */
  function hookNavigation() {
    if (typeof window.showView !== 'function') {
      console.warn('[StructuresPublicView] showView() introuvable — nouvelle tentative dans 1s');
      setTimeout(hookNavigation, 1000);
      return;
    }
    const _origShowView = window.showView;
    window.showView = function (name) {
      _origShowView(name);
      if (name === 'structures') {
        initFilters();
        load();
      }
    };
  }

  document.addEventListener('firebase-ready', function () {
    initFilters();
  });
  document.addEventListener('DOMContentLoaded', hookNavigation);

  /* ══════════════════════════════════════════════════════════════════
   * 6. EXPORT
   * ══════════════════════════════════════════════════════════════════ */
  window.GSCPublicStructures = {
    load, filterByDiscipline, search,
    setFeminineOnly, isFeminineOnly, feminineCount,
    openDetail, closeDetail, openFullscreenPhoto
  };

})(window);
