/**
 * ══════════════════════════════════════════════════════════════════════
 *  GED-INSCRIPTION-PREVIEW.JS — Aperçu des documents requis à l'inscription
 *  Gabon Sport Connect · 2026
 *
 *  Pendant l'inscription d'un club/association/fédération (inscription.html),
 *  affiche — dès que la discipline et le type de structure sont choisis —
 *  la liste des documents requis (catalogue GED) et les modèles officiels
 *  téléchargeables, pour que la personne puisse les préparer/télécharger
 *  avant même la création du compte.
 *
 *  Lecture Firestore via l'API REST publique (`ged_catalogue`/`ged_modeles`
 *  ont `allow read: if true`) : aucune dépendance au SDK modulaire chargé
 *  en interne par inscription.html (variables non exposées sur window).
 *  Module 100% autonome, additif — n'édite pas inscription.html au-delà
 *  d'une balise <script>.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const PROJECT_ID = 'gabon-sport-connect';
  const REST_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

  const ROLE_TO_TYPE = { club: 'Club', association: 'Association', federation: 'Fédération', organisateur: 'tous' };
  const CATEGORIES = { administratif: '📋 Administratif', juridique: '⚖️ Juridique', financier: '💰 Financier', sportif: '🏆 Sportif' };

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ── Décodage minimal du format REST Firestore (fields typés) ────── */
  function decodeValue(v) {
    if (v == null) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('integerValue' in v) return parseInt(v.integerValue, 10);
    if ('doubleValue' in v) return v.doubleValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    return null;
  }
  function decodeDoc(doc) {
    const out = { id: doc.name.split('/').pop() };
    Object.entries(doc.fields || {}).forEach(([k, v]) => { out[k] = decodeValue(v); });
    return out;
  }

  async function fetchCollection(name) {
    try {
      const res = await fetch(`${REST_BASE}/${name}?pageSize=300`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.documents || []).map(decodeDoc);
    } catch (e) {
      console.warn('[GEDInscriptionPreview] lecture impossible :', name, e);
      return [];
    }
  }

  let _catalogueCache = null;
  let _modelesCache = null;

  async function loadAll() {
    if (!_catalogueCache) _catalogueCache = await fetchCollection('ged_catalogue');
    if (!_modelesCache) {
      const list = await fetchCollection('ged_modeles');
      _modelesCache = {};
      list.forEach(m => { _modelesCache[m.id] = m; });
    }
  }

  function renderPreview(discipline, typeStructure) {
    const entries = _catalogueCache.filter(c =>
      c.statut === 'actif' &&
      c.discipline === discipline &&
      (typeStructure === 'tous' || c.typeStructure === 'tous' || c.typeStructure === typeStructure)
    );
    if (!entries.length) {
      return '<p class="ged-pub-empty">Aucun document officiel référencé pour cette discipline pour le moment — vous pourrez déposer vos documents après validation de votre compte.</p>';
    }
    const byCat = {};
    entries.forEach(e => { byCat[e.categorie] = byCat[e.categorie] || []; byCat[e.categorie].push(e); });

    return Object.entries(byCat).map(([cat, list]) => {
      const rows = list.map(e => {
        const model = _modelesCache[e.id];
        return `
          <div class="ged-pub-doc-row">
            <div class="ged-pub-doc-info">
              <div class="ged-pub-doc-name">${esc(e.nom)} ${e.obligatoire ? '<span class="ged-req">Obligatoire</span>' : ''}</div>
              ${e.description ? `<div class="ged-pub-doc-desc">${esc(e.description)}</div>` : ''}
            </div>
            <div class="ged-pub-doc-side">
              ${model ? `<a class="btn-sm" href="${esc(model.url)}" target="_blank" rel="noopener">📄 Télécharger le modèle</a>` : '<span class="ged-empty">Aucun modèle disponible</span>'}
            </div>
          </div>
        `;
      }).join('');
      return `<div class="ged-pub-cat-block"><div class="ged-pub-cat-title">${CATEGORIES[cat] || cat}</div>${rows}</div>`;
    }).join('');
  }

  async function refresh() {
    const sportSel = document.getElementById('a-sport');
    const role = window._gedInscriptionSelectedRole;
    if (!sportSel || !role || !ROLE_TO_TYPE[role]) return;
    const discipline = sportSel.value;
    if (!discipline) return;

    const host = ensureHost();
    if (!host) return;
    host.style.display = '';
    host.innerHTML = '<p class="ged-pub-empty">Chargement des documents requis…</p>';
    await loadAll();
    host.innerHTML = `<div class="ged-pub-title">📚 Documents requis pour votre structure</div>${renderPreview(discipline, ROLE_TO_TYPE[role])}`;
  }

  function ensureHost() {
    let host = document.getElementById('ged-inscription-preview');
    if (host) return host;
    // Ancrage : juste après la notice "Ce profil décrit une structure…"
    const notices = document.querySelectorAll('.notice');
    let anchor = null;
    notices.forEach(n => { if (/structure/i.test(n.textContent) && !anchor) anchor = n; });
    if (!anchor) return null;
    host = document.createElement('div');
    host.id = 'ged-inscription-preview';
    host.className = 'ged-pub-standalone-card ged-pub-panel';
    host.style.display = 'none';
    anchor.insertAdjacentElement('afterend', host);
    return host;
  }

  /* ── Suivi du rôle choisi (pickRole) et de la discipline (#a-sport) ── */
  function patchPickRole() {
    if (typeof window.pickRole === 'function' && !window.pickRole._gedPatched) {
      const _orig = window.pickRole;
      window.pickRole = function (role, el) {
        const r = _orig.apply(this, arguments);
        window._gedInscriptionSelectedRole = role;
        setTimeout(refresh, 150); // laisse le temps au formulaire de s'afficher/adapter
        return r;
      };
      window.pickRole._gedPatched = true;
    }
  }

  function boot() {
    patchPickRole();
    if (typeof window.pickRole !== 'function') window.addEventListener('load', patchPickRole);
    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'a-sport') refresh();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GEDInscriptionPreview = { refresh };

})(window);
