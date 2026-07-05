/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC-WHATSAPP-MODULE.JS — Annuaire WhatsApp (Communication Générale)
 *  Gabon Sport Connect · 2026
 *
 *  Module autonome (monkey-patch), chargé à la fois par admin.html et
 *  index.html — il détecte son contexte au boot :
 *    - admin.html : injecte le nav-item "💬 Communication Générale" +
 *      une section de gestion CRUD de la collection `whatsapp_contacts`.
 *    - index.html : injecte une icône flottante publique (FAB) qui ouvre
 *      une liste filtrable des contacts WhatsApp actifs.
 *
 *  Indépendant de structures-contact-links.js (qui gère le WhatsApp par
 *  structure via le champ téléphone de la structure) : ceci est un
 *  annuaire global de contacts (fédérations, presse, support...), pas
 *  lié aux structures ni aux comptes utilisateurs. Si
 *  structures-contact-links.js est chargé avant ce fichier, sa fonction
 *  de normalisation de numéro est réutilisée pour rester cohérent avec
 *  le reste de l'app (repli local sinon).
 *
 *  Collection Firestore : whatsapp_contacts/{id}
 *    { nom, categorie, telephone, message, actif, ordre, createdAt, updatedAt }
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const COLLECTION = 'whatsapp_contacts';
  const CATEGORIES = ['Fédération', 'Club', 'Presse', 'Support', 'Autre'];

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // Réutilise la normalisation déjà écrite dans structures-contact-links.js
  // si disponible, sinon repli local identique (même logique : indicatif
  // Gabon 241 ajouté par défaut sur un numéro local).
  function normalizePhone(raw) {
    if (window.GSCContactLinks && typeof window.GSCContactLinks.normalizePhoneForWhatsapp === 'function') {
      return window.GSCContactLinks.normalizePhoneForWhatsapp(raw);
    }
    if (!raw) return null;
    let digits = raw.toString().replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) digits = digits.slice(1);
    digits = digits.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('241')) return digits;
    if (digits.startsWith('0')) digits = digits.slice(1);
    return '241' + digits;
  }

  function waLink(contact) {
    const wa = normalizePhone(contact.telephone);
    if (!wa) return null;
    const msg = (contact.message || '').trim();
    return `https://wa.me/${wa}${msg ? '?text=' + encodeURIComponent(msg) : ''}`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * DÉTECTION DU CONTEXTE
   * ══════════════════════════════════════════════════════════════════ */
  function isAdminContext() {
    return !!document.querySelector('.main-content') && !!document.getElementById('sidebar');
  }
  function isPublicContext() {
    return !!document.querySelector('.bottom-nav');
  }

  /* ══════════════════════════════════════════════════════════════════
   * STYLES COMMUNS
   * ══════════════════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('gsc-wa-styles')) return;
    const s = document.createElement('style');
    s.id = 'gsc-wa-styles';
    s.textContent = `
.gsc-wa-fab { position:fixed; right:16px; bottom:78px; width:56px; height:56px; border-radius:50%;
  background:#25D366; color:#fff; display:flex; align-items:center; justify-content:center;
  font-size:28px; box-shadow:0 4px 14px rgba(0,0,0,.25); border:none; cursor:pointer; z-index:400; }
.gsc-wa-fab:active { transform:scale(0.94); }
.gsc-wa-modal-overlay { position:fixed; inset:0; background:rgba(10,22,40,.55); z-index:500;
  display:none; align-items:flex-end; justify-content:center; }
.gsc-wa-modal-overlay.open { display:flex; }
.gsc-wa-modal { background:#fff; width:100%; max-width:480px; max-height:78vh; border-radius:18px 18px 0 0;
  display:flex; flex-direction:column; overflow:hidden; animation:gscWaUp .2s ease; }
@keyframes gscWaUp { from{transform:translateY(24px);opacity:0;} to{transform:translateY(0);opacity:1;} }
.gsc-wa-modal-head { padding:14px 16px 10px; border-bottom:1px solid #eee; display:flex; flex-direction:column; gap:8px; }
.gsc-wa-modal-title { font-weight:700; font-size:15px; display:flex; align-items:center; justify-content:space-between; }
.gsc-wa-close { background:none; border:none; font-size:20px; cursor:pointer; color:#64748b; }
.gsc-wa-search { border:1.5px solid #e2e8f0; border-radius:10px; padding:8px 10px; font-size:13px; width:100%; box-sizing:border-box; }
.gsc-wa-chips { display:flex; gap:6px; flex-wrap:wrap; }
.gsc-wa-chip { border:1.5px solid #e2e8f0; border-radius:20px; padding:4px 10px; font-size:11.5px; cursor:pointer; background:#fff; color:#334155; }
.gsc-wa-chip.active { background:#009E60; border-color:#009E60; color:#fff; }
.gsc-wa-list { overflow-y:auto; padding:8px 10px 16px; }
.gsc-wa-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 6px; border-bottom:1px solid #f1f5f9; }
.gsc-wa-row-info { min-width:0; }
.gsc-wa-row-name { font-weight:600; font-size:13.5px; color:#0A1628; }
.gsc-wa-row-cat { font-size:11px; color:#64748b; }
.gsc-wa-row-btn { flex-shrink:0; text-decoration:none; display:inline-flex; align-items:center; gap:6px;
  background:#25D366; color:#fff; border-radius:8px; padding:7px 12px; font-size:12.5px; font-weight:600; }
.gsc-wa-empty { text-align:center; color:#64748b; font-size:13px; padding:24px 10px; }
.gsc-wa-adm-row { display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:10px; align-items:center; padding:8px 4px; border-bottom:1px solid #f1f5f9; font-size:12.5px; }
.gsc-wa-adm-row input[type=text], .gsc-wa-adm-row select { border:1.5px solid #e2e8f0; border-radius:8px; padding:5px 8px; font-size:12.5px; width:100%; box-sizing:border-box; }
.gsc-wa-status-msg { font-size:11px; margin-top:4px; }
.gsc-wa-status-msg.ok { color:#10b981; }
.gsc-wa-status-msg.err { color:#dc2626; }
@media (max-width:640px){ .gsc-wa-adm-row{ grid-template-columns:1fr; } }
`;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════════════
   * CÔTÉ PUBLIC (index.html) — FAB + modale filtrable
   * ══════════════════════════════════════════════════════════════════ */
  let _publicContacts = [];
  let _activeCategory = null;

  function injectPublicUI() {
    if (document.getElementById('gsc-wa-fab')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <button class="gsc-wa-fab" id="gsc-wa-fab" title="Nous contacter sur WhatsApp">💬</button>
      <div class="gsc-wa-modal-overlay" id="gsc-wa-overlay">
        <div class="gsc-wa-modal">
          <div class="gsc-wa-modal-head">
            <div class="gsc-wa-modal-title">💬 Contacts WhatsApp <button class="gsc-wa-close" id="gsc-wa-close">✕</button></div>
            <input type="text" class="gsc-wa-search" id="gsc-wa-search" placeholder="🔍 Rechercher un contact…">
            <div class="gsc-wa-chips" id="gsc-wa-chips"></div>
          </div>
          <div class="gsc-wa-list" id="gsc-wa-list"></div>
        </div>
      </div>
    `);
    document.getElementById('gsc-wa-fab').addEventListener('click', openPublicModal);
    document.getElementById('gsc-wa-close').addEventListener('click', closePublicModal);
    document.getElementById('gsc-wa-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'gsc-wa-overlay') closePublicModal();
    });
    document.getElementById('gsc-wa-search').addEventListener('input', renderPublicList);

    const chips = document.getElementById('gsc-wa-chips');
    chips.innerHTML = '<button type="button" class="gsc-wa-chip active" data-cat="">Tous</button>' +
      CATEGORIES.map(c => `<button type="button" class="gsc-wa-chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    chips.querySelectorAll('.gsc-wa-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        chips.querySelectorAll('.gsc-wa-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeCategory = btn.dataset.cat || null;
        renderPublicList();
      });
    });
  }

  function openPublicModal() {
    document.getElementById('gsc-wa-overlay').classList.add('open');
    renderPublicList();
  }
  function closePublicModal() {
    document.getElementById('gsc-wa-overlay').classList.remove('open');
  }

  function renderPublicList() {
    const listEl = document.getElementById('gsc-wa-list');
    if (!listEl) return;
    const q = (document.getElementById('gsc-wa-search')?.value || '').trim().toLowerCase();
    const rows = _publicContacts
      .filter(c => c.actif !== false)
      .filter(c => !_activeCategory || c.categorie === _activeCategory)
      .filter(c => !q || (c.nom || '').toLowerCase().includes(q) || (c.categorie || '').toLowerCase().includes(q))
      .sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999));

    if (!rows.length) {
      listEl.innerHTML = '<div class="gsc-wa-empty">Aucun contact trouvé.</div>';
      return;
    }
    listEl.innerHTML = rows.map(c => {
      const link = waLink(c);
      return `
        <div class="gsc-wa-row">
          <div class="gsc-wa-row-info">
            <div class="gsc-wa-row-name">${esc(c.nom)}</div>
            <div class="gsc-wa-row-cat">${esc(c.categorie || '')}</div>
          </div>
          ${link ? `<a class="gsc-wa-row-btn" href="${esc(link)}" target="_blank" rel="noopener">💬 Écrire</a>` : ''}
        </div>`;
    }).join('');
  }

  function bootPublic() {
    injectStyles();
    injectPublicUI();
    if (!window.db) return;
    window.db.collection(COLLECTION).onSnapshot(
      (snap) => {
        _publicContacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderPublicList();
      },
      (err) => console.error('[GSCWhatsApp] lecture publique erreur:', err)
    );
  }

  /* ══════════════════════════════════════════════════════════════════
   * CÔTÉ ADMIN (admin.html) — section "Communication Générale"
   * ══════════════════════════════════════════════════════════════════ */
  const SECTION_ID = 'communication-generale';
  const NAV_ID = 'nav-communication';
  const MNAV_ID = 'mnav-communication';

  let _adminContacts = [];
  let _editingId = null;

  function injectAdminNav() {
    if (!document.getElementById(NAV_ID)) {
      const anchor = document.getElementById('nav-archivage');
      if (anchor) {
        anchor.insertAdjacentHTML('afterend', `
          <div class="nav-label">Communication</div>
          <button class="nav-item" id="${NAV_ID}">
            <span class="nav-icon">💬</span><span>Communication Générale</span>
          </button>
        `);
      }
    }
    if (!document.getElementById(MNAV_ID)) {
      const mnav = document.querySelector('.mobile-nav');
      if (mnav) {
        mnav.insertAdjacentHTML('beforeend',
          `<button class="mn-btn" id="${MNAV_ID}"><span class="mn-icon">💬</span><span>Comm.</span></button>`
        );
      }
    }
    const navBtn = document.getElementById(NAV_ID);
    if (navBtn && !navBtn._gscBound) { navBtn._gscBound = true; navBtn.addEventListener('click', showAdminSection); }
    const mNavBtn = document.getElementById(MNAV_ID);
    if (mNavBtn && !mNavBtn._gscBound) { mNavBtn._gscBound = true; mNavBtn.addEventListener('click', showAdminSection); }
  }

  function injectAdminSection() {
    if (document.getElementById(SECTION_ID)) return;
    const main = document.querySelector('.main-content');
    if (!main) return;
    main.insertAdjacentHTML('beforeend', `
      <div id="${SECTION_ID}" class="section">
        <div class="dash-card mb-16">
          <div class="dash-card-title">💬 Communication Générale — Annuaire WhatsApp</div>
          <p style="font-size:12px;color:var(--gray-txt);margin-bottom:4px;">
            Contacts affichés publiquement via l'icône WhatsApp flottante de l'application (icône visible
            uniquement si le contact est marqué "actif"). Numéro au format local (ex : 077123456) ou
            international — l'indicatif Gabon (241) est ajouté automatiquement si absent.
          </p>
        </div>
        <div class="dash-card mb-16">
          <div class="dash-card-title" id="gsc-wa-form-title">➕ Ajouter un contact</div>
          <div class="gsc-wa-adm-row" style="grid-template-columns:1fr 1fr 1fr 1fr;">
            <input type="text" id="gsc-wa-f-nom" placeholder="Nom du contact">
            <select id="gsc-wa-f-cat">${CATEGORIES.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
            <input type="text" id="gsc-wa-f-tel" placeholder="Téléphone (ex: 077123456)">
            <input type="number" id="gsc-wa-f-ordre" placeholder="Ordre" value="0">
          </div>
          <div class="gsc-wa-adm-row" style="grid-template-columns:2fr auto auto;margin-top:6px;">
            <input type="text" id="gsc-wa-f-msg" placeholder="Message pré-rempli (optionnel)">
            <label style="display:flex;align-items:center;gap:6px;white-space:nowrap;">
              <input type="checkbox" id="gsc-wa-f-actif" checked> Actif
            </label>
            <div>
              <button type="button" class="btn-sm" style="background:var(--green,#009E60);color:#fff;" onclick="GSCWhatsApp.saveContact()">💾 Enregistrer</button>
              <button type="button" class="btn-sm" id="gsc-wa-cancel" style="display:none;" onclick="GSCWhatsApp.cancelEdit()">Annuler</button>
            </div>
          </div>
          <div class="gsc-wa-status-msg" id="gsc-wa-form-status"></div>
        </div>
        <div class="dash-card">
          <div style="margin-bottom:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <input type="text" id="gsc-wa-adm-search" class="search-input" placeholder="🔍 Nom, catégorie…" style="max-width:280px;">
            <span id="gsc-wa-adm-count" style="font-size:12px;color:var(--gray-txt);"></span>
          </div>
          <div id="gsc-wa-adm-table"></div>
        </div>
      </div>
    `);
    document.getElementById('gsc-wa-adm-search').addEventListener('input', renderAdminTable);
  }

  function showAdminSection() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(SECTION_ID);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mn-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.getElementById(NAV_ID);
    if (navBtn) navBtn.classList.add('active');
    const mNavBtn = document.getElementById(MNAV_ID);
    if (mNavBtn) mNavBtn.classList.add('active');

    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle && topbarTitle.firstChild) topbarTitle.firstChild.textContent = 'Communication Générale';

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');

    renderAdminTable();
  }

  function renderAdminTable() {
    const wrap = document.getElementById('gsc-wa-adm-table');
    const countEl = document.getElementById('gsc-wa-adm-count');
    if (!wrap) return;
    const q = (document.getElementById('gsc-wa-adm-search')?.value || '').trim().toLowerCase();
    const rows = _adminContacts
      .filter(c => !q || (c.nom || '').toLowerCase().includes(q) || (c.categorie || '').toLowerCase().includes(q))
      .sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999));

    if (countEl) countEl.textContent = `${rows.length} contact(s)`;

    if (!rows.length) {
      wrap.innerHTML = '<div class="gsc-wa-empty">Aucun contact enregistré.</div>';
      return;
    }
    wrap.innerHTML = rows.map(c => `
      <div class="gsc-wa-adm-row">
        <div><strong>${esc(c.nom)}</strong><br><span style="color:var(--gray-txt);">${esc(c.categorie || '')}</span></div>
        <div>${esc(c.telephone || '—')}</div>
        <div>${c.actif !== false ? '🟢 Actif' : '⚪ Inactif'} · ordre ${esc(String(c.ordre ?? 0))}</div>
        <div style="display:flex;gap:6px;">
          <button type="button" class="btn-sm" onclick="GSCWhatsApp.editContact('${esc(c.id)}')">✏️</button>
          <button type="button" class="btn-sm" style="background:var(--danger,#dc2626);color:#fff;" onclick="GSCWhatsApp.deleteContact('${esc(c.id)}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  function resetForm() {
    _editingId = null;
    document.getElementById('gsc-wa-f-nom').value = '';
    document.getElementById('gsc-wa-f-cat').value = CATEGORIES[0];
    document.getElementById('gsc-wa-f-tel').value = '';
    document.getElementById('gsc-wa-f-ordre').value = '0';
    document.getElementById('gsc-wa-f-msg').value = '';
    document.getElementById('gsc-wa-f-actif').checked = true;
    document.getElementById('gsc-wa-form-title').textContent = '➕ Ajouter un contact';
    document.getElementById('gsc-wa-cancel').style.display = 'none';
  }

  function editContact(id) {
    const c = _adminContacts.find(x => x.id === id);
    if (!c) return;
    _editingId = id;
    document.getElementById('gsc-wa-f-nom').value = c.nom || '';
    document.getElementById('gsc-wa-f-cat').value = c.categorie || CATEGORIES[0];
    document.getElementById('gsc-wa-f-tel').value = c.telephone || '';
    document.getElementById('gsc-wa-f-ordre').value = c.ordre ?? 0;
    document.getElementById('gsc-wa-f-msg').value = c.message || '';
    document.getElementById('gsc-wa-f-actif').checked = c.actif !== false;
    document.getElementById('gsc-wa-form-title').textContent = '✏️ Modifier le contact';
    document.getElementById('gsc-wa-cancel').style.display = 'inline-block';
    document.getElementById('gsc-wa-form-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function cancelEdit() { resetForm(); }

  async function saveContact() {
    const statusEl = document.getElementById('gsc-wa-form-status');
    const nom = document.getElementById('gsc-wa-f-nom').value.trim();
    const telephone = document.getElementById('gsc-wa-f-tel').value.trim();
    if (!nom || !telephone) {
      if (statusEl) { statusEl.textContent = '❌ Nom et téléphone requis.'; statusEl.className = 'gsc-wa-status-msg err'; }
      return;
    }
    if (!window.db) {
      if (statusEl) { statusEl.textContent = 'Firestore indisponible.'; statusEl.className = 'gsc-wa-status-msg err'; }
      return;
    }
    const payload = {
      nom,
      categorie: document.getElementById('gsc-wa-f-cat').value,
      telephone,
      ordre: parseInt(document.getElementById('gsc-wa-f-ordre').value, 10) || 0,
      message: document.getElementById('gsc-wa-f-msg').value.trim(),
      actif: document.getElementById('gsc-wa-f-actif').checked,
      updatedAt: new Date()
    };
    try {
      if (_editingId) {
        await window.db.collection(COLLECTION).doc(_editingId).set(payload, { merge: true });
      } else {
        payload.createdAt = new Date();
        await window.db.collection(COLLECTION).add(payload);
      }
      if (statusEl) { statusEl.textContent = '✅ Enregistré'; statusEl.className = 'gsc-wa-status-msg ok'; setTimeout(() => { statusEl.textContent = ''; }, 2000); }
      resetForm();
    } catch (err) {
      console.error('[GSCWhatsApp] saveContact erreur:', err);
      if (statusEl) { statusEl.textContent = '❌ Erreur : ' + (err.message || err); statusEl.className = 'gsc-wa-status-msg err'; }
    }
  }

  async function deleteContact(id) {
    const c = _adminContacts.find(x => x.id === id);
    if (!confirm(`Supprimer le contact "${c ? c.nom : id}" ? Cette action est irréversible.`)) return;
    if (!window.db) return;
    try {
      await window.db.collection(COLLECTION).doc(id).delete();
    } catch (err) {
      console.error('[GSCWhatsApp] deleteContact erreur:', err);
      alert('Erreur lors de la suppression : ' + (err.message || err));
    }
  }

  function bootAdmin() {
    injectStyles();
    injectAdminNav();
    injectAdminSection();
    if (!window.db) return;
    window.db.collection(COLLECTION).onSnapshot(
      (snap) => {
        _adminContacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (document.getElementById(SECTION_ID)?.classList.contains('active')) renderAdminTable();
      },
      (err) => console.error('[GSCWhatsApp] lecture admin erreur:', err)
    );
  }

  /* ══════════════════════════════════════════════════════════════════
   * BOOT
   * ══════════════════════════════════════════════════════════════════ */
  function boot() {
    if (isAdminContext()) bootAdmin();
    else if (isPublicContext()) bootPublic();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GSCWhatsApp = {
    saveContact, editContact, cancelEdit, deleteContact, showAdminSection,
    openPublicModal, closePublicModal
  };

})(window);
