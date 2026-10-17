/**
 * GSC-ROSTER-PUBLIC.JS - Page publique des effectifs d'un club + raccourcis du profil club
 * Lit rosters/{sid}_{saison}_{cat} (listes validees par l'admin uniquement).
 * Expose window.GSCRosterPublic.open(structureId), window.gscOpenMyRosters(), window.gscViewMyRosters()
 *
 * Confidentialite : le lien vers le compte (photo, fiche, QR) n'apparait que si la ligne est liee
 * a un compte inscrit ET autorisee (lienAutorise : adulte, ou mineur avec autorisation parentale).
 */
(function (window) {
  'use strict';
  var S = null;
  var actorCache = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeUrl(u) {
    if (!u) return '';
    try {
      if (typeof window.sanitizeUrl === 'function') return window.sanitizeUrl(u) || '';
    } catch (e) {}
    return /^(https?:\/\/|data:image\/)/i.test(u) ? u : '';
  }
  function isLogged() {
    return !!(window.userProfile || (window.auth && window.auth.currentUser));
  }

  async function fetchRosters(sid) {
    var out = {}, vis = ['public'];
    if (isLogged()) vis.push('membres');
    for (var i = 0; i < vis.length; i++) {
      try {
        var q = window.query(window.collection(window.db, 'rosters'),
          window.where('structureId', '==', sid),
          window.where('validation', '==', 'validated'),
          window.where('visibility', '==', vis[i]));
        var snap = await window.getDocs(q);
        snap.forEach(function (d) { out[d.id] = d.data(); });
      } catch (e) { /* requete membres refusee hors connexion : on ignore */ }
    }
    return Object.keys(out).map(function (id) { var r = out[id]; r._id = id; return r; });
  }

  async function getActor(uid) {
    if (!uid) return null;
    if (actorCache[uid] !== undefined) return actorCache[uid];
    var a = (window.allActors || []).find(function (x) { return (x.uid || x.id) === uid; }) || null;
    if (!a && window.db) {
      try {
        var d = await window.getDoc(window.doc(window.db, 'users', uid));
        if (d.exists()) { a = d.data(); a.uid = uid; }
      } catch (e) {}
    }
    actorCache[uid] = a;
    return a;
  }
  function photoOf(a) {
    if (!a) return '';
    return safeUrl(a.photoURL || (a.photo && String(a.photo).indexOf('data:') === 0 ? a.photo : ''));
  }
  function qrUrl(uid) {
    try { if (typeof window.buildQrUrl === 'function') return window.buildQrUrl(uid); } catch (e) {}
    return location.origin + location.pathname + '?actor=' + encodeURIComponent(uid);
  }

  /* ---- Rendu ---- */
  function uniq(arr) { return arr.filter(function (v, i) { return arr.indexOf(v) === i; }); }

  function rowHtml(kind, x) {
    var linked = !!(x.gscUid && x.lienAutorise);
    var a = linked ? actorCache[x.gscUid] : null;
    var ph = linked ? photoOf(a) : '';
    var name = kind === 'j'
      ? [x.prenom, x.nomAffiche].filter(Boolean).join(' ')
      : [x.prenom, x.nom].filter(Boolean).join(' ');
    var sub = kind === 'j'
      ? [x.poste, x.statut && x.statut !== 'Actif' ? x.statut : ''].filter(Boolean).join(' · ')
      : (x.role || '');
    var h = '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #8883">';
    if (ph) {
      h += '<img src="' + esc(ph) + '" alt="" data-a="photo" data-u="' + esc(x.gscUid) + '" data-n="' + esc(name) +
        '" style="width:44px;height:44px;border-radius:50%;object-fit:cover;cursor:zoom-in;flex-shrink:0">';
    } else {
      h += '<div style="width:44px;height:44px;border-radius:50%;background:#8882;display:flex;align-items:center;' +
        'justify-content:center;flex-shrink:0;font-weight:700">' + esc((name || '?').charAt(0).toUpperCase()) + '</div>';
    }
    h += '<div style="flex:1;min-width:0">';
    if (kind === 'j' && x.num) h += '<span style="font-weight:700;margin-right:6px">N°' + esc(x.num) + '</span>';
    if (linked) {
      h += '<a href="#" data-a="fiche" data-u="' + esc(x.gscUid) + '" style="font-weight:600;color:#009E60;text-decoration:none">' +
        esc(name) + '</a>';
    } else {
      h += '<span style="font-weight:600">' + esc(name) + '</span>';
    }
    if (sub) h += '<div style="font-size:12px;opacity:.75">' + esc(sub) + '</div>';
    h += '</div>';
    if (linked) {
      h += '<canvas data-qr="' + esc(x.gscUid) + '" style="width:56px;height:56px;flex-shrink:0;border-radius:4px"></canvas>';
    }
    return h + '</div>';
  }

  function isCoach(s) { return /entra[iî]neur/i.test(s.role || ''); }

  function render() {
    var h = '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<b>📋 Effectifs · ' + esc(S.nom) + '</b><button data-a="close">✕</button></div>';
    if (!S.rosters.length) {
      h += '<p style="margin-top:16px">Aucun effectif publié pour le moment.</p>';
      S.box.innerHTML = h; return;
    }
    var saisons = uniq(S.rosters.map(function (r) { return r.saison; })).sort().reverse();
    if (saisons.indexOf(S.saison) < 0) S.saison = saisons[0];
    var cats = uniq(S.rosters.filter(function (r) { return r.saison === S.saison; })
      .map(function (r) { return r.categorie; }));
    if (cats.indexOf(S.cat) < 0) S.cat = cats[0];
    h += '<div style="margin:10px 0"><label>Saison <select data-k="saison" style="padding:6px">' +
      saisons.map(function (s) { return '<option' + (s === S.saison ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') +
      '</select></label></div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">' +
      cats.map(function (c) {
        return '<button data-a="cat" data-c="' + esc(c) + '" style="padding:6px 12px;border-radius:16px;border:1px solid #8886;' +
          (c === S.cat ? 'background:#009E60;color:#fff' : 'background:transparent;color:inherit') + '">' + esc(c) + '</button>';
      }).join('') + '</div>';
    var r = S.rosters.filter(function (x) { return x.saison === S.saison && x.categorie === S.cat; })[0];
    if (r) {
      var staff = (r.staff || []).slice().sort(function (a, b) { return (isCoach(b) ? 1 : 0) - (isCoach(a) ? 1 : 0); });
      var jou = (r.joueurs || []).slice().sort(function (a, b) {
        return (parseInt(a.num, 10) || 999) - (parseInt(b.num, 10) || 999);
      });
      if (staff.length) h += '<h4>Encadrement (' + staff.length + ')</h4>' + staff.map(function (x) { return rowHtml('s', x); }).join('');
      h += '<h4>Joueurs (' + jou.length + ')</h4>' + (jou.map(function (x) { return rowHtml('j', x); }).join('') || '<p>—</p>');
    }
    h += '<p style="font-size:11px;opacity:.7;margin-top:14px">Liste informative : elle ne remplace pas la licence officielle.</p>';
    S.box.innerHTML = h;
    var cv = S.box.querySelectorAll('canvas[data-qr]');
    for (var i = 0; i < cv.length; i++) {
      try { if (typeof window.drawQrOnCanvas === 'function') window.drawQrOnCanvas(cv[i], qrUrl(cv[i].dataset.qr), 112); } catch (e) {}
    }
  }

  function zoomPhoto(src, caption) {
    var z = document.createElement('div');
    z.style.cssText = 'position:fixed;inset:0;background:#000e;z-index:100001;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;cursor:zoom-out;padding:16px;box-sizing:border-box';
    z.innerHTML = '<div style="color:#fff;margin-bottom:10px;font-weight:600">' + esc(caption) + '</div>' +
      '<img src="' + esc(src) + '" alt="" style="max-width:100%;max-height:80%;border-radius:8px;object-fit:contain">';
    z.addEventListener('click', function () { z.remove(); });
    document.body.appendChild(z);
  }

  function onClick(ev) {
    var el = ev.target.closest ? ev.target.closest('[data-a]') : ev.target;
    var a = el && el.dataset && el.dataset.a;
    if (!a) return;
    if (a === 'close') return close();
    if (a === 'cat') { S.cat = el.dataset.c; return render(); }
    if (a === 'photo') { ev.preventDefault(); return zoomPhoto(el.src, el.dataset.n); }
    if (a === 'fiche') {
      ev.preventDefault();
      var uid = el.dataset.u;
      close();
      if (typeof window.showView === 'function') window.showView('annuaire');
      setTimeout(function () { if (typeof window.openActorDetail === 'function') window.openActorDetail(uid); }, 250);
    }
  }
  function onChange(ev) {
    var el = ev.target;
    if (el.dataset && el.dataset.k === 'saison') { S.saison = el.value; S.cat = ''; render(); }
  }

  function close() {
    var o = document.getElementById('gsc-roster-public-overlay');
    if (o) o.remove();
    S = null;
  }

  async function open(structureId) {
    if (!window.db) { alert('Service indisponible.'); return; }
    close();
    var o = document.createElement('div');
    o.id = 'gsc-roster-public-overlay';
    o.style.cssText = 'position:fixed;inset:0;background:#000a;z-index:99998;display:flex;align-items:flex-start;justify-content:center;overflow:auto';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;color:#111;width:100%;max-width:560px;padding:12px;min-height:100%;box-sizing:border-box';
    o.appendChild(box); document.body.appendChild(o);
    box.addEventListener('click', onClick); box.addEventListener('change', onChange);
    S = { sid: structureId, box: box, nom: '', rosters: [], saison: '', cat: '' };
    box.innerHTML = 'Chargement…';
    try {
      try {
        var sn = await window.getDoc(window.doc(window.db, 'structuresSportives', structureId));
        if (sn.exists()) S.nom = sn.data().nom || '';
      } catch (e) {}
      S.rosters = await fetchRosters(structureId);
      var uids = [];
      S.rosters.forEach(function (r) {
        (r.joueurs || []).concat(r.staff || []).forEach(function (x) {
          if (x.gscUid && x.lienAutorise && uids.indexOf(x.gscUid) < 0) uids.push(x.gscUid);
        });
      });
      await Promise.all(uids.map(getActor));
      if (!S) return;
      render();
    } catch (e) {
      if (S) box.innerHTML = 'Erreur : ' + esc(e && e.message || e) + ' <button data-a="close">Fermer</button>';
    }
  }

  /* ---- Liaison automatique compte club/association <-> fiche structure ---- */
  var ORG_AUTO = { club: 'Club', association: 'Association' };
  var ensuring = null;

  function ensureMyStructure() {
    if (ensuring) return ensuring;
    ensuring = (async function () {
      var up = window.userProfile;
      var uid = up && (up.uid || up.id);
      if (!up || !uid || !ORG_AUTO[up.role] || !window.db) return null;
      if (up.structureId) return up.structureId;
      var sid = null;
      // 1. une fiche deja liee a ce compte (creee par l'admin ou automatiquement)
      try {
        var snap = await window.getDocs(window.query(window.collection(window.db, 'structuresSportives'),
          window.where('linkedUserId', '==', uid), window.limit(1)));
        snap.forEach(function (d) { sid = d.id; });
      } catch (e) {}
      // 2. sinon creation de la fiche (identifiant fixe : pas de doublon possible)
      if (!sid) {
        sid = 'auto_' + uid;
        var ref = window.doc(window.db, 'structuresSportives', sid);
        var ex = await window.getDoc(ref);
        if (!ex.exists()) {
          var full = [up.prenom, up.nom].filter(Boolean).join(' ');
          await window.setDoc(ref, {
            nom: up.nomOrganisation || full || 'Structure sans nom',
            type: ORG_AUTO[up.role],
            discipline: up.sport || (Array.isArray(up.sports) ? up.sports[0] : '') || 'Football',
            ville: up.ville || '',
            telephone: up.telephone || up.tel || '',
            email: up.email || '',
            status: 'active',
            linkedUserId: uid,
            source: 'auto-compte',
            addedBy: uid,
            createdAt: window.serverTimestamp()
          });
        }
      }
      // 3. rattachement du compte (necessite la regle Firestore mise a jour ; sans elle la fiche reste utilisable)
      try {
        await window.updateDoc(window.doc(window.db, 'users', uid), { structureId: sid });
        up.structureId = sid;
      } catch (e) {}
      return sid;
    })().catch(function (e) { console.warn('[GSC] liaison structure :', e); return null; })
      .then(function (r) { ensuring = null; return r; });
    return ensuring;
  }

  window.gscOpenMyRosters = async function () {
    var sid = await ensureMyStructure();
    if (!sid) { alert('Impossible de préparer la fiche de ta structure pour le moment. Réessaie dans un instant.'); return; }
    if (window.GSCRosterManager) window.GSCRosterManager.open(sid);
  };
  window.gscViewMyRosters = async function () {
    var sid = await ensureMyStructure();
    if (!sid) { alert('Impossible de préparer la fiche de ta structure pour le moment. Réessaie dans un instant.'); return; }
    open(sid);
  };
  window.gscEnsureMyStructure = ensureMyStructure;

  window.GSCRosterPublic = { open: open, close: close, ensureMyStructure: ensureMyStructure };
})(window);
