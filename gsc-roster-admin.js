/* GSC-ROSTER-ADMIN.JS v2 — validation admin des effectifs (SDK compat ou modulaire) */
(function (window) {
  'use strict';
  var S = { list: [], started: false, names: {}, errors: 0 };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() {
    try {
      if (window.auth && window.auth.currentUser) return window.auth.currentUser.uid;
      if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) return window.firebase.auth().currentUser.uid;
    } catch (e) {}
    return null;
  }
  function compat() { return !!(window.db && typeof window.db.collection === 'function'); }
  function now() {
    return (compat() && window.firebase) ? window.firebase.firestore.FieldValue.serverTimestamp() : window.serverTimestamp();
  }
  function watch(col, field, val, cb, eb) {
    if (compat()) return window.db.collection(col).where(field, '==', val).onSnapshot(cb, eb);
    return window.onSnapshot(window.query(window.collection(window.db, col), window.where(field, '==', val)), cb, eb);
  }

  function injectCss() {
    if (document.getElementById('gsc-ro-css')) return;
    var s = document.createElement('style');
    s.id = 'gsc-ro-css';
    s.textContent =
      '.gsc-ro-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:12px}' +
      '.gsc-ro-card h3{margin:0 0 4px;font-size:15px;color:#0A1628}' +
      '.gsc-ro-meta{font-size:12px;color:#64748b;margin-bottom:8px}' +
      '.gsc-ro-actions{display:flex;gap:8px;margin-top:10px}' +
      '.gsc-ro-actions button{flex:1;padding:10px;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer}' +
      '.gsc-ro-ok{background:#009E60;color:#fff}.gsc-ro-ko{background:#fee2e2;color:#b91c1c}' +
      '.gsc-ro-card table{width:100%;font-size:12px;border-collapse:collapse;margin-top:6px}' +
      '.gsc-ro-card td{padding:3px 4px;border-bottom:1px solid #f1f5f9}';
    document.head.appendChild(s);
  }

  function counts() {
    var n = S.list.length;
    window.__gscRoCount = n;
    if (window.GSCAdminHub) window.GSCAdminHub.setCount('effectifs', n);
    var c = document.getElementById('nav-effectifs-count');
    if (c) { c.textContent = n > 99 ? '99+' : String(n); c.style.display = n > 0 ? '' : 'none'; }
  }

  async function nameOf(sid) {
    if (!sid) return '';
    if (S.names[sid]) return S.names[sid];
    try {
      var d = compat()
        ? await window.db.collection('structuresSportives').doc(sid).get()
        : await window.getDoc(window.doc(window.db, 'structuresSportives', sid));
      var ex = typeof d.exists === 'function' ? d.exists() : d.exists;
      var x = ex ? d.data() : {};
      S.names[sid] = x.nom || x.name || x.nomStructure || sid;
    } catch (e) { S.names[sid] = sid; }
    return S.names[sid];
  }

  function render() {
    var box = document.getElementById('effectifs-list');
    if (!box) return;
    if (!S.list.length) {
      box.innerHTML = '<div class="gsc-ro-card" style="text-align:center;color:#64748b">✅ Aucune liste d\'effectifs en attente.</div>';
      return;
    }
    box.innerHTML = S.list.map(function (r) {
      var jr = (r.joueurs || []).map(function (j) {
        return '<tr><td>' + esc(j.num) + '</td><td>' + esc(j.prenom) + ' ' + esc(j.nomAffiche) + '</td><td>' + esc(j.poste) + '</td><td>' + esc(j.statut) + '</td></tr>';
      }).join('');
      var sr = (r.staff || []).map(function (s) {
        return '<tr><td>—</td><td>' + esc(s.prenom) + ' ' + esc(s.nom) + '</td><td colspan="2">' + esc(s.role) + '</td></tr>';
      }).join('');
      return '<div class="gsc-ro-card"><h3>' + esc(S.names[r.structureId] || r.structureId) + '</h3>' +
        '<div class="gsc-ro-meta">' + esc(r.discipline) + ' · ' + esc(r.categorie) + ' · saison ' + esc(r.saison) +
        ' · ' + (r.joueurs || []).length + ' joueur(s), ' + (r.staff || []).length + ' staff · visibilité : ' + esc(r.visibility) + '</div>' +
        '<details><summary style="cursor:pointer;font-size:13px">Voir la liste</summary><table>' + jr + sr + '</table></details>' +
        '<div class="gsc-ro-actions"><button class="gsc-ro-ok" data-act="ok" data-id="' + esc(r.id) + '">✅ Valider</button>' +
        '<button class="gsc-ro-ko" data-act="ko" data-id="' + esc(r.id) + '">❌ Refuser</button></div></div>';
    }).join('');
  }

  async function decide(id, ok) {
    var r = S.list.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    var reason = '';
    if (!ok) {
      reason = window.prompt('Motif du refus (visible par le club) :') || '';
      if (!reason.trim()) return;
    }
    try {
      var upd = {
        validation: ok ? 'validated' : 'rejected',
        validatedBy: uid(), validatedAt: now(),
        rejectReason: ok ? '' : reason.trim()
      };
      if (compat()) await window.db.collection('rosters').doc(id).set(upd, { merge: true });
      else await window.setDoc(window.doc(window.db, 'rosters', id), upd, { merge: true });
      if (window.GSCNotif && window.GSCNotif.push && r.updatedBy) {
        var nm = S.names[r.structureId] || r.structureId;
        window.GSCNotif.push({
          type: 'validate', personal: true, recipientId: r.updatedBy, link: 'profil',
          title: ok ? '✅ Effectif validé' : '❌ Effectif refusé',
          body: nm + ' · ' + (r.categorie || '') + ' ' + (r.saison || '') + (ok ? ' : liste validée.' : ' : ' + reason.trim())
        });
      }
      S.list = S.list.filter(function (x) { return x.id !== id; });
      counts(); render();
    } catch (e) { alert('Erreur : ' + (e && e.message || e)); }
  }

  function onData(snap) {
    var arr = [];
    snap.forEach(function (d) { var x = d.data(); x.id = d.id; arr.push(x); });
    arr.sort(function (a, b) {
      return ((b.updatedAt && b.updatedAt.seconds) || 0) - ((a.updatedAt && a.updatedAt.seconds) || 0);
    });
    S.list = arr; counts(); render();
    Promise.all(arr.map(function (r) { return nameOf(r.structureId); })).then(render);
  }

  function start() {
    if (S.started || S.errors >= 5 || !uid() || !window.db) return;
    if (!compat() && !(window.query && window.onSnapshot && window.collection && window.where)) return;
    S.started = true;
    try {
      watch('rosters', 'validation', 'pending', onData, function (e) {
        S.errors++; S.started = false; console.warn('[GSC roster-admin]', e && e.message || e);
      });
    } catch (e) { S.errors++; S.started = false; console.warn('[GSC roster-admin]', e); }
  }

  function inject() {
    if (document.getElementById('nav-effectifs')) return true;
    var after = document.getElementById('nav-liaison'), main = document.querySelector('.main-content');
    if (!after || !main) return false;
    injectCss();
    var btn = document.createElement('button');
    btn.className = 'nav-item'; btn.id = 'nav-effectifs';
    btn.innerHTML = '<span class="nav-icon">👥</span><span>Effectifs clubs</span><span class="nav-badge-count" id="nav-effectifs-count" style="display:none;"></span>';
    after.parentNode.insertBefore(btn, after.nextSibling);

    var mn = document.getElementById('mnav-liaison');
    if (mn && !document.getElementById('mnav-effectifs')) {
      var mb = document.createElement('button');
      mb.className = 'mn-btn'; mb.id = 'mnav-effectifs';
      mb.innerHTML = '<span class="mn-icon">👥</span><span>Effectifs</span>';
      mn.parentNode.insertBefore(mb, mn.nextSibling);
      mb.addEventListener('click', function () { btn.click(); });
    }

    var sec = document.createElement('div');
    sec.id = 'effectifs'; sec.className = 'section';
    sec.innerHTML = '<div class="admin-header"><div class="admin-header-title">👥 Effectifs des clubs</div>' +
      '<div class="admin-header-sub">Listes soumises par les clubs, en attente de validation</div></div><div id="effectifs-list"></div>';
    main.appendChild(sec);
    sec.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]');
      if (b) decide(b.getAttribute('data-id'), b.getAttribute('data-act') === 'ok');
    });
    btn.addEventListener('click', function () {
      document.querySelectorAll('.main-content .section').forEach(function (s) { s.classList.remove('active'); });
      sec.classList.add('active');
      document.querySelectorAll('.sidebar .nav-item, .mn-btn').forEach(function (n) { n.classList.remove('active'); });
      btn.classList.add('active');
      var t = document.getElementById('topbar-title');
      if (t && t.firstChild) t.firstChild.textContent = 'Effectifs clubs';
      var sb = document.getElementById('sidebar'); if (sb) sb.classList.remove('open');
      var ov = document.getElementById('sidebar-overlay'); if (ov) ov.classList.remove('open');
      window.scrollTo(0, 0);
      render();
    });
    document.addEventListener('click', function (ev) {
      if (ev.target.closest('#nav-effectifs, #mnav-effectifs')) return;
      if (ev.target.closest('.sidebar .nav-item, .mn-btn')) { sec.classList.remove('active'); btn.classList.remove('active'); }
    }, true);
    counts(); render();
    return true;
  }

  var hashDone = false;
  function hashGo() {
    if (hashDone || location.hash !== '#effectifs') return;
    var btn = document.getElementById('nav-effectifs');
    if (!btn || !uid()) return;
    hashDone = true;
    setTimeout(function () { btn.click(); }, 800);
  }

  var tries = 0, t = setInterval(function () {
    tries++;
    inject(); start(); counts(); hashGo();
    if (tries > 120) clearInterval(t);
  }, 1500);
})(window);
