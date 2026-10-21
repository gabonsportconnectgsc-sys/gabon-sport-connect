/* GSC-ADMIN-HUB.JS — accueil en tuiles, menu regroupe par theme, badges (admin.html) */
(function (window) {
  'use strict';
  window.__gscHubActive = true;
  var C = { profils: 0, clubs: 0, effectifs: 0, signalements: 0 };
  var sigOk = false, sets = { a: {}, b: {} }, watching = false, labels = {}, rolesBox = null;

  function $(id) { return document.getElementById(id); }
  function navItems() { return Array.prototype.slice.call(document.querySelectorAll('.sidebar .nav-item')); }
  function find(sel) {
    if (typeof sel === 'string') return $(sel);
    var l = navItems();
    for (var i = 0; i < l.length; i++) if (sel.test(l[i].textContent)) return l[i];
    return null;
  }

  var GROUPS = [
    { k: 'todo', t: '🔔 À traiter', it: ['nav-fiches', /Validations?\s+clubs/i, 'nav-effectifs', 'nav-signalements', 'nav-verification'] },
    { k: 'mem', t: '👥 Membres & comptes', it: ['nav-joueurs', /Comptes/i, 'nav-clubs'] },
    { k: 'str', t: '🏢 Structures & clubs', it: ['nav-structures', 'nav-liaison', 'nav-infrastructures', 'nav-conformite', 'nav-archivage', /F[ée]minin/i] },
    { k: 'doc', t: '📁 Documents', it: ['nav-documents'] },
    { k: 'com', t: '💬 Communauté & contenu', it: ['nav-community', 'nav-cms', 'nav-photos'] },
    { k: 'cmp', t: '📅 Compétitions & données', it: ['nav-matchs', 'nav-rapports', 'nav-qrscan'] },
    { k: 'sys', t: '⚙️ Système', it: ['nav-open-app', 'nav-logout'] }
  ];
  var TILES = [
    { g: '🔔 À traiter', items: [
      { i: '🧾', l: 'Fiches en attente', c: 'profils', go: function () { if (window.gscGoToFiltered) window.gscGoToFiltered({ roles: 'all', status: 'pending', title: 'Fiches en attente' }); } },
      { i: '🏟️', l: 'Validations clubs', c: 'clubs', nav: /Validations?\s+clubs/i },
      { i: '👥', l: 'Effectifs clubs', c: 'effectifs', nav: 'nav-effectifs' },
      { i: '🚩', l: 'Signalements', c: 'signalements', nav: 'nav-signalements' },
      { i: '🌍', l: 'Vérification internationale', nav: 'nav-verification' } ] },
    { g: '👥 Membres &amp; comptes', items: [
      { i: '👥', l: 'Joueurs &amp; acteurs', nav: 'nav-joueurs' },
      { i: '🔐', l: 'Comptes &amp; Accès', nav: /Comptes/i },
      { i: '🏟️', l: 'Clubs', nav: 'nav-clubs' } ] },
    { g: '🏢 Structures &amp; clubs', items: [
      { i: '🏢', l: 'Structures', nav: 'nav-structures' },
      { i: '🔗', l: 'Liaison', nav: 'nav-liaison' },
      { i: '🏗️', l: 'Infrastructures', nav: 'nav-infrastructures' },
      { i: '📋', l: 'Conformité', nav: 'nav-conformite' },
      { i: '📚', l: 'Archivage', nav: 'nav-archivage' },
      { i: '🚺', l: 'Féminin', nav: /F[ée]minin/i } ] },
    { g: '📁 Documents', items: [ { i: '📁', l: 'Documents', nav: 'nav-documents' } ] },
    { g: '💬 Communauté &amp; contenu', items: [
      { i: '💬', l: 'Forum &amp; Modération', nav: 'nav-community' },
      { i: '🎨', l: 'CMS', nav: 'nav-cms' },
      { i: '📸', l: 'Photos &amp; Logos', nav: 'nav-photos' } ] },
    { g: '📅 Compétitions &amp; données', items: [
      { i: '🗓️', l: 'Calendrier', nav: 'nav-calendrier' },
      { i: '📅', l: 'Matchs', nav: 'nav-matchs' },
      { i: '📈', l: 'Rapports', nav: 'nav-rapports' },
      { i: '📷', l: 'Scanner QR', nav: 'nav-qrscan' } ] }
  ];
  var MORD = ['mnav-dashboard', 'mnav-effectifs', 'mnav-signalements', 'mnav-joueurs', 'mnav-structures', 'mnav-liaison', 'mnav-conformite',
    'mnav-documents', 'mnav-community', 'mnav-photos', 'mnav-matchs', 'mnav-rapports', 'mnav-verification', 'mnav-qrscan', 'mnav-cms',
    'mnav-infrastructures', 'mnav-archivage'];

  function css() {
    if ($('gsc-hub-css')) return;
    var s = document.createElement('style');
    s.id = 'gsc-hub-css';
    s.textContent =
      '.gsc-hub-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.8px;padding:14px 14px 4px;display:flex;align-items:center;gap:6px}' +
      '.gsc-hub-label.tg{cursor:pointer}' +
      '.gsc-hub-b{margin-left:auto;background:#ef4444;color:#fff;border-radius:99px;font-size:10px;font-weight:800;padding:1px 7px}' +
      '.gsc-hub-mb{position:absolute;top:-4px;right:-5px;min-width:17px;height:17px;padding:0 4px;background:#ef4444;color:#fff;border:2px solid #fff;border-radius:99px;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none;z-index:50}' +
      '.mn-btn,.topbar .btn-menu{position:relative;overflow:visible}' +
      '#gsc-hub{margin:0 0 18px}' +
      '.gsc-hub-g{font-family:var(--font-display);font-size:13px;font-weight:800;color:var(--navy);margin:14px 2px 8px}' +
      '.gsc-hub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}' +
      '.gsc-tile{position:relative;background:#fff;border:1px solid var(--gray-bd,#e2e8f0);border-radius:14px;padding:14px 10px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:700;color:var(--navy);box-shadow:0 1px 3px rgba(0,0,0,.05)}' +
      '.gsc-tile:active{transform:scale(.97)}.gsc-tile.hot{border-color:#fca5a5;background:#fff7f7}' +
      '.gsc-t-ico{font-size:26px}' +
      '.gsc-t-b{position:absolute;top:6px;right:8px;min-width:20px;height:20px;padding:0 6px;background:#ef4444;color:#fff;border-radius:99px;font-size:11px;font-weight:800;align-items:center;justify-content:center}';
    document.head.appendChild(s);
  }

  function label(k, text) {
    if (labels[k]) return labels[k];
    var d = document.createElement('div');
    d.className = 'gsc-hub-label'; d.textContent = text; labels[k] = d;
    return d;
  }
  function rolesLabel() {
    var l = label('roles', '🏷️ Membres par type ▸');
    if (!l._tg) {
      l._tg = true; l.classList.add('tg');
      l.onclick = function () {
        var open = rolesBox.style.display === 'none';
        rolesBox.style.display = open ? '' : 'none';
        l.textContent = '🏷️ Membres par type ' + (open ? '▾' : '▸');
      };
    }
    return l;
  }
  function getRolesBox(els) {
    if (!rolesBox) { rolesBox = document.createElement('div'); rolesBox.id = 'gsc-hub-roles'; rolesBox.style.display = 'none'; }
    els.forEach(function (e) { if (e.parentNode !== rolesBox) rolesBox.appendChild(e); });
    return rolesBox;
  }

  function organize() {
    var nav = document.querySelector('.sidebar-nav');
    if (!nav || !nav.querySelector('.nav-item')) return;
    var used = [], desired = [], parts = {};
    function take(sel) { var e = find(sel); if (e && used.indexOf(e) < 0) { used.push(e); return e; } return null; }
    var dash = take('nav-dashboard'); if (dash) desired.push(dash);
    var roleEls = navItems().filter(function (e) { return /^nav-role-/.test(e.id); });
    roleEls.forEach(function (e) { used.push(e); });
    GROUPS.forEach(function (g) { parts[g.k] = g.it.map(function (s) { return take(s); }).filter(Boolean); });
    parts.oth = navItems().filter(function (e) { return used.indexOf(e) < 0; });
    function add(k, title) {
      var it = parts[k]; if (!it || !it.length) return;
      desired.push(label(k, title)); it.forEach(function (e) { desired.push(e); });
    }
    function T(k) { return GROUPS.filter(function (g) { return g.k === k; })[0].t; }
    add('todo', T('todo')); add('mem', T('mem'));
    if (roleEls.length) { desired.push(rolesLabel()); desired.push(getRolesBox(roleEls)); }
    add('str', T('str')); add('doc', T('doc')); add('com', T('com')); add('cmp', T('cmp'));
    add('oth', '📌 Autres'); add('sys', T('sys'));
    var cur = Array.prototype.slice.call(nav.children).filter(function (n) { return desired.indexOf(n) >= 0; });
    var same = cur.length === desired.length && cur.every(function (n, i) { return n === desired[i]; });
    if (same) return;
    Array.prototype.slice.call(nav.querySelectorAll(':scope > .nav-label')).forEach(function (l) { l.style.display = 'none'; });
    desired.forEach(function (n) { nav.appendChild(n); });
  }

  function organizeMobile() {
    var first = $('mnav-dashboard'); if (!first) return;
    var bar = first.parentNode;
    var all = Array.prototype.slice.call(bar.querySelectorAll(':scope > .mn-btn'));
    var ord = [];
    MORD.forEach(function (id) { var e = $(id); if (e && e.parentNode === bar) ord.push(e); });
    var lo = $('mnav-logout');
    all.forEach(function (e) { if (ord.indexOf(e) < 0 && e !== lo) ord.push(e); });
    if (lo && lo.parentNode === bar) ord.push(lo);
    if (all.length === ord.length && all.every(function (e, i) { return e === ord[i]; })) return;
    ord.forEach(function (e) { bar.appendChild(e); });
  }

  function ensureHub() {
    var d = $('dashboard'); if (!d || $('gsc-hub')) return;
    var ref = d.querySelector('.stats-grid'); if (!ref) return;
    var h = document.createElement('div'); h.id = 'gsc-hub';
    h.innerHTML = TILES.map(function (g, gi) {
      return '<div class="gsc-hub-g">' + g.g + '</div><div class="gsc-hub-grid">' + g.items.map(function (t, ti) {
        return '<button type="button" class="gsc-tile" data-g="' + gi + '" data-t="' + ti + '"><span class="gsc-t-ico">' + t.i + '</span><span>' + t.l + '</span>' +
          (t.c ? '<span class="gsc-t-b" data-c="' + t.c + '" style="display:none"></span>' : '') + '</button>';
      }).join('') + '</div>';
    }).join('');
    h.addEventListener('click', function (ev) {
      var b = ev.target.closest('.gsc-tile'); if (!b) return;
      var t = TILES[+b.getAttribute('data-g')].items[+b.getAttribute('data-t')];
      if (t.go) t.go(); else { var el = find(t.nav); if (el) el.click(); }
    });
    ref.parentNode.insertBefore(h, ref);
    var qa = d.querySelector('.quick-actions');
    if (qa && qa.closest('.dash-card')) qa.closest('.dash-card').style.display = 'none';
  }

  function hideDup() {
    var s = $('conformite-modeles-discipline');
    if (s && s.parentNode && !s.parentNode._gscHid) { s.parentNode.style.display = 'none'; s.parentNode._gscHid = true; }
  }

  function put(el, n, full, sel) {
    if (!el) return;
    var b = el.querySelector(':scope > .' + sel);
    if (n <= 0) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = full; el.appendChild(b); }
    b.textContent = n > 99 ? '99+' : String(n);
  }

  function render() {
    var total = C.profils + C.clubs + C.effectifs + C.signalements;
    function side(el, n) {
      if (el && !el.querySelector('.nav-badge-count:not(.gsc-hub-b)')) put(el, n, 'nav-badge-count gsc-hub-b', 'gsc-hub-b');
    }
    side(find(/Validations?\s+clubs/i), C.clubs);
    side($('nav-joueurs'), C.profils);
    side($('nav-fiches'), C.profils);
    side($('nav-effectifs'), C.effectifs);
    Array.prototype.forEach.call(document.querySelectorAll('#gsc-hub .gsc-t-b'), function (b) {
      var n = C[b.getAttribute('data-c')] || 0;
      b.textContent = n > 99 ? '99+' : n;
      b.style.display = n > 0 ? 'flex' : 'none';
      b.parentNode.classList.toggle('hot', n > 0);
    });
    if (labels.todo) labels.todo.style.color = '#FB923C';
    if (labels.todo) labels.todo.innerHTML = '🔔 À traiter' + (total ? '<span class="gsc-hub-b">' + total + '</span>' : '');
    put(document.querySelector('.topbar .btn-menu'), total, 'gsc-hub-mb', 'gsc-hub-mb');
    put($('mnav-effectifs'), C.effectifs, 'gsc-hub-mb', 'gsc-hub-mb');
    put($('mnav-signalements'), C.signalements, 'gsc-hub-mb', 'gsc-hub-mb');
    put($('mnav-joueurs'), C.profils, 'gsc-hub-mb', 'gsc-hub-mb');
  }

  function uid() {
    try { return window.firebase && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.uid; } catch (e) { return null; }
  }
  function watch(col, field, val, cb) {
    var eb = function (e) { console.warn('[GSC admin-hub]', col, e && e.message || e); };
    var db = window.db;
    if (typeof db.collection === 'function') return db.collection(col).where(field, '==', val).onSnapshot(cb, eb);
    if (window.query && window.collection && window.where && window.onSnapshot)
      return window.onSnapshot(window.query(window.collection(db, col), window.where(field, '==', val)), cb, eb);
  }
  function ids(snap) { var o = {}; snap.forEach(function (d) { o[d.id] = 1; }); return o; }

  function startWatch() {
    if (watching || !window.db || !uid()) return;
    watching = true;
    function prof() { C.profils = Object.keys(Object.assign({}, sets.a, sets.b)).length; render(); }
    try {
      watch('users', 'status', 'pending', function (s) { sets.a = ids(s); prof(); });
      watch('users', 'validationAdmin', 'pending', function (s) { sets.b = ids(s); prof(); });
      watch('clubValidationRequests', 'status', 'pending', function (s) { C.clubs = s.size; render(); });
      watch('signalements', 'status', 'pending', function (s) {
        C.signalements = s.size; sigOk = true;
        var el = $('nav-signalements-count');
        if (el) { el.textContent = s.size; el.style.display = s.size > 0 ? 'inline-block' : 'none'; }
        render();
      });
    } catch (e) { console.warn('[GSC admin-hub]', e); }
  }
  function poll() {
    var e = $('nav-signalements-count');
    if (!sigOk) C.signalements = (e && e.style.display !== 'none') ? (parseInt(e.textContent, 10) || 0) : 0;
    if (window.__gscRoCount != null) C.effectifs = window.__gscRoCount;
  }
  var pendObs = null;
  function floatPending() {
    var tb = $('players-grid'); if (!tb) return;
    if (!pendObs) pendObs = new MutationObserver(function () { floatPending(); });
    pendObs.disconnect();
    try {
      var ids = Object.assign({}, sets.a, sets.b);
      var kids = Array.prototype.slice.call(tb.children).filter(function (r) { return r.tagName === 'TR'; });
      var isP = function (r) { return !!ids[r.getAttribute('data-id')]; };
      var seenOther = false, need = false;
      kids.forEach(function (r) { if (isP(r)) { if (seenOther) need = true; } else seenOther = true; });
      var rows = kids.filter(isP);
      rows.forEach(function (r) { r.classList.add('row-pending-blink'); });
      if (need) rows.slice().reverse().forEach(function (r) { tb.insertBefore(r, tb.firstChild); });
    } catch (e) { console.warn('[GSC admin-hub] floatPending', e); }
    pendObs.observe(tb, { childList: true });
  }
  function ensureFiches() {
    if (!$('gsc-fiches-css')) {
      var st = document.createElement('style'); st.id = 'gsc-fiches-css';
      st.textContent = '.sidebar-nav > .nav-label{color:#FCD116 !important}';
      document.head.appendChild(st);
    }
    if ($('nav-fiches')) return;
    var nav = document.querySelector('.sidebar-nav');
    if (!nav || !nav.querySelector('.nav-item')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'nav-item'; b.id = 'nav-fiches';
    b.innerHTML = '<span class="nav-icon">🧾</span><span>Fiches en attente</span>';
    b.addEventListener('click', function () {
      if (window.gscGoToFiltered) window.gscGoToFiltered({ roles: 'all', status: 'pending', title: 'Fiches en attente' });
    });
    nav.appendChild(b);
  }
  function tick() {
    try { floatPending(); ensureFiches(); organize(); organizeMobile(); ensureHub(); hideDup(); poll(); startWatch(); render(); }
    catch (e) { console.warn('[GSC admin-hub]', e); }
  }

  window.GSCAdminHub = { setCount: function (k, n) { C[k] = n; render(); } };
  css();
  setTimeout(tick, 600);
  setInterval(tick, 2500);
})(window);
