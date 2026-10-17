/* GSC-ROSTER-ADMIN.JS — validation admin des effectifs + badges de comptage */
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

  function injectCss() {
    if (document.getElementById('gsc-ro-css')) return;
    var s = document.createElement('style');
    s.id = 'gsc-ro-css';
    s.textContent =
      '.gsc-ro-nb{position:absolute;top:-4px;right:-5px;min-width:17px;height:17px;padding:0 4px;background:#ef4444;color:#fff;border:2px solid #fff;border-radius:99px;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none;z-index:50}' +
      '.sidebar .nav-item,.topbar .btn-menu,.mn-btn{overflow:visible}' +
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

  function setBadge(el, n) {
    if (!el) return;
    var b = el.querySelector(':scope > .gsc-ro-nb');
    if (n <= 0) { if (b) b.remove(); return; }
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    if (!b) { b = document.createElement('span'); b.className = 'gsc-ro-nb'; el.appendChild(b); }
    b.textContent = n > 99 ? '99+' : String(n);
  }
  function counts() {
    var n = S.list.length;
    var c = document.getElementById('nav-effectifs-count');
    if (c) { c.textContent = n > 99 ? '99+' : String(n); c.style.display = n > 0 ? '' : 'none'; }
    setBadge(document.querySelector('.topbar .btn-menu'), n);
    setBadge(document.getElementById('nav-structures'), n);
    setBadge(document.getElementById('mnav-structures'), n);
  }

  async function nameOf(sid) {
    if (!sid) return '';
    if (S.names[sid]) return S.names[sid];
    try {
      var d = await window.getDoc(window.doc(window.db, 'structuresSportives', sid));
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
      await window.setDoc(window.doc(window.db, 'rosters', id), {
        validation: ok ? 'validated' : 'rejected',
        validatedBy: uid(), validatedAt: window.serverTimestamp(),
        rejectReason: ok ? '' : reason.trim()
      }, { merge: true });
      if (window.GSCNotif && window.GSCNotif.push && r.updatedBy) {
        var nm = S.names[r.structureId] || r.structureId;
        window.GSCNotif.push({
          type: 'validate', personal: true, recipientId: r.updatedBy, link: 'index.html',
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
    if (S.started || S.errors >= 5 || !uid() || !window.db || !window.query || !window.getDocs) return;
    S.started = true;
    var q = window.query(window.collection(window.db, 'rosters'), window.where('validation', '==', 'pending'));
    function fail(e) { console.warn('[GSC roster-admin]', e); S.started = false; S.errors++; }
    if (window.onSnapshot) {
      try { window.onSnapshot(q, onData, fail); return; } catch (e) {}
    }
    var poll = function () { window.getDocs(q).then(onData).catch(fail); };
    poll(); setInterval(poll, 30000);
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
      document.querySelectorAll('.sidebar .nav-item').forEach(function (n) { n.classList.remove('active'); });
      btn.classList.add('active');
      var t = document.getElementById('topbar-title');
      if (t) t.firstChild.textContent = 'Effectifs clubs';
      var sb = document.getElementById('sidebar'); if (sb) sb.classList.remove('open');
      render();
    });
    document.addEventListener('click', function (ev) {
      if (ev.target.closest('#nav-effectifs')) return;
      if (ev.target.closest('.sidebar .nav-item, .mn-btn')) { sec.classList.remove('active'); btn.classList.remove('active'); }
    }, true);
    counts(); render();
    return true;
  }

  var tries = 0, t = setInterval(function () {
    tries++;
    inject(); start(); counts();
    if (tries > 120) clearInterval(t);
  }, 1500);
})(window);
