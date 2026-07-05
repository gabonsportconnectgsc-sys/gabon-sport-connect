/**
 * ══════════════════════════════════════════════════════════════════════
 *  ADMIN-MAINTENANCE-MODE.JS — Activation/Désactivation de l'application
 *  Gabon Sport Connect · 2026
 *
 *  Monkey-patch non-invasif (n'édite pas admin.html, sauf l'ajout de la
 *  balise <script> de chargement) :
 *   - Injecte un item de navigation "🛠️ Maintenance" dans le groupe
 *     "Application"
 *   - Permet d'activer/désactiver un écran de blocage affiché à TOUS les
 *     visiteurs (hors admin) sur index.html, avec un message et des
 *     coordonnées de contact personnalisables + 3 modèles standards
 *   - Écrit dans Firestore `settings/maintenance` (SDK compat, comme le
 *     reste de admin.html) — lu en temps réel par gsc-maintenance-gate.js
 *     côté index.html (SDK modulaire).
 *
 *  Dépendances : window.db (compat), firebase.firestore.FieldValue pour
 *  le timestamp serveur.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const SECTION_ID = 'maintenance-mode';
  const NAV_ID = 'nav-maintenance';
  const MNAV_ID = 'mnav-maintenance';
  const DOC_PATH = ['settings', 'maintenance'];

  const PRESETS = {
    maintenance: {
      icon: '🛠️',
      title: 'Application en cours de maintenance',
      message: "Nous effectuons actuellement une maintenance pour améliorer votre expérience.\nL'application sera de nouveau disponible très prochainement.\nMerci de votre patience — veuillez revenir plus tard.",
      contacts: ''
    },
    indisponible: {
      icon: '⛔',
      title: 'Application indisponible pour le moment',
      message: "L'application est momentanément indisponible.\nNous mettons tout en œuvre pour la rétablir dans les plus brefs délais.\nEn cas d'urgence, veuillez nous joindre via les contacts ci-dessous.",
      contacts: 'Téléphone : +241 00 00 00 00\nEmail : contact@gabonsportconnect.ga'
    },
    incident: {
      icon: '🚨',
      title: 'Incident technique en cours',
      message: "Nous rencontrons actuellement un incident technique.\nNos équipes travaillent à la résolution du problème.\nToutes nos excuses pour la gêne occasionnée.",
      contacts: ''
    }
  };

  let _current = { enabled: false, icon: '🛠️', title: '', message: '', contacts: '' };

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  /* ══════════════════════════════════════════════════════════════════
   * 1. STYLES
   * ══════════════════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('gsc-maint-styles')) return;
    const s = document.createElement('style');
    s.id = 'gsc-maint-styles';
    s.textContent = `
.gsc-maint-status { display:flex; align-items:center; gap:10px; padding:14px 16px; border-radius:12px; font-weight:600; font-size:14px; margin-bottom:14px; }
.gsc-maint-status.on { background:#fee2e2; color:#991b1b; }
.gsc-maint-status.off { background:#dcfce7; color:#166534; }
.gsc-maint-toggle-btn { border:none; border-radius:10px; padding:10px 18px; font-size:13px; font-weight:700; cursor:pointer; color:#fff; }
.gsc-maint-toggle-btn.on { background:#dc2626; }
.gsc-maint-toggle-btn.off { background:#16a34a; }
.gsc-maint-presets { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
.gsc-maint-preset-btn { border:1.5px solid var(--gray-bd,#e5e7eb); background:#fff; border-radius:10px; padding:8px 14px; font-size:12.5px; cursor:pointer; }
.gsc-maint-preset-btn:hover { background:#f9fafb; }
.gsc-maint-field { margin-bottom:12px; }
.gsc-maint-field label { display:block; font-size:12px; font-weight:600; color:var(--gray-txt,#6b7280); margin-bottom:4px; }
.gsc-maint-field input, .gsc-maint-field textarea { width:100%; border:1.5px solid var(--gray-bd,#e5e7eb); border-radius:10px; padding:9px 12px; font-size:13.5px; font-family:inherit; box-sizing:border-box; }
.gsc-maint-field textarea { resize:vertical; min-height:80px; }
.gsc-maint-save-btn { background:var(--green,#009e60); color:#fff; border:none; border-radius:10px; padding:10px 20px; font-size:13px; font-weight:700; cursor:pointer; }
.gsc-maint-status-msg { font-size:12px; margin-top:8px; }
.gsc-maint-status-msg.ok { color:#10b981; }
.gsc-maint-status-msg.err { color:var(--danger,#dc2626); }
.gsc-maint-preview { border:2px dashed var(--gray-bd,#e5e7eb); border-radius:14px; padding:24px; background:linear-gradient(135deg,#062a1a,#04140c); display:flex; align-items:center; justify-content:center; }
.gsc-maint-preview-card { max-width:380px; width:100%; background:#fff; border-radius:16px; padding:26px 22px; text-align:center; box-shadow:0 12px 30px rgba(0,0,0,0.3); }
`;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. NAVIGATION
   * ══════════════════════════════════════════════════════════════════ */
  function injectNav() {
    if (!document.getElementById(NAV_ID)) {
      const anchor = document.getElementById('nav-open-app');
      if (anchor) {
        anchor.insertAdjacentHTML('beforebegin',
          `<button class="nav-item" id="${NAV_ID}">
            <span class="nav-icon">🛠️</span><span>Maintenance</span>
            <span id="nav-maint-dot" style="display:none;width:8px;height:8px;border-radius:50%;background:#dc2626;margin-left:auto;"></span>
          </button>`
        );
      }
    }
    if (!document.getElementById(MNAV_ID)) {
      const mnav = document.querySelector('.mobile-nav');
      if (mnav) {
        mnav.insertAdjacentHTML('beforeend',
          `<button class="mn-btn" id="${MNAV_ID}"><span class="mn-icon">🛠️</span><span>Maintenance</span></button>`
        );
      }
    }
    const navBtn = document.getElementById(NAV_ID);
    if (navBtn && !navBtn._gscBound) { navBtn._gscBound = true; navBtn.addEventListener('click', showSection); }
    const mNavBtn = document.getElementById(MNAV_ID);
    if (mNavBtn && !mNavBtn._gscBound) { mNavBtn._gscBound = true; mNavBtn.addEventListener('click', showSection); }
  }

  function updateNavDot() {
    const dot = document.getElementById('nav-maint-dot');
    if (dot) dot.style.display = _current.enabled ? 'inline-block' : 'none';
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. SECTION
   * ══════════════════════════════════════════════════════════════════ */
  function injectSection() {
    if (document.getElementById(SECTION_ID)) return;
    const main = document.querySelector('.main-content');
    if (!main) return;
    main.insertAdjacentHTML('beforeend', `
      <div id="${SECTION_ID}" class="section">
        <div class="dash-card mb-16">
          <div class="dash-card-title">🛠️ Maintenance de l'application</div>
          <p style="font-size:12px;color:var(--gray-txt);margin-bottom:0;">
            Active un écran de blocage affiché à tous les visiteurs (les comptes admin ne sont jamais bloqués).
            Personnalise le message et les contacts, ou utilise un modèle standard.
          </p>
        </div>

        <div class="dash-card mb-16">
          <div id="maint-status-banner"></div>
        </div>

        <div class="dash-card mb-16">
          <div class="dash-card-title" style="margin-bottom:10px;">Modèles standards</div>
          <div class="gsc-maint-presets">
            <button type="button" class="gsc-maint-preset-btn" onclick="GSCMaintenanceAdmin.applyPreset('maintenance')">🛠️ Maintenance programmée</button>
            <button type="button" class="gsc-maint-preset-btn" onclick="GSCMaintenanceAdmin.applyPreset('indisponible')">⛔ Indisponible — contacter</button>
            <button type="button" class="gsc-maint-preset-btn" onclick="GSCMaintenanceAdmin.applyPreset('incident')">🚨 Incident technique</button>
          </div>

          <div class="gsc-maint-field">
            <label>Icône</label>
            <input type="text" id="maint-icon" maxlength="4" style="max-width:80px;">
          </div>
          <div class="gsc-maint-field">
            <label>Titre affiché</label>
            <input type="text" id="maint-title" placeholder="Application en cours de maintenance">
          </div>
          <div class="gsc-maint-field">
            <label>Message</label>
            <textarea id="maint-message" placeholder="Nous effectuons actuellement une maintenance…"></textarea>
          </div>
          <div class="gsc-maint-field">
            <label>Contacts en cas d'urgence (optionnel)</label>
            <textarea id="maint-contacts" placeholder="Téléphone : +241…&#10;Email : contact@…" style="min-height:56px;"></textarea>
          </div>

          <button type="button" class="gsc-maint-save-btn" onclick="GSCMaintenanceAdmin.save()">💾 Enregistrer le message</button>
          <div class="gsc-maint-status-msg" id="maint-save-status"></div>
        </div>

        <div class="dash-card">
          <div class="dash-card-title" style="margin-bottom:10px;">👁️ Aperçu — ce que verront les visiteurs</div>
          <div class="gsc-maint-preview">
            <div class="gsc-maint-preview-card" id="maint-preview-card"></div>
          </div>
        </div>
      </div>
    `);

    ['maint-icon', 'maint-title', 'maint-message', 'maint-contacts'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', renderPreview);
    });
  }

  function showSection() {
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
    if (topbarTitle && topbarTitle.firstChild) topbarTitle.firstChild.textContent = 'Maintenance';

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');

    fillFormFromCurrent();
    renderStatusBanner();
    renderPreview();
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. RENDU
   * ══════════════════════════════════════════════════════════════════ */
  function fillFormFromCurrent() {
    const icon = document.getElementById('maint-icon');
    const title = document.getElementById('maint-title');
    const message = document.getElementById('maint-message');
    const contacts = document.getElementById('maint-contacts');
    if (icon) icon.value = _current.icon || '🛠️';
    if (title) title.value = _current.title || '';
    if (message) message.value = _current.message || '';
    if (contacts) contacts.value = _current.contacts || '';
  }

  function renderStatusBanner() {
    const el = document.getElementById('maint-status-banner');
    if (!el) return;
    const on = !!_current.enabled;
    el.innerHTML = `
      <div class="gsc-maint-status ${on ? 'on' : 'off'}">
        <span>${on ? '🔴 Application actuellement EN MAINTENANCE — bloquée pour tous les visiteurs' : '🟢 Application actuellement en ligne — accessible à tous'}</span>
        <button type="button" class="gsc-maint-toggle-btn ${on ? 'on' : 'off'}" style="margin-left:auto;" onclick="GSCMaintenanceAdmin.toggle()">
          ${on ? '✅ Désactiver la maintenance' : '⛔ Activer la maintenance'}
        </button>
      </div>
    `;
  }

  function renderPreview() {
    const card = document.getElementById('maint-preview-card');
    if (!card) return;
    const icon = (document.getElementById('maint-icon') || {}).value || _current.icon || '🛠️';
    const title = (document.getElementById('maint-title') || {}).value || _current.title || 'Application en cours de maintenance';
    const message = (document.getElementById('maint-message') || {}).value || _current.message || '';
    const contacts = (document.getElementById('maint-contacts') || {}).value || _current.contacts || '';
    card.innerHTML = `
      <div style="font-size:48px;margin-bottom:10px;">${esc(icon)}</div>
      <h2 style="font-size:17px;margin:0 0 10px;color:#0b3d24;">${esc(title)}</h2>
      <p style="font-size:13px;line-height:1.55;color:#374151;margin:0 0 ${contacts ? '16' : '0'}px;">${nl2br(message)}</p>
      ${contacts ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:12.5px;color:#065f46;">📞 ${nl2br(contacts)}</div>` : ''}
    `;
  }

  function applyPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    document.getElementById('maint-icon').value = p.icon;
    document.getElementById('maint-title').value = p.title;
    document.getElementById('maint-message').value = p.message;
    document.getElementById('maint-contacts').value = p.contacts;
    renderPreview();
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. FIRESTORE (SDK compat)
   * ══════════════════════════════════════════════════════════════════ */
  function ref() {
    if (!window.db) return null;
    return window.db.collection(DOC_PATH[0]).doc(DOC_PATH[1]);
  }

  function listen() {
    const r = ref();
    if (!r) return;
    r.onSnapshot(snap => {
      _current = (snap && snap.exists) ? Object.assign({ enabled: false, icon: '🛠️', title: '', message: '', contacts: '' }, snap.data()) : _current;
      updateNavDot();
      if (document.getElementById(SECTION_ID)?.classList.contains('active')) {
        fillFormFromCurrent();
        renderStatusBanner();
        renderPreview();
      }
    }, err => console.error('[GSCMaintenanceAdmin] écoute impossible:', err));
  }

  async function toggle() {
    const r = ref();
    if (!r) { alert('Firestore indisponible.'); return; }
    const nextEnabled = !_current.enabled;
    if (nextEnabled && !confirm('Activer le mode maintenance ?\n\nTous les visiteurs (hors admin) verront immédiatement l\'écran de blocage à la place de l\'application.')) return;
    try {
      await r.set({ enabled: nextEnabled, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error('[GSCMaintenanceAdmin] toggle erreur:', err);
      alert('Erreur : ' + (err.message || err));
    }
  }

  async function save() {
    const statusEl = document.getElementById('maint-save-status');
    const r = ref();
    if (!r) { if (statusEl) { statusEl.textContent = 'Firestore indisponible.'; statusEl.className = 'gsc-maint-status-msg err'; } return; }
    const payload = {
      icon: (document.getElementById('maint-icon').value || '🛠️').trim(),
      title: (document.getElementById('maint-title').value || '').trim(),
      message: (document.getElementById('maint-message').value || '').trim(),
      contacts: (document.getElementById('maint-contacts').value || '').trim(),
      updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
    };
    try {
      await r.set(payload, { merge: true });
      if (statusEl) { statusEl.textContent = '✅ Message enregistré.'; statusEl.className = 'gsc-maint-status-msg ok'; setTimeout(() => { statusEl.textContent = ''; }, 2500); }
    } catch (err) {
      console.error('[GSCMaintenanceAdmin] save erreur:', err);
      if (statusEl) { statusEl.textContent = '❌ Erreur : ' + (err.message || err); statusEl.className = 'gsc-maint-status-msg err'; }
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 6. BOOT
   * ══════════════════════════════════════════════════════════════════ */
  function boot() {
    injectStyles();
    injectNav();
    injectSection();
    listen();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GSCMaintenanceAdmin = { showSection, applyPreset, toggle, save };

})(window);
