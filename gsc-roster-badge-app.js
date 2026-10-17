/* GSC-ROSTER-BADGE-APP.JS — effectifs a valider : badges, bandeau et onglet (vue Admin de l'appli) */
(function (window) {
  'use strict';
  var started = false, unsub = null, count = 0, errs = 0;

  function css() {
    if (document.getElementById('gsc-ro-app-css')) return;
    var s = document.createElement('style');
    s.id = 'gsc-ro-app-css';
    s.textContent =
      '.gsc-ro-nb{position:absolute;top:-4px;right:-5px;min-width:17px;height:17px;padding:0 4px;background:#ef4444;color:#fff;border:2px solid var(--navy,#0A1628);border-radius:99px;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none;z-index:999}' +
      '.admin-tab{position:relative;overflow:visible}.admin-tab .gsc-ro-nb{border-color:#fff}' +
      '.gsc-ro-smi{margin-left:auto;background:#ef4444;color:#fff;border-radius:99px;font-size:10px;font-weight:800;padding:1px 6px}' +
      '#bnav-admin,#nav-menu-btn{overflow:visible !important}' +
      '#roster-pending-banner button{margin-left:auto;background:#fff;border:1.5px solid #009E60;color:#009E60;border-radius:10px;padding:8px 16px;font-weight:700;font-size:13px;cursor:pointer}';
    document.head.appendChild(s);
  }
  function isAdminUi() {
    var b = document.getElementById('bnav-admin');
    return !!b && b.style.display !== 'none';
  }
  function put(el, n, inline) {
    if (!el) return;
    var cls = inline ? 'gsc-ro-smi' : 'gsc-ro-nb';
    var b = el.querySelector(':scope > .' + cls);
    if (n <= 0) { if (b) b.remove(); return; }
    if (!inline && getComputedStyle(el).position === 'static') el.style.position = 'relative';
    if (!b) { b = document.createElement('span'); b.className = cls; el.appendChild(b); }
    b.textContent = n > 99 ? '99+' : String(n);
  }
  function ensureUi() {
    var base = document.getElementById('pending-banner');
    if (base && !document.getElementById('roster-pending-banner')) {
      var d = document.createElement('div');
      d.className = 'pending-banner';
      d.id = 'roster-pending-banner';
      d.style.display = 'none';
      d.innerHTML = '<span class="count-bubble" id="roster-pending-bubble">0</span><span>effectif(s) de club en attente de validation — à traiter</span><button type="button">Valider</button>';
      d.querySelector('button').onclick = function () { window.location.href = 'admin.html#effectifs'; };
      base.parentNode.insertBefore(d, base.nextSibling);
    }
    var tabs = document.querySelector('.admin-tabs');
    if (tabs && !document.getElementById('admin-tab-effectifs')) {
      var b = document.createElement('button');
      b.className = 'admin-tab'; b.id = 'admin-tab-effectifs';
      b.textContent = '👥 Effectifs';
      b.onclick = function () { window.location.href = 'admin.html#effectifs'; };
      tabs.appendChild(b);
    }
  }
  function refresh() {
    var bn = document.getElementById('roster-pending-banner');
    if (bn) {
      bn.style.display = count > 0 ? 'flex' : 'none';
      var bb = document.getElementById('roster-pending-bubble'); if (bb) bb.textContent = count;
    }
    put(document.getElementById('admin-tab-effectifs'), count, false);
    var ub = document.getElementById('pending-banner'), ubb = document.getElementById('pending-count-bubble');
    var un = (ub && ub.style.display !== 'none' && ubb) ? (parseInt(ubb.textContent, 10) || 0) : 0;
    put(document.querySelector('.admin-tab[onclick*="\'users\'"]'), un, false);
  }
  function show(n) {
    count = n;
    put(document.getElementById('bnav-admin'), n, false);
    put(document.getElementById('nav-menu-btn'), n, false);
    put(document.getElementById('side-menu-admin'), n, true);
    ensureUi(); refresh();
  }
  function stop() {
    if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
    started = false; show(0);
  }
  function start() {
    if (started || errs >= 5 || !window.db || typeof window.query !== 'function' || typeof window.onSnapshot !== 'function') return;
    started = true; css();
    try {
      var q = window.query(window.collection(window.db, 'rosters'), window.where('validation', '==', 'pending'));
      unsub = window.onSnapshot(q, function (snap) { show(snap.size); },
        function (e) { errs++; console.warn('[GSC roster-badge]', e && e.message || e); stop(); });
    } catch (e) { errs++; console.warn('[GSC roster-badge]', e); started = false; }
  }

  function bindVoir() {
    var b = document.querySelector('#pending-banner button');
    if (!b || b._gscVoir) return;
    b._gscVoir = true;
    b.onclick = function () {
      try { if (typeof switchAdminTab === 'function') switchAdminTab('users'); } catch (e) {}
      var sel = document.getElementById('srch-status'); if (sel) sel.value = 'pending';
      try { if (typeof filterAdminUsers === 'function') filterAdminUsers(); } catch (e) {}
      setTimeout(function () {
        var t = document.getElementById('admin-users-tbody');
        var box = t && (t.closest('table') || t);
        if (box) { box.style.scrollMarginTop = '90px'; box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      }, 150);
    };
  }

  /* Liens de notification : admin.html -> vue admin, index.html -> profil (anciennes notifs incluses) */
  function mapLink(x) {
    if (typeof x !== 'string') return x;
    if (/^admin\.html/i.test(x)) return 'admin';
    if (/^index\.html/i.test(x)) return 'profil';
    return x;
  }
  function wrapLink() {
    var f = window.handleNotifLink;
    if (typeof f !== 'function' || f._gscRoWrapped) return !!(f && f._gscRoWrapped);
    var g = function (lk) {
      try {
        if (typeof lk === 'string') lk = mapLink(lk);
        else if (lk && typeof lk.section === 'string') { lk = Object.assign({}, lk); lk.section = mapLink(lk.section); }
      } catch (e) {}
      return f.call(this, lk);
    };
    g._gscRoWrapped = true;
    window.handleNotifLink = g;
    return true;
  }
  var wt = 0, wi = setInterval(function () { wt++; if (wrapLink() || wt > 80) clearInterval(wi); }, 750);

  setInterval(function () {
    if (isAdminUi()) { start(); ensureUi(); refresh(); bindVoir(); } else if (started) stop();
  }, 2500);
})(window);
