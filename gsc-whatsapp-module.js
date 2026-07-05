/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC-WHATSAPP-MODULE.JS — Communication Générale
 *  Gabon Sport Connect · 2026
 *
 *  Module autonome (monkey-patch), chargé à la fois par admin.html et
 *  index.html — il détecte son contexte au boot :
 *
 *   • index.html : icône flottante déplaçable (FAB) qui ouvre une liste
 *     filtrable de contacts WhatsApp — fusion de deux sources :
 *       - whatsapp_contacts  : contacts génériques ajoutés à la main
 *         (presse, support...) sans compte utilisateur.
 *       - users (role != admin, whatsappPublic == true) : acteurs de
 *         l'app explicitement rendus publics par l'admin.
 *
 *   • admin.html : section "💬 Communication Générale" à 4 onglets :
 *       1. Acteurs        — bascule whatsappPublic par acteur ou par
 *                            groupe entier (rôle), sur la base des
 *                            comptes déjà enregistrés (users).
 *       2. Contacts additionnels — ancien annuaire manuel (corrigé).
 *       3. Modèles de message   — textes réutilisables (WhatsApp/email)
 *                            avec variables {nom}/{role}/{discipline},
 *                            portée globale, par secteur (rôle) ou par
 *                            discipline (champ `sport`).
 *       4. Diffusion       — choisit un modèle + une cible (tous /
 *                            un rôle / une discipline / un individu)
 *                            et génère les liens wa.me (un par
 *                            destinataire, ouverture manuelle) ou un
 *                            mailto: en BCC par lots de 40 adresses.
 *
 *  ⚠️ LIMITE HONNÊTE (pas de backend d'envoi) : le SDK client Firebase/
 *  navigateur ne peut pas envoyer de messages WhatsApp ou d'e-mails en
 *  masse tout seul — il n'existe aucune API serveur pour ça dans ce
 *  projet. Ce module prépare donc les liens (wa.me / mailto:) prêts à
 *  l'emploi ; l'admin doit cliquer sur chacun (WhatsApp) ou sur le/les
 *  bouton(s) "Ouvrir dans l'app mail" (email, par lots). Un vrai envoi
 *  groupé automatique nécessiterait un backend avec un fournisseur
 *  d'e-mail (ex: SendGrid) ou l'API Cloud WhatsApp Business — non
 *  présents ici.
 *
 *  Dépendances : window.db (firebase-init.js), window.realtimeSync
 *  (optionnel, admin), window.GSCContactLinks (optionnel, pour la
 *  normalisation de numéro — repli local sinon).
 *
 *  Collections Firestore :
 *    whatsapp_contacts/{id}   { nom, categorie, telephone, message, actif, ordre, createdAt, updatedAt }
 *    message_templates/{id}   { titre, portee, roleCible, disciplineCible, corpsWhatsapp, sujetEmail, corpsEmail, createdAt, updatedAt }
 *    users/{uid}.whatsappPublic : boolean (champ ajouté par ce module)
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const COLLECTION = 'whatsapp_contacts';
  const TEMPLATES_COLLECTION = 'message_templates';
  const CATEGORIES = ['Fédération', 'Club', 'Presse', 'Support', 'Autre'];
  const FAB_POS_KEY = 'gsc_wa_fab_pos';

  // Même référentiel de rôles que index.html (ROLE_LABELS), dupliqué
  // ici volontairement pour ne dépendre d'aucun fichier tiers : admin.html
  // n'a pas ce dictionnaire, et une dépendance à l'ordre de chargement
  // d'un <script> non-module serait fragile.
  const ROLE_LABELS = {
    federation: '🏛️ Fédération', club: '🏟️ Club', association: '🤝 Association',
    joueur: '⚽ Joueur / Athlète', arbitre: '🟨 Arbitre', entraineur: '📋 Entraîneur',
    independant: '🧍 Sportif indépendant', organisateur: '🎪 Organisateur',
    supporter: '💗 Supporter', eleve_etudiant: '🎓 Élève / Étudiant',
    sportif_etranger: '🌍 Sportif étranger', handisport: '🦾 Sportif handisport',
    ancien_sportif: '🎖️ Ancien Sportif', formateur: '🧑‍🏫 Formateur'
  };
  const ROLE_ORDER = Object.keys(ROLE_LABELS);

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function roleLabel(r) { return ROLE_LABELS[r] || r || 'Autre'; }
  function actorName(u) {
    return [u.prenom, u.nom].filter(Boolean).join(' ') || u.nomOrganisation || (u.email ? u.email.split('@')[0] : '') || 'Sans nom';
  }

  // Réutilise la normalisation déjà écrite dans structures-contact-links.js
  // si disponible, sinon repli local identique (indicatif Gabon 241
  // ajouté par défaut sur un numéro local).
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

  function waLinkRaw(phone, message) {
    const wa = normalizePhone(phone);
    if (!wa) return null;
    const msg = (message || '').trim();
    return `https://wa.me/${wa}${msg ? '?text=' + encodeURIComponent(msg) : ''}`;
  }

  function applyPlaceholders(text, u) {
    return (text || '')
      .replace(/\{nom\}/g, actorName(u))
      .replace(/\{role\}/g, roleLabel(u.role))
      .replace(/\{discipline\}/g, u.sport || '—');
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
/* ── FAB public déplaçable ─────────────────────────────────────── */
.gsc-wa-fab { position:fixed; width:46px; height:46px; border-radius:50%;
  background:#25D366; display:flex; align-items:center; justify-content:center;
  box-shadow:0 3px 10px rgba(0,0,0,.28); border:none; cursor:grab; z-index:400;
  touch-action:none; padding:0; }
.gsc-wa-fab:active { cursor:grabbing; }
.gsc-wa-fab svg { width:24px; height:24px; pointer-events:none; }
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
.gsc-wa-row-name { font-weight:600; font-size:13.5px; color:#0A1628; }
.gsc-wa-row-cat { font-size:11px; color:#64748b; }
.gsc-wa-row-btn { flex-shrink:0; text-decoration:none; display:inline-flex; align-items:center; gap:6px;
  background:#25D366; color:#fff; border-radius:8px; padding:7px 12px; font-size:12.5px; font-weight:600; }
.gsc-wa-empty { text-align:center; color:#64748b; font-size:13px; padding:24px 10px; }

/* ── Admin : champs de formulaire empilés (mobile-safe) ─────────── */
.gsc-wa-field { margin-bottom:12px; }
.gsc-wa-field label { display:block; font-size:11.5px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.4px; margin-bottom:5px; }
.gsc-wa-field input, .gsc-wa-field select, .gsc-wa-field textarea { width:100%; box-sizing:border-box; padding:9px 11px;
  border:1.5px solid #e2e8f0; border-radius:9px; font-size:13.5px; color:#0A1628; background:#fff; }
.gsc-wa-field textarea { resize:vertical; min-height:70px; font-family:inherit; }
.gsc-wa-field-row { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; }
.gsc-wa-field-row .gsc-wa-field { flex:1; min-width:140px; }

/* ── Admin : onglets ──────────────────────────────────────────────*/
.gsc-wa-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
.gsc-wa-tab { border:1.5px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px 12px; font-size:12.5px; font-weight:700; cursor:pointer; color:#334155; }
.gsc-wa-tab.active { background:#0A1628; color:#fff; border-color:#0A1628; }
.gsc-wa-pane { display:none; }
.gsc-wa-pane.active { display:block; }

/* ── Admin : groupes de rôle (onglet Acteurs) ─────────────────────*/
.gsc-wa-group-head { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 6px;
  background:#f8fafc; border-radius:8px; margin-top:10px; font-size:12.5px; font-weight:700; color:#0A1628; }
.gsc-wa-actor-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 6px; border-bottom:1px solid #f1f5f9; font-size:12.5px; }
.gsc-wa-actor-row .gsc-wa-actor-name { font-weight:600; }
.gsc-wa-actor-row .gsc-wa-actor-sub { color:#64748b; font-size:11px; }
.gsc-wa-toggle { display:flex; align-items:center; gap:6px; font-size:11.5px; white-space:nowrap; cursor:pointer; }

/* ── Admin : listes / statut / boutons génériques ─────────────────*/
.gsc-wa-adm-row { display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:10px; align-items:center; padding:8px 4px; border-bottom:1px solid #f1f5f9; font-size:12.5px; }
@media (max-width:640px){ .gsc-wa-adm-row{ grid-template-columns:1fr; } }
.gsc-wa-status-msg { font-size:11.5px; margin-top:6px; }
.gsc-wa-status-msg.ok { color:#10b981; }
.gsc-wa-status-msg.err { color:#dc2626; }
.gsc-wa-hint { font-size:11.5px; color:#64748b; background:#f8fafc; border-radius:8px; padding:8px 10px; margin-bottom:12px; }
.gsc-wa-send-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 6px; border-bottom:1px solid #f1f5f9; }
`;
    document.head.appendChild(s);
  }

  // Icône générique "téléphone dans bulle de discussion" — volontairement
  // distincte du logo WhatsApp exact (marque déposée) mais reconnaissable
  // comme bouton de contact/messagerie (cercle vert, glyphe téléphone).
  const PHONE_BUBBLE_SVG = `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.03 2 11c0 2.42 1.09 4.63 2.88 6.28L4 22l4.9-1.62C9.9 20.78 10.93 21 12 21c5.52 0 10-4.03 10-9s-4.48-10-10-10Z" fill="#ffffff"/>
      <path d="M9.3 8.2c.22-.5.45-.5.66-.51.18 0 .4 0 .58.42.2.48.68 1.62.74 1.74.06.12.1.27.02.43-.08.17-.13.27-.26.42-.13.15-.27.33-.38.44-.13.13-.26.27-.11.53.15.27.7 1.15 1.5 1.86 1.03.92 1.9 1.2 2.17 1.34.27.13.43.11.59-.07.16-.18.66-.77.84-1.03.18-.27.35-.22.6-.13.24.09 1.53.72 1.79.85.27.13.44.2.5.31.07.11.07.65-.16 1.28-.23.63-1.34 1.24-1.83 1.31-.44.07-1 .1-1.6-.1-.37-.12-.85-.28-1.46-.55-2.57-1.11-4.24-3.7-4.37-3.88-.13-.18-1.06-1.41-1.06-2.68 0-1.27.66-1.9.9-2.16Z" fill="#25D366"/>
    </svg>`;

  /* ══════════════════════════════════════════════════════════════════
   * CÔTÉ PUBLIC (index.html) — FAB déplaçable + modale filtrable
   * ══════════════════════════════════════════════════════════════════ */
  let _publicManualContacts = [];
  let _publicActors = [];
  let _activeCategory = null;

  function injectPublicUI() {
    if (document.getElementById('gsc-wa-fab')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <button class="gsc-wa-fab" id="gsc-wa-fab" title="Nous contacter sur WhatsApp">${PHONE_BUBBLE_SVG}</button>
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
    positionFabDefault();
    makeFabDraggable();
    document.getElementById('gsc-wa-close').addEventListener('click', closePublicModal);
    document.getElementById('gsc-wa-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'gsc-wa-overlay') closePublicModal();
    });
    document.getElementById('gsc-wa-search').addEventListener('input', renderPublicList);

    const chips = document.getElementById('gsc-wa-chips');
    const allChipLabels = ['Tous', ...CATEGORIES, ...Object.values(ROLE_LABELS)];
    chips.innerHTML = '<button type="button" class="gsc-wa-chip active" data-cat="">Tous</button>' +
      CATEGORIES.map(c => `<button type="button" class="gsc-wa-chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('') +
      Object.keys(ROLE_LABELS).map(r => `<button type="button" class="gsc-wa-chip" data-cat="role:${esc(r)}">${esc(ROLE_LABELS[r])}</button>`).join('');
    chips.querySelectorAll('.gsc-wa-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        chips.querySelectorAll('.gsc-wa-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeCategory = btn.dataset.cat || null;
        renderPublicList();
      });
    });
  }

  // Position par défaut : bas-droite, au-dessus de la barre de nav mobile.
  function positionFabDefault() {
    const fab = document.getElementById('gsc-wa-fab');
    if (!fab) return;
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem(FAB_POS_KEY) || 'null'); } catch (e) { pos = null; }
    const vw = window.innerWidth, vh = window.innerHeight;
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      pos = { x: vw - 46 - 14, y: vh - 46 - 128 };
    }
    // Reclamp si la fenêtre a changé de taille depuis le dernier enregistrement.
    pos.x = Math.min(Math.max(6, pos.x), vw - 46 - 6);
    pos.y = Math.min(Math.max(6, pos.y), vh - 46 - 6);
    fab.style.left = pos.x + 'px';
    fab.style.top = pos.y + 'px';
  }

  function makeFabDraggable() {
    const fab = document.getElementById('gsc-wa-fab');
    if (!fab) return;
    let dragging = false, moved = false, startX = 0, startY = 0, origX = 0, origY = 0;

    fab.addEventListener('pointerdown', (e) => {
      dragging = true; moved = false;
      startX = e.clientX; startY = e.clientY;
      const rect = fab.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      fab.setPointerCapture(e.pointerId);
    });
    fab.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      if (!moved) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const nx = Math.min(Math.max(6, origX + dx), vw - 46 - 6);
      const ny = Math.min(Math.max(6, origY + dy), vh - 46 - 6);
      fab.style.left = nx + 'px';
      fab.style.top = ny + 'px';
    });
    fab.addEventListener('pointerup', (e) => {
      dragging = false;
      if (moved) {
        try {
          localStorage.setItem(FAB_POS_KEY, JSON.stringify({
            x: parseFloat(fab.style.left), y: parseFloat(fab.style.top)
          }));
        } catch (err) { /* ignore */ }
      } else {
        openPublicModal();
      }
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
    const cat = _activeCategory || '';
    const isRoleFilter = cat.startsWith('role:');
    const roleFilter = isRoleFilter ? cat.slice(5) : null;

    const manualRows = _publicManualContacts
      .filter(c => c.actif !== false)
      .filter(() => !isRoleFilter)
      .filter(c => !cat || cat === c.categorie)
      .filter(c => !q || (c.nom || '').toLowerCase().includes(q) || (c.categorie || '').toLowerCase().includes(q))
      .map(c => ({
        nom: c.nom, sousTitre: c.categorie || '', link: waLinkRaw(c.telephone, c.message), ordre: c.ordre ?? 999
      }));

    // Les acteurs (comptes utilisateurs) ne s'affichent que si aucun filtre
    // de catégorie manuelle (Fédération/Club/Presse…) n'est actif, ou si un
    // filtre de rôle leur est explicitement appliqué.
    const showActors = !cat || isRoleFilter;
    const actorRows = !showActors ? [] : _publicActors
      .filter(u => !isRoleFilter || u.role === roleFilter)
      .filter(u => !q || actorName(u).toLowerCase().includes(q) || roleLabel(u.role).toLowerCase().includes(q))
      .map(u => ({
        nom: actorName(u), sousTitre: roleLabel(u.role), link: waLinkRaw(u.telephone, ''), ordre: 500
      }));

    const rows = [...manualRows, ...actorRows].sort((a, b) => a.ordre - b.ordre);

    if (!rows.length) {
      listEl.innerHTML = '<div class="gsc-wa-empty">Aucun contact trouvé.</div>';
      return;
    }
    listEl.innerHTML = rows.map(r => `
      <div class="gsc-wa-row">
        <div>
          <div class="gsc-wa-row-name">${esc(r.nom)}</div>
          <div class="gsc-wa-row-cat">${esc(r.sousTitre)}</div>
        </div>
        ${r.link ? `<a class="gsc-wa-row-btn" href="${esc(r.link)}" target="_blank" rel="noopener">💬 Écrire</a>` : ''}
      </div>`).join('');
  }

  function bootPublic() {
    injectStyles();
    injectPublicUI();
    if (!window.db) return;
    window.db.collection(COLLECTION).onSnapshot(
      (snap) => { _publicManualContacts = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderPublicList(); },
      (err) => console.error('[GSCWhatsApp] lecture contacts publique erreur:', err)
    );
    window.db.collection('users').where('whatsappPublic', '==', true).onSnapshot(
      (snap) => { _publicActors = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role !== 'admin'); renderPublicList(); },
      (err) => console.error('[GSCWhatsApp] lecture acteurs publique erreur:', err)
    );
  }

  /* ══════════════════════════════════════════════════════════════════
   * CÔTÉ ADMIN (admin.html) — section "Communication Générale"
   * ══════════════════════════════════════════════════════════════════ */
  const SECTION_ID = 'communication-generale';
  const NAV_ID = 'nav-communication';
  const MNAV_ID = 'mnav-communication';
  const TABS = [
    { id: 'acteurs', label: '👥 Acteurs' },
    { id: 'contacts', label: '💬 Contacts additionnels' },
    { id: 'templates', label: '📝 Modèles de message' },
    { id: 'diffusion', label: '📣 Diffusion' }
  ];

  let _adminContacts = [];
  let _adminUsers = [];
  let _adminTemplates = [];
  let _editingContactId = null;
  let _editingTemplateId = null;
  let _activeTab = 'acteurs';

  function getUsers() {
    if (window.realtimeSync && typeof window.realtimeSync.getCache === 'function') {
      const cached = window.realtimeSync.getCache('users');
      if (cached && cached.length) return cached;
    }
    return _adminUsers;
  }

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
          <div class="dash-card-title">💬 Communication Générale</div>
          <div class="gsc-wa-hint">
            Aucun envoi automatique en masse n'existe ici (pas de backend d'e-mail ni d'API WhatsApp Business
            connectée) : ce module prépare des liens prêts à l'emploi (wa.me / mailto:) — vous cliquez ensuite
            sur chacun pour envoyer réellement.
          </div>
          <div class="gsc-wa-tabs" id="gsc-wa-tabs">
            ${TABS.map(t => `<button type="button" class="gsc-wa-tab" data-tab="${t.id}">${t.label}</button>`).join('')}
          </div>
        </div>

        <div class="gsc-wa-pane" id="gsc-wa-pane-acteurs"></div>
        <div class="gsc-wa-pane" id="gsc-wa-pane-contacts"></div>
        <div class="gsc-wa-pane" id="gsc-wa-pane-templates"></div>
        <div class="gsc-wa-pane" id="gsc-wa-pane-diffusion"></div>
      </div>
    `);
    document.querySelectorAll('#gsc-wa-tabs .gsc-wa-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    switchTab('acteurs');
  }

  function switchTab(tabId) {
    _activeTab = tabId;
    document.querySelectorAll('#gsc-wa-tabs .gsc-wa-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.gsc-wa-pane').forEach(p => p.classList.remove('active'));
    const pane = document.getElementById('gsc-wa-pane-' + tabId);
    if (pane) pane.classList.add('active');
    if (tabId === 'acteurs') renderActeursTab();
    if (tabId === 'contacts') renderContactsTab();
    if (tabId === 'templates') renderTemplatesTab();
    if (tabId === 'diffusion') renderDiffusionTab();
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

    switchTab(_activeTab);
  }

  /* ── Onglet 1 : ACTEURS (bascule whatsappPublic, par acteur ou par rôle) ── */
  function renderActeursTab() {
    const pane = document.getElementById('gsc-wa-pane-acteurs');
    if (!pane) return;
    const users = getUsers().filter(u => (u.role || '') !== 'admin' && !(u.status === 'deleted' || u.statut === 'deleted'));

    pane.innerHTML = `
      <div class="dash-card">
        <div class="dash-card-title">👥 Acteurs — rendre visible dans l'annuaire WhatsApp public</div>
        <p style="font-size:11.5px;color:var(--gray-txt);margin-bottom:10px;">
          Cochez les acteurs (ou activez un groupe entier) qui doivent apparaître dans l'icône WhatsApp
          publique de l'application. Seuls les comptes ayant un numéro de téléphone enregistré peuvent
          être activés.
        </p>
        <input type="text" id="gsc-wa-act-search" class="search-input" placeholder="🔍 Nom, rôle…" style="max-width:280px;margin-bottom:10px;">
        <div id="gsc-wa-act-groups"></div>
      </div>
    `;
    document.getElementById('gsc-wa-act-search').addEventListener('input', () => paintActeursGroups(users));
    paintActeursGroups(users);
  }

  function paintActeursGroups(users) {
    const wrap = document.getElementById('gsc-wa-act-groups');
    if (!wrap) return;
    const q = (document.getElementById('gsc-wa-act-search')?.value || '').trim().toLowerCase();

    const filtered = users.filter(u => !q || actorName(u).toLowerCase().includes(q) || roleLabel(u.role).toLowerCase().includes(q));
    const byRole = {};
    filtered.forEach(u => { const r = u.role || 'autre'; (byRole[r] = byRole[r] || []).push(u); });

    const roles = Object.keys(byRole).sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b));
    if (!roles.length) { wrap.innerHTML = '<div class="gsc-wa-empty">Aucun acteur trouvé.</div>'; return; }

    wrap.innerHTML = roles.map(r => {
      const list = byRole[r].filter(u => !!(u.telephone || '').trim());
      const activeCount = list.filter(u => u.whatsappPublic === true).length;
      return `
        <div class="gsc-wa-group-head">
          <span>${esc(roleLabel(r))} — ${list.length} avec téléphone / ${byRole[r].length} au total</span>
          <span style="display:flex;gap:6px;">
            <button type="button" class="btn-sm" onclick="GSCWhatsApp.toggleRole('${esc(r)}', true)">Tout activer</button>
            <button type="button" class="btn-sm" onclick="GSCWhatsApp.toggleRole('${esc(r)}', false)">Tout désactiver</button>
          </span>
        </div>
        ${byRole[r].map(u => {
          const hasPhone = !!(u.telephone || '').trim();
          return `
          <div class="gsc-wa-actor-row">
            <div>
              <div class="gsc-wa-actor-name">${esc(actorName(u))}</div>
              <div class="gsc-wa-actor-sub">${esc(u.telephone || 'Aucun téléphone enregistré')}${u.sport ? ' · ' + esc(u.sport) : ''}</div>
            </div>
            <label class="gsc-wa-toggle" style="${hasPhone ? '' : 'opacity:.4;cursor:not-allowed;'}">
              <input type="checkbox" ${u.whatsappPublic === true ? 'checked' : ''} ${hasPhone ? '' : 'disabled'}
                onchange="GSCWhatsApp.toggleActor('${esc(u.id || u.uid)}', this.checked)">
              Public
            </label>
          </div>`;
        }).join('')}
      `;
    }).join('');
  }

  async function toggleActor(uid, value) {
    if (!window.db || !uid) return;
    try {
      await window.db.collection('users').doc(uid).update({ whatsappPublic: value });
    } catch (err) {
      console.error('[GSCWhatsApp] toggleActor erreur:', err);
      alert('Erreur : ' + (err.message || err));
    }
  }

  async function toggleRole(role, value) {
    const users = getUsers().filter(u => (u.role || 'autre') === role && !!(u.telephone || '').trim());
    if (!users.length) return;
    if (!confirm(`${value ? 'Activer' : 'Désactiver'} l'affichage WhatsApp public pour les ${users.length} acteur(s) "${roleLabel(role)}" ?`)) return;
    if (!window.db) return;
    let ok = 0, fail = 0;
    for (const u of users) {
      try { await window.db.collection('users').doc(u.id || u.uid).update({ whatsappPublic: value }); ok++; }
      catch (err) { console.error('[GSCWhatsApp] toggleRole erreur pour', u.id, err); fail++; }
    }
    alert(fail ? `${ok} mis à jour, ${fail} échec(s).` : `${ok} acteur(s) mis à jour.`);
  }

  /* ── Onglet 2 : CONTACTS ADDITIONNELS (annuaire manuel, corrigé) ── */
  function renderContactsTab() {
    const pane = document.getElementById('gsc-wa-pane-contacts');
    if (!pane) return;
    pane.innerHTML = `
      <div class="dash-card mb-16">
        <div class="dash-card-title" id="gsc-wa-form-title">➕ Ajouter un contact</div>
        <p style="font-size:11.5px;color:var(--gray-txt);margin-bottom:10px;">
          Pour les contacts sans compte utilisateur (presse, support, partenaires…). Numéro au format
          local (ex : 077123456) ou international — l'indicatif Gabon (241) est ajouté automatiquement.
        </p>
        <div class="gsc-wa-field"><label>Nom du contact</label><input type="text" id="gsc-wa-f-nom" placeholder="Ex: Presse GSC"></div>
        <div class="gsc-wa-field-row">
          <div class="gsc-wa-field"><label>Catégorie</label>
            <select id="gsc-wa-f-cat">${CATEGORIES.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
          </div>
          <div class="gsc-wa-field"><label>Téléphone</label><input type="text" id="gsc-wa-f-tel" placeholder="077123456"></div>
          <div class="gsc-wa-field" style="max-width:100px;"><label>Ordre</label><input type="number" id="gsc-wa-f-ordre" value="0"></div>
        </div>
        <div class="gsc-wa-field"><label>Message pré-rempli (optionnel)</label><input type="text" id="gsc-wa-f-msg" placeholder="Ex: Bonjour, je vous contacte au sujet de…"></div>
        <div class="gsc-wa-field-row">
          <label class="gsc-wa-toggle"><input type="checkbox" id="gsc-wa-f-actif" checked> Actif (visible publiquement)</label>
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
    `;
    document.getElementById('gsc-wa-adm-search').addEventListener('input', renderAdminTable);
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
    if (!rows.length) { wrap.innerHTML = '<div class="gsc-wa-empty">Aucun contact enregistré.</div>'; return; }

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

  function resetContactForm() {
    _editingContactId = null;
    const el = id => document.getElementById(id);
    if (!el('gsc-wa-f-nom')) return;
    el('gsc-wa-f-nom').value = '';
    el('gsc-wa-f-cat').value = CATEGORIES[0];
    el('gsc-wa-f-tel').value = '';
    el('gsc-wa-f-ordre').value = '0';
    el('gsc-wa-f-msg').value = '';
    el('gsc-wa-f-actif').checked = true;
    el('gsc-wa-form-title').textContent = '➕ Ajouter un contact';
    el('gsc-wa-cancel').style.display = 'none';
  }

  function editContact(id) {
    const c = _adminContacts.find(x => x.id === id);
    if (!c) return;
    _editingContactId = id;
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

  function cancelEdit() { resetContactForm(); }

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
      if (_editingContactId) {
        await window.db.collection(COLLECTION).doc(_editingContactId).set(payload, { merge: true });
      } else {
        payload.createdAt = new Date();
        await window.db.collection(COLLECTION).add(payload);
      }
      if (statusEl) { statusEl.textContent = '✅ Enregistré'; statusEl.className = 'gsc-wa-status-msg ok'; setTimeout(() => { statusEl.textContent = ''; }, 2000); }
      resetContactForm();
    } catch (err) {
      console.error('[GSCWhatsApp] saveContact erreur:', err);
      if (statusEl) { statusEl.textContent = '❌ Erreur : ' + (err.message || err); statusEl.className = 'gsc-wa-status-msg err'; }
    }
  }

  async function deleteContact(id) {
    const c = _adminContacts.find(x => x.id === id);
    if (!confirm(`Supprimer le contact "${c ? c.nom : id}" ? Cette action est irréversible.`)) return;
    if (!window.db) return;
    try { await window.db.collection(COLLECTION).doc(id).delete(); }
    catch (err) { console.error('[GSCWhatsApp] deleteContact erreur:', err); alert('Erreur : ' + (err.message || err)); }
  }

  /* ── Onglet 3 : MODÈLES DE MESSAGE ── */
  function renderTemplatesTab() {
    const pane = document.getElementById('gsc-wa-pane-templates');
    if (!pane) return;
    pane.innerHTML = `
      <div class="dash-card mb-16">
        <div class="dash-card-title" id="gsc-wa-tpl-form-title">➕ Nouveau modèle</div>
        <p style="font-size:11.5px;color:var(--gray-txt);margin-bottom:10px;">
          Variables disponibles dans les textes : <code>{nom}</code>, <code>{role}</code>, <code>{discipline}</code> —
          remplacées automatiquement pour chaque destinataire au moment de l'envoi.
        </p>
        <div class="gsc-wa-field"><label>Titre du modèle</label><input type="text" id="gsc-wa-t-titre" placeholder="Ex: Convocation match, Info fédération…"></div>
        <div class="gsc-wa-field-row">
          <div class="gsc-wa-field"><label>Portée</label>
            <select id="gsc-wa-t-portee">
              <option value="global">Global (tous)</option>
              <option value="secteur">Par secteur (rôle)</option>
              <option value="discipline">Par discipline</option>
              <option value="individuel">Individuel</option>
            </select>
          </div>
        </div>
        <div class="gsc-wa-field"><label>Message WhatsApp</label><textarea id="gsc-wa-t-wa" placeholder="Bonjour {nom}, …"></textarea></div>
        <div class="gsc-wa-field"><label>Sujet e-mail</label><input type="text" id="gsc-wa-t-sujet" placeholder="Objet de l'e-mail"></div>
        <div class="gsc-wa-field"><label>Corps e-mail</label><textarea id="gsc-wa-t-email" placeholder="Bonjour {nom}, …"></textarea></div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn-sm" style="background:var(--green,#009E60);color:#fff;" onclick="GSCWhatsApp.saveTemplate()">💾 Enregistrer</button>
          <button type="button" class="btn-sm" id="gsc-wa-tpl-cancel" style="display:none;" onclick="GSCWhatsApp.cancelTemplateEdit()">Annuler</button>
        </div>
        <div class="gsc-wa-status-msg" id="gsc-wa-tpl-status"></div>
      </div>
      <div class="dash-card">
        <div class="dash-card-title">📚 Modèles enregistrés</div>
        <div id="gsc-wa-tpl-list"></div>
      </div>
    `;
    renderTemplatesList();
  }

  function renderTemplatesList() {
    const wrap = document.getElementById('gsc-wa-tpl-list');
    if (!wrap) return;
    if (!_adminTemplates.length) { wrap.innerHTML = '<div class="gsc-wa-empty">Aucun modèle enregistré.</div>'; return; }
    const porteeLabel = { global: 'Global', secteur: 'Par secteur', discipline: 'Par discipline', individuel: 'Individuel' };
    wrap.innerHTML = _adminTemplates.map(t => `
      <div class="gsc-wa-adm-row" style="grid-template-columns:2fr 1fr auto;">
        <div><strong>${esc(t.titre)}</strong></div>
        <div>${esc(porteeLabel[t.portee] || t.portee)}</div>
        <div style="display:flex;gap:6px;">
          <button type="button" class="btn-sm" onclick="GSCWhatsApp.editTemplate('${esc(t.id)}')">✏️</button>
          <button type="button" class="btn-sm" style="background:var(--danger,#dc2626);color:#fff;" onclick="GSCWhatsApp.deleteTemplate('${esc(t.id)}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  function resetTemplateForm() {
    _editingTemplateId = null;
    const el = id => document.getElementById(id);
    if (!el('gsc-wa-t-titre')) return;
    el('gsc-wa-t-titre').value = '';
    el('gsc-wa-t-portee').value = 'global';
    el('gsc-wa-t-wa').value = '';
    el('gsc-wa-t-sujet').value = '';
    el('gsc-wa-t-email').value = '';
    el('gsc-wa-tpl-form-title').textContent = '➕ Nouveau modèle';
    el('gsc-wa-tpl-cancel').style.display = 'none';
  }

  function editTemplate(id) {
    const t = _adminTemplates.find(x => x.id === id);
    if (!t) return;
    _editingTemplateId = id;
    document.getElementById('gsc-wa-t-titre').value = t.titre || '';
    document.getElementById('gsc-wa-t-portee').value = t.portee || 'global';
    document.getElementById('gsc-wa-t-wa').value = t.corpsWhatsapp || '';
    document.getElementById('gsc-wa-t-sujet').value = t.sujetEmail || '';
    document.getElementById('gsc-wa-t-email').value = t.corpsEmail || '';
    document.getElementById('gsc-wa-tpl-form-title').textContent = '✏️ Modifier le modèle';
    document.getElementById('gsc-wa-tpl-cancel').style.display = 'inline-block';
  }

  function cancelTemplateEdit() { resetTemplateForm(); }

  async function saveTemplate() {
    const statusEl = document.getElementById('gsc-wa-tpl-status');
    const titre = document.getElementById('gsc-wa-t-titre').value.trim();
    if (!titre) {
      if (statusEl) { statusEl.textContent = '❌ Titre requis.'; statusEl.className = 'gsc-wa-status-msg err'; }
      return;
    }
    if (!window.db) return;
    const payload = {
      titre,
      portee: document.getElementById('gsc-wa-t-portee').value,
      corpsWhatsapp: document.getElementById('gsc-wa-t-wa').value.trim(),
      sujetEmail: document.getElementById('gsc-wa-t-sujet').value.trim(),
      corpsEmail: document.getElementById('gsc-wa-t-email').value.trim(),
      updatedAt: new Date()
    };
    try {
      if (_editingTemplateId) {
        await window.db.collection(TEMPLATES_COLLECTION).doc(_editingTemplateId).set(payload, { merge: true });
      } else {
        payload.createdAt = new Date();
        await window.db.collection(TEMPLATES_COLLECTION).add(payload);
      }
      if (statusEl) { statusEl.textContent = '✅ Enregistré'; statusEl.className = 'gsc-wa-status-msg ok'; setTimeout(() => { statusEl.textContent = ''; }, 2000); }
      resetTemplateForm();
    } catch (err) {
      console.error('[GSCWhatsApp] saveTemplate erreur:', err);
      if (statusEl) { statusEl.textContent = '❌ Erreur : ' + (err.message || err); statusEl.className = 'gsc-wa-status-msg err'; }
    }
  }

  async function deleteTemplate(id) {
    const t = _adminTemplates.find(x => x.id === id);
    if (!confirm(`Supprimer le modèle "${t ? t.titre : id}" ?`)) return;
    if (!window.db) return;
    try { await window.db.collection(TEMPLATES_COLLECTION).doc(id).delete(); }
    catch (err) { alert('Erreur : ' + (err.message || err)); }
  }

  /* ── Onglet 4 : DIFFUSION (WhatsApp liens + e-mail mailto en BCC) ── */
  function renderDiffusionTab() {
    const pane = document.getElementById('gsc-wa-pane-diffusion');
    if (!pane) return;
    const users = getUsers().filter(u => (u.role || '') !== 'admin' && !(u.status === 'deleted' || u.statut === 'deleted'));
    const roles = [...new Set(users.map(u => u.role).filter(Boolean))].sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b));
    const disciplines = [...new Set(users.map(u => u.sport).filter(Boolean))].sort();

    pane.innerHTML = `
      <div class="dash-card mb-16">
        <div class="dash-card-title">📣 Préparer une diffusion</div>
        <div class="gsc-wa-field"><label>Modèle de message</label>
          <select id="gsc-wa-d-template"><option value="">— Message libre —</option>
            ${_adminTemplates.map(t => `<option value="${esc(t.id)}">${esc(t.titre)}</option>`).join('')}
          </select>
        </div>
        <div class="gsc-wa-field-row">
          <div class="gsc-wa-field"><label>Cible</label>
            <select id="gsc-wa-d-scope">
              <option value="tous">Tous les acteurs</option>
              <option value="role">Un secteur (rôle)</option>
              <option value="discipline">Une discipline</option>
              <option value="individu">Un individu (recherche)</option>
            </select>
          </div>
          <div class="gsc-wa-field" id="gsc-wa-d-scope-value-wrap" style="display:none;"><label id="gsc-wa-d-scope-value-label">Valeur</label>
            <input type="text" id="gsc-wa-d-scope-value" list="gsc-wa-d-suggestions" placeholder="Rechercher…">
            <datalist id="gsc-wa-d-suggestions"></datalist>
          </div>
        </div>
        <div class="gsc-wa-field"><label>Texte WhatsApp (si aucun modèle choisi)</label><textarea id="gsc-wa-d-wa-text" placeholder="Bonjour {nom}, …"></textarea></div>
        <div class="gsc-wa-field-row">
          <div class="gsc-wa-field"><label>Sujet e-mail</label><input type="text" id="gsc-wa-d-email-subject" placeholder="Objet"></div>
        </div>
        <div class="gsc-wa-field"><label>Corps e-mail (si aucun modèle choisi)</label><textarea id="gsc-wa-d-email-text" placeholder="Bonjour {nom}, …"></textarea></div>
        <button type="button" class="btn-sm" style="background:var(--navy,#0A1628);color:#fff;" onclick="GSCWhatsApp.buildDiffusion()">🔍 Prévisualiser les destinataires</button>
      </div>
      <div class="dash-card" id="gsc-wa-d-results"></div>
    `;

    const scopeSel = document.getElementById('gsc-wa-d-scope');
    const valWrap = document.getElementById('gsc-wa-d-scope-value-wrap');
    const valLabel = document.getElementById('gsc-wa-d-scope-value-label');
    const suggestions = document.getElementById('gsc-wa-d-suggestions');
    scopeSel.addEventListener('change', () => {
      const v = scopeSel.value;
      if (v === 'tous') { valWrap.style.display = 'none'; return; }
      valWrap.style.display = '';
      if (v === 'role') {
        valLabel.textContent = 'Secteur (rôle)';
        suggestions.innerHTML = roles.map(r => `<option value="${esc(roleLabel(r))}">`).join('');
      } else if (v === 'discipline') {
        valLabel.textContent = 'Discipline';
        suggestions.innerHTML = disciplines.map(d => `<option value="${esc(d)}">`).join('');
      } else {
        valLabel.textContent = 'Nom de l\'acteur';
        suggestions.innerHTML = users.map(u => `<option value="${esc(actorName(u))}">`).join('');
      }
    });

    document.getElementById('gsc-wa-d-template').addEventListener('change', (e) => {
      const t = _adminTemplates.find(x => x.id === e.target.value);
      if (!t) return;
      document.getElementById('gsc-wa-d-wa-text').value = t.corpsWhatsapp || '';
      document.getElementById('gsc-wa-d-email-subject').value = t.sujetEmail || '';
      document.getElementById('gsc-wa-d-email-text').value = t.corpsEmail || '';
    });
  }

  function buildDiffusion() {
    const users = getUsers().filter(u => (u.role || '') !== 'admin' && !(u.status === 'deleted' || u.statut === 'deleted'));
    const scope = document.getElementById('gsc-wa-d-scope').value;
    const scopeValue = (document.getElementById('gsc-wa-d-scope-value').value || '').trim().toLowerCase();
    const waText = document.getElementById('gsc-wa-d-wa-text').value;
    const emailSubject = document.getElementById('gsc-wa-d-email-subject').value.trim();
    const emailText = document.getElementById('gsc-wa-d-email-text').value;

    let matched = users;
    if (scope === 'role') matched = users.filter(u => roleLabel(u.role).toLowerCase() === scopeValue || (u.role || '').toLowerCase() === scopeValue);
    else if (scope === 'discipline') matched = users.filter(u => (u.sport || '').toLowerCase() === scopeValue);
    else if (scope === 'individu') matched = users.filter(u => actorName(u).toLowerCase() === scopeValue || actorName(u).toLowerCase().includes(scopeValue));

    const withPhone = matched.filter(u => !!(u.telephone || '').trim());
    const withEmail = matched.filter(u => !!(u.email || '').trim());

    const resWrap = document.getElementById('gsc-wa-d-results');
    if (!matched.length) {
      resWrap.innerHTML = '<div class="gsc-wa-empty">Aucun acteur ne correspond à cette cible.</div>';
      return;
    }

    // Liens WhatsApp — un par destinataire (ouverture manuelle, une fenêtre ne
    // peut pas envoyer à plusieurs numéros à la fois via wa.me).
    const waRowsHtml = withPhone.map(u => {
      const link = waLinkRaw(u.telephone, applyPlaceholders(waText, u));
      return `<div class="gsc-wa-send-row">
        <span>${esc(actorName(u))} <span style="color:var(--gray-txt);">(${esc(roleLabel(u.role))})</span></span>
        ${link ? `<a class="gsc-wa-row-btn" href="${esc(link)}" target="_blank" rel="noopener">💬 Envoyer</a>` : '<span style="color:var(--gray-txt);">Numéro invalide</span>'}
      </div>`;
    }).join('');

    // E-mail — un mailto: par lot de 40 destinataires en BCC (limite pratique
    // de longueur d'URL des clients mail, pas une limite Firestore).
    const CHUNK = 40;
    const emailChunks = [];
    for (let i = 0; i < withEmail.length; i += CHUNK) emailChunks.push(withEmail.slice(i, i + CHUNK));
    const emailBtnsHtml = emailChunks.map((chunk, idx) => {
      const bcc = chunk.map(u => u.email).join(',');
      const body = applyPlaceholders(emailText, { nom: '{nom}', role: '', sport: '' }); // {nom} générique : mailto ne permet pas la personnalisation par destinataire
      const mailto = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body)}`;
      return `<a class="btn-sm" style="background:var(--blue,#3b82f6);color:#fff;text-decoration:none;display:inline-block;margin:4px 4px 0 0;" href="${esc(mailto)}">📧 Ouvrir dans l'app mail — Lot ${idx + 1}/${emailChunks.length} (${chunk.length})</a>`;
    }).join('');

    resWrap.innerHTML = `
      <div class="dash-card-title">🎯 ${matched.length} acteur(s) ciblé(s) — ${withPhone.length} avec téléphone, ${withEmail.length} avec e-mail</div>
      <div class="gsc-wa-hint">
        WhatsApp : cliquez sur "Envoyer" pour chaque destinataire (une fenêtre WhatsApp Web/App s'ouvre, pré-remplie).<br>
        E-mail : l'e-mail groupé n'admet pas de variable {nom} par destinataire (un seul mailto pour tout le lot) —
        pour un message vraiment personnalisé, préférez WhatsApp ou un envoi individuel.
      </div>
      <div style="margin-bottom:14px;">${emailChunks.length ? emailBtnsHtml : '<span style="color:var(--gray-txt);font-size:12px;">Aucun destinataire avec e-mail.</span>'}</div>
      <div>${waRowsHtml || '<span style="color:var(--gray-txt);font-size:12px;">Aucun destinataire avec téléphone.</span>'}</div>
    `;
  }

  /* ══════════════════════════════════════════════════════════════════
   * BOOT
   * ══════════════════════════════════════════════════════════════════ */
  function bootAdmin() {
    injectStyles();
    injectAdminNav();
    injectAdminSection();

    if (window.realtimeSync && typeof window.realtimeSync.onUpdate === 'function') {
      window.realtimeSync.onUpdate('users', () => {
        if (document.getElementById(SECTION_ID)?.classList.contains('active') && _activeTab === 'acteurs') renderActeursTab();
      });
    } else if (window.db) {
      window.db.collection('users').onSnapshot(
        (snap) => {
          _adminUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (document.getElementById(SECTION_ID)?.classList.contains('active') && _activeTab === 'acteurs') renderActeursTab();
        },
        (err) => console.error('[GSCWhatsApp] lecture users admin erreur:', err)
      );
    }

    if (!window.db) return;
    window.db.collection(COLLECTION).onSnapshot(
      (snap) => {
        _adminContacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (document.getElementById(SECTION_ID)?.classList.contains('active') && _activeTab === 'contacts') renderAdminTable();
      },
      (err) => console.error('[GSCWhatsApp] lecture contacts admin erreur:', err)
    );
    window.db.collection(TEMPLATES_COLLECTION).onSnapshot(
      (snap) => {
        _adminTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (document.getElementById(SECTION_ID)?.classList.contains('active') && (_activeTab === 'templates' || _activeTab === 'diffusion')) {
          if (_activeTab === 'templates') renderTemplatesList();
        }
      },
      (err) => console.error('[GSCWhatsApp] lecture modèles admin erreur:', err)
    );
  }

  function boot() {
    if (isAdminContext()) bootAdmin();
    else if (isPublicContext()) bootPublic();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GSCWhatsApp = {
    saveContact, editContact, cancelEdit, deleteContact,
    saveTemplate, editTemplate, cancelTemplateEdit, deleteTemplate,
    toggleActor, toggleRole, buildDiffusion,
    showAdminSection, openPublicModal, closePublicModal
  };

})(window);
