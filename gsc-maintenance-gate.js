/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC-MAINTENANCE-GATE.JS — Écran de blocage "Application en maintenance"
 *  Gabon Sport Connect · 2026
 *
 *  Monkey-patch non-invasif (n'édite pas index.html, sauf l'ajout de la
 *  balise <script> de chargement) :
 *   - Écoute en temps réel le document Firestore `settings/maintenance`
 *     (écrit depuis admin.html par admin-maintenance-mode.js)
 *   - Si `enabled: true`, affiche un écran plein écran qui bloque
 *     l'accès à l'application pour tous les visiteurs
 *   - Les comptes admin (userProfile.role === 'admin') ne sont JAMAIS
 *     bloqués : dès que leur profil se charge, l'écran se retire
 *     automatiquement pour eux.
 *
 *  index.html utilise le SDK Firebase MODULAIRE (contrairement à
 *  admin.html qui utilise le SDK compat) — les fonctions Firestore sont
 *  exposées en globals (window.doc, window.onSnapshot, window.getDoc)
 *  par le bootstrap Firebase déjà présent dans index.html.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const COLLECTION = 'settings';
  const DOC_ID = 'maintenance';
  const OVERLAY_ID = 'gsc-maintenance-overlay';

  let _lastData = null;
  let _overlayEl = null;
  let _listenerAttached = false;

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  function isCurrentUserAdmin() {
    try { return !!(window.userProfile && window.userProfile.role === 'admin'); } catch (e) { return false; }
  }

  /* ══════════════════════════════════════════════════════════════════
   * OVERLAY
   * ══════════════════════════════════════════════════════════════════ */
  function buildOverlay(data) {
    const icon = data.icon || '🛠️';
    const title = data.title || 'Application en cours de maintenance';
    const message = data.message || "Nous effectuons actuellement une maintenance pour améliorer votre expérience.\nVeuillez revenir plus tard.";
    const contacts = data.contacts || '';

    const el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.setAttribute('style',
      'position:fixed;inset:0;z-index:2147483000;' +
      'background:linear-gradient(135deg,#062a1a,#04140c);' +
      'display:flex;align-items:center;justify-content:center;' +
      'padding:24px;overflow-y:auto;'
    );
    el.innerHTML = `
      <div style="max-width:420px;width:100%;background:#ffffff;border-radius:18px;padding:34px 26px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.45);font-family:inherit;">
        <div style="font-size:54px;margin-bottom:14px;">${esc(icon)}</div>
        <h1 style="font-size:19px;margin:0 0 12px;color:#0b3d24;font-weight:800;">${esc(title)}</h1>
        <p style="font-size:14px;line-height:1.6;color:#374151;margin:0 0 ${contacts ? '18' : '4'}px;">${nl2br(message)}</p>
        ${contacts ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;font-size:13px;color:#065f46;margin-bottom:20px;text-align:left;">📞 ${nl2br(contacts)}</div>` : ''}
        <button type="button" id="gsc-maintenance-retry" style="background:#009e60;color:#fff;border:none;border-radius:10px;padding:10px 22px;font-size:13px;font-weight:700;cursor:pointer;">🔄 Réessayer</button>
      </div>
    `;
    return el;
  }

  function showOverlay(data) {
    if (_overlayEl) return; // déjà affiché
    document.documentElement.style.overflow = 'hidden';
    _overlayEl = buildOverlay(data);
    document.body.appendChild(_overlayEl);
    const btn = document.getElementById('gsc-maintenance-retry');
    if (btn) btn.addEventListener('click', () => location.reload());
  }

  function hideOverlay() {
    if (_overlayEl && _overlayEl.parentNode) _overlayEl.parentNode.removeChild(_overlayEl);
    _overlayEl = null;
    document.documentElement.style.overflow = '';
  }

  function applyState() {
    if (!_lastData || !_lastData.enabled) { hideOverlay(); return; }
    if (isCurrentUserAdmin()) { hideOverlay(); return; }
    showOverlay(_lastData);
  }

  /* ══════════════════════════════════════════════════════════════════
   * SURVEILLANCE DU RÔLE (userProfile se charge de façon asynchrone
   * après la connexion — on réévalue régulièrement pour lever le
   * blocage dès qu'un admin est identifié, sans dépendre d'un hook
   * précis dans index.html)
   * ══════════════════════════════════════════════════════════════════ */
  function startRoleWatcher() {
    let ticks = 0;
    const iv = setInterval(() => {
      ticks++;
      applyState();
      if (ticks > 120) clearInterval(iv); // ~2 min de surveillance active après chargement
    }, 1000);
  }

  /* ══════════════════════════════════════════════════════════════════
   * FIRESTORE (SDK modulaire — fonctions exposées en globals par le
   * bootstrap Firebase de index.html)
   * ══════════════════════════════════════════════════════════════════ */
  function attachListener() {
    if (_listenerAttached) return;
    if (!window.db || typeof window.doc !== 'function') return;

    try {
      const docRef = window.doc(window.db, COLLECTION, DOC_ID);
      if (typeof window.onSnapshot === 'function') {
        window.onSnapshot(docRef, snap => {
          _lastData = snap.exists() ? snap.data() : null;
          applyState();
        }, err => console.error('[GSCMaintenance] écoute impossible:', err));
        _listenerAttached = true;
      } else if (typeof window.getDoc === 'function') {
        // Repli : lecture unique si onSnapshot n'est pas exposé
        window.getDoc(docRef).then(snap => {
          _lastData = snap.exists() ? snap.data() : null;
          applyState();
        }).catch(() => {});
        _listenerAttached = true;
      }
    } catch (e) {
      console.error('[GSCMaintenance] init erreur:', e);
    }
  }

  function boot() {
    startRoleWatcher();
    if (window.db) attachListener();
    else document.addEventListener('firebase-ready', attachListener, { once: true });
    // Filet de sécurité si l'événement firebase-ready a déjà été émis
    // avant le chargement de ce script (ordre des <script> variable).
    setTimeout(attachListener, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GSCMaintenance = { recheck: applyState };

})(window);
