/* GSC-ROSTER-BADGE-APP.JS — badge "effectifs a valider" pour l'admin dans l'appli */
(function (window) {
  'use strict';
  var started = false, unsub = null, timer = null;

  function css() {
    if (document.getElementById('gsc-ro-app-css')) return;
    var s = document.createElement('style');
    s.id = 'gsc-ro-app-css';
    s.textContent =
      '.gsc-ro-nb{position:absolute;top:-4px;right:-5px;min-width:17px;height:17px;padding:0 4px;background:#ef4444;color:#fff;border:2px solid var(--navy,#0A1628);border-radius:99px;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none;z-index:999}' +
      '.gsc-ro-smi{margin-left:auto;background:#ef4444;color:#fff;border-radius:99px;font-size:10px;font-weight:800;padding:1px 6px}' +
      '#bnav-admin,#nav-menu-btn{overflow:visible !important}';
    document.head.appendChild(s);
  }
  function isAdminUi() {
    var b = document.getElementById('bnav-admin');
    return !!b && b.style.display !== 'none';
  }
  function put(id, n, inline) {
    var el = document.getElementById(id);
    if (!el) return;
    var cls = inline ? 'gsc-ro-smi' : 'gsc-ro-nb';
    var b = el.querySelector(':scope > .' + cls);
    if (n <= 0) { if (b) b.remove(); return; }
    if (!inline && getComputedStyle(el).position === 'static') el.style.position = 'relative';
    if (!b) { b = document.createElement('span'); b.className = cls; el.appendChild(b); }
    b.textContent = n > 99 ? '99+' : String(n);
  }
  function show(n) {
    put('bnav-admin', n, false);
    put('nav-menu-btn', n, false);
    put('side-menu-admin', n, true);
  }
  function stop() {
    if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
    started = false; show(0);
  }
  function start() {
    if (started || !window.db || typeof window.query !== 'function' || typeof window.onSnapshot !== 'function') return;
    started = true; css();
    try {
      var q = window.query(window.collection(window.db, 'rosters'), window.where('validation', '==', 'pending'));
      unsub = window.onSnapshot(q, function (snap) { show(snap.size); },
        function (e) { console.warn('[GSC roster-badge]', e && e.message || e); stop(); });
    } catch (e) { console.warn('[GSC roster-badge]', e); started = false; }
  }
  timer = setInterval(function () {
    if (isAdminUi()) start(); else if (started) stop();
  }, 2500);
})(window);
