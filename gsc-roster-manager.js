/**
 * GSC-ROSTER-MANAGER.JS - Editeur d'effectifs du club (joueurs + staff)
 * Chantier effectifs et listes publiques. Expose window.GSCRosterManager.open(structureId)
 * Public: rosters/{sid}_{saison}_{cat} | Prive: rostersPrivate/{meme id}
 */
(function (window) {
  'use strict';
  var STATUTS = ['Actif', 'Arrivé', 'Parti', 'Prêté'];
  var VIS = [['prive', 'Privée'], ['membres', 'Membres connectés'], ['public', 'Publique']];
  var CATS_DEF = ['U7', 'U9', 'U11', 'U13', 'U15', 'U17', 'U20', 'Senior', 'Vétéran'];
  var S = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function myUid() {
    try {
      var up = window.userProfile;
      if (up && (up.uid || up.id)) return up.uid || up.id;
      return (window.auth && window.auth.currentUser && window.auth.currentUser.uid) ||
        (window.currentUser && window.currentUser.uid) ||
        (window.firebase && window.firebase.auth && window.firebase.auth().currentUser &&
          window.firebase.auth().currentUser.uid) || null;
    } catch (e) { return null; }
  }
  function slug(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function rid(sid, saison, cat) { return sid + '_' + slug(saison) + '_' + slug(cat); }
  function newId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function R() { return window.GSCRosterRules; }

  function catsFor(disc) {
    try {
      var D = window.GSCDisciplines;
      var c = D && D.getCategories && D.getCategories(disc);
      if (c && c.length) return c.slice();
    } catch (e) {}
    return CATS_DEF;
  }

  /* ---- Lien avec un compte inscrit (ID dans l'app) ---- */
  function actorUid(a) { return a.uid || a.id; }
  function actorName(a) { return [a.prenom, a.nom, a.nomOrganisation].filter(Boolean).join(' '); }
  function computedId(a) {
    try {
      return a.gscId || (typeof window.generateGscId === 'function'
        ? window.generateGscId(actorUid(a), a.role || 'joueur') : '');
    } catch (e) { return ''; }
  }
  async function resolveGscId(txt) {
    var t = String(txt || '').trim().toUpperCase();
    if (!t) return { status: 'vide' };
    var hits = [];
    (window.allActors || []).forEach(function (a) {
      if (String(computedId(a)).toUpperCase() === t) hits.push(a);
    });
    if (!hits.length && window.db) {
      try {
        var snap = await window.getDocs(window.query(window.collection(window.db, 'users'), window.where('gscId', '==', t)));
        snap.forEach(function (d) { var x = d.data(); x.uid = d.id; hits.push(x); });
      } catch (e) {}
    }
    if (hits.length === 1) return { status: 'ok', uid: actorUid(hits[0]), nom: actorName(hits[0]) };
    return { status: hits.length ? 'ambigu' : 'introuvable' };
  }
  async function resolveItem(x) {
    var r = await resolveGscId(x.gscId);
    x.gscUid = r.status === 'ok' ? r.uid : '';
    x.lienNom = r.status === 'ok' ? r.nom : '';
    x.lienStatus = r.status;
  }
  function lienField(t, i, x) {
    var h = inp(t, i, 'gscId', x.gscId, "ID dans l'app (optionnel)");
    if (x.gscUid) h += '<div style="font-size:12px;color:#15803d">✓ Lié : ' + esc(x.lienNom || x.gscUid) + '</div>';
    else if (x.lienStatus === 'ambigu') h += '<div style="font-size:12px;color:#b91c1c">ID ambigu : plusieurs comptes</div>';
    else if (x.gscId && x.lienStatus) h += '<div style="font-size:12px;color:#b91c1c">ID introuvable</div>';
    return h;
  }

  async function loadAll(sid) {
    var q1 = window.query(window.collection(window.db, 'rosters'), window.where('structureId', '==', sid));
    var q2 = window.query(window.collection(window.db, 'rostersPrivate'), window.where('structureId', '==', sid));
    var a = await window.getDocs(q1), b = await window.getDocs(q2);
    S.pub = {}; S.priv = {};
    a.forEach(function (d) { S.pub[d.id] = d.data(); });
    b.forEach(function (d) { S.priv[d.id] = d.data(); });
  }

  function loadCurrent() {
    var id = rid(S.sid, S.saison, S.cat), p = S.pub[id], v = S.priv[id];
    var pm = {}, sm = {};
    ((v && v.joueurs) || []).forEach(function (x) { pm[x.id] = x; });
    ((v && v.staff) || []).forEach(function (x) { sm[x.id] = x; });
    S.vis = p ? p.visibility : 'prive';
    S.validation = p ? p.validation : 'draft';
    S.joueurs = ((p && p.joueurs) || []).map(function (j) {
      var q = pm[j.id] || {};
      return { id: j.id, num: j.num || '', prenom: j.prenom || '', nom: q.nom || '',
        poste: j.poste || '', statut: j.statut || 'Actif', annee: q.anneeNaissance || '',
        consent: !!q.consentementParental, contact: q.contact || '', licence: q.licence || '',
        gscId: j.gscId || '', gscUid: j.gscUid || '' };
    });
    S.staff = ((p && p.staff) || []).map(function (s) {
      var q = sm[s.id] || {};
      return { id: s.id, prenom: s.prenom || '', nom: s.nom || '', role: s.role || '', contact: q.contact || '',
        gscId: s.gscId || '', gscUid: s.gscUid || '' };
    });
  }

  function opts(list, sel) {
    return list.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  }
  function inp(t, i, k, v, ph, type, w) {
    return '<input data-t="' + t + '" data-i="' + i + '" data-k="' + k + '" value="' + esc(v) +
      '" placeholder="' + esc(ph) + '" type="' + (type || 'text') + '" style="' + (w || 'width:100%') +
      ';padding:6px;margin:2px 0;box-sizing:border-box">';
  }
  function sel(t, i, k, list, v) {
    return '<select data-t="' + t + '" data-i="' + i + '" data-k="' + k +
      '" style="width:100%;padding:6px;margin:2px 0">' + opts(list, v) + '</select>';
  }

  function render() {
    var rules = R() && R().getRules(S.disc);
    var postes = R() ? R().getPostes(S.disc) : [];
    var roles = R() ? R().getStaffRoles() : [];
    var chk = R() ? R().validerEffectif(S.disc, S.joueurs.length) : { level: 'ok', message: '' };
    var h = '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<b>Effectifs · ' + esc(S.disc) + '</b><button data-a="close">✕</button></div>';
    if (!rules) h += '<p style="color:#b45309">Pas encore de règles pour cette discipline : saisie libre.</p>';
    else if (rules.aVerifier) h += '<p style="font-size:12px;color:#b45309">Règles indicatives, à confirmer auprès de la fédération.</p>';
    h += '<label>Saison <input data-k="saison" value="' + esc(S.saison) + '" style="padding:6px;width:110px"></label> ';
    h += '<label>Catégorie <select data-k="cat" style="padding:6px">' + opts(S.cats, S.cat) + '</select></label> ';
    h += '<label>Visibilité <select data-k="vis" style="padding:6px">' + opts(VIS, S.vis) + '</select></label>';
    h += '<p style="font-size:12px">Statut de la liste : <b>' + esc(S.validation) + '</b></p>';
    h += '<h4>Joueurs (' + S.joueurs.length + ')</h4>';
    if (chk.message) h += '<p style="color:' + (chk.level === 'error' ? '#b91c1c' : '#b45309') + '">' + esc(chk.message) + '</p>';
    S.joueurs.forEach(function (j, i) {
      var mineur = R() ? R().estMineur(j.annee, parseInt(S.saison, 10)) : true;
      h += '<div style="border:1px solid #8884;border-radius:8px;padding:8px;margin:6px 0">' +
        inp('j', i, 'num', j.num, 'N°', 'text', 'width:25%') + inp('j', i, 'prenom', j.prenom, 'Prénom', 'text', 'width:70%') +
        inp('j', i, 'nom', j.nom, 'Nom') + sel('j', i, 'poste', [''].concat(postes), j.poste) +
        sel('j', i, 'statut', STATUTS, j.statut) + lienField('j', i, j) +
        inp('j', i, 'annee', j.annee, 'Année de naissance (privé)', 'number') +
        inp('j', i, 'contact', j.contact, 'Contact (privé)') + inp('j', i, 'licence', j.licence, 'N° licence (privé)');
      if (mineur) h += '<label style="font-size:12px"><input type="checkbox" data-t="j" data-i="' + i +
        '" data-k="consent"' + (j.consent ? ' checked' : '') + '> Autorisation parentale enregistrée (mineur)</label><br>';
      h += '<button data-a="delj" data-i="' + i + '">Retirer</button></div>';
    });
    h += '<button data-a="addj">+ Joueur</button>';
    h += '<h4>Staff (' + S.staff.length + ')</h4>';
    S.staff.forEach(function (s, i) {
      h += '<div style="border:1px solid #8884;border-radius:8px;padding:8px;margin:6px 0">' +
        inp('s', i, 'prenom', s.prenom, 'Prénom') + inp('s', i, 'nom', s.nom, 'Nom') +
        sel('s', i, 'role', [''].concat(roles), s.role) + lienField('s', i, s) +
        inp('s', i, 'contact', s.contact, 'Contact (privé)') +
        '<button data-a="dels" data-i="' + i + '">Retirer</button></div>';
    });
    h += '<button data-a="adds">+ Staff</button><p id="gsc-ro-msg" style="min-height:20px"></p>' +
      '<button data-a="save">Enregistrer (brouillon)</button> ' +
      '<button data-a="submit">Soumettre pour validation</button>' +
      '<p style="font-size:11px;opacity:.7">Liste informative : elle ne remplace pas la licence officielle.</p>';
    S.box.innerHTML = h;
  }

  function msg(t, ok) {
    var m = document.getElementById('gsc-ro-msg');
    if (m) { m.style.color = ok ? '#15803d' : '#b91c1c'; m.textContent = t; }
  }

  async function save(submit) {
    var n = parseInt(S.saison, 10);
    var chk = R() ? R().validerEffectif(S.disc, S.joueurs.length) : { ok: true };
    if (!chk.ok) return msg(chk.message);
    for (var i = 0; i < S.joueurs.length; i++) {
      var j = S.joueurs[i];
      if (!j.prenom.trim()) return msg('Joueur ' + (i + 1) + ' : prénom obligatoire');
      var mineur = R() ? R().estMineur(j.annee, n) : true;
      if (S.vis === 'public' && mineur && !j.consent)
        return msg('Publication publique impossible : autorisation parentale manquante (joueur ' + (i + 1) + ')');
    }
    var lst = S.joueurs.map(function (x) { return ['Joueur', x]; })
      .concat(S.staff.map(function (x) { return ['Staff', x]; }));
    for (var k = 0; k < lst.length; k++) {
      var it = lst[k][1];
      if (it.gscId && it.gscId.trim()) {
        if (!it.gscUid) await resolveItem(it);
        if (!it.gscUid) {
          render();
          return msg(lst[k][0] + ' ' + (it.prenom || '') + ' : ID dans l\'app ' +
            (it.lienStatus === 'ambigu' ? 'ambigu' : 'introuvable') + ' (corrige ou vide le champ)');
        }
      } else { it.gscUid = ''; it.lienNom = ''; }
    }
    var id = rid(S.sid, S.saison, S.cat), uid = myUid();
    var pubJ = S.joueurs.map(function (j) {
      var mineur = R() ? R().estMineur(j.annee, n) : true;
      var nm = j.nom.trim();
      var aff = mineur ? (nm ? nm.charAt(0).toUpperCase() + '.' : '') : nm;
      return { id: j.id, num: String(j.num || ''), prenom: j.prenom.trim(), nomAffiche: aff, poste: j.poste, statut: j.statut,
        gscId: (j.gscId || '').trim().toUpperCase(), gscUid: j.gscUid || '', lienAutorise: !mineur || !!j.consent };
    });
    var privJ = S.joueurs.map(function (j) {
      return { id: j.id, nom: j.nom.trim(), prenom: j.prenom.trim(), anneeNaissance: j.annee ? Number(j.annee) : null,
        contact: j.contact, licence: j.licence, consentementParental: !!j.consent };
    });
    var pubS = S.staff.map(function (s) {
      return { id: s.id, prenom: s.prenom.trim(), nom: s.nom.trim(), role: s.role,
        gscId: (s.gscId || '').trim().toUpperCase(), gscUid: s.gscUid || '', lienAutorise: true };
    });
    var privS = S.staff.map(function (s) { return { id: s.id, contact: s.contact }; });
    var validation = submit ? 'pending' : 'draft';
    try {
      await window.setDoc(window.doc(window.db, 'rosters', id), {
        structureId: S.sid, discipline: S.disc, saison: S.saison, categorie: S.cat, visibility: S.vis,
        validation: validation, joueurs: pubJ, staff: pubS, updatedBy: uid, updatedAt: window.serverTimestamp()
      });
      await window.setDoc(window.doc(window.db, 'rostersPrivate', id), {
        structureId: S.sid, saison: S.saison, categorie: S.cat, joueurs: privJ, staff: privS,
        updatedBy: uid, updatedAt: window.serverTimestamp()
      });
      await loadAll(S.sid);
      S.validation = validation;
      render();
      msg(submit ? 'Liste soumise à la validation.' : 'Brouillon enregistré.', true);
    } catch (e) { msg('Erreur : ' + (e && e.message || e)); }
  }

  function onInput(ev) {
    var el = ev.target, k = el.dataset.k, t = el.dataset.t;
    if (!k) return;
    var val = el.type === 'checkbox' ? el.checked : el.value;
    if (t === 'j' || t === 's') {
      var item = (t === 'j' ? S.joueurs : S.staff)[Number(el.dataset.i)];
      item[k] = val;
      if (k === 'gscId') {
        item.gscUid = ''; item.lienNom = ''; item.lienStatus = '';
        if (ev.type === 'change') resolveItem(item).then(render);
        return;
      }
      if (ev.type === 'change' && k === 'annee') render();
      return;
    }
    if (ev.type !== 'change') return;
    S[k] = val;
    if (k === 'saison' || k === 'cat') { loadCurrent(); }
    render();
  }

  function onClick(ev) {
    var a = ev.target.dataset && ev.target.dataset.a, i = Number(ev.target.dataset.i);
    if (!a) return;
    if (a === 'close') return close();
    if (a === 'addj') S.joueurs.push({ id: newId(), num: '', prenom: '', nom: '', poste: '', statut: 'Actif', annee: '', consent: false, contact: '', licence: '', gscId: '', gscUid: '' });
    if (a === 'adds') S.staff.push({ id: newId(), prenom: '', nom: '', role: '', contact: '', gscId: '', gscUid: '' });
    if (a === 'delj') S.joueurs.splice(i, 1);
    if (a === 'dels') S.staff.splice(i, 1);
    if (a === 'save') return save(false);
    if (a === 'submit') return save(true);
    render();
  }

  function close() {
    var o = document.getElementById('gsc-roster-overlay');
    if (o) o.remove();
    S = null;
  }

  async function open(structureId) {
    if (!window.db || !window.userProfile) { alert('Connecte-toi pour gérer les effectifs.'); return; }
    close();
    var o = document.createElement('div');
    o.id = 'gsc-roster-overlay';
    o.style.cssText = 'position:fixed;inset:0;background:#000a;z-index:99999;display:flex;align-items:flex-start;justify-content:center;overflow:auto';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;color:#111;width:100%;max-width:560px;margin:0;padding:12px;min-height:100%;box-sizing:border-box';
    o.appendChild(box); document.body.appendChild(o);
    box.addEventListener('input', onInput); box.addEventListener('change', onInput); box.addEventListener('click', onClick);
    S = { sid: structureId, box: box, saison: '2026-2027', pub: {}, priv: {}, joueurs: [], staff: [], vis: 'prive', validation: 'draft', disc: '' };
    box.innerHTML = 'Chargement…';
    try {
      var snap = await window.getDoc(window.doc(window.db, 'structuresSportives', structureId));
      if (!snap.exists()) { box.innerHTML = 'Structure introuvable. <button data-a="close">Fermer</button>'; return; }
      S.disc = snap.data().discipline || '';
      S.cats = catsFor(S.disc); S.cat = S.cats.indexOf('Senior') >= 0 ? 'Senior' : S.cats[0];
      await loadAll(structureId);
      loadCurrent(); render();
    } catch (e) {
      box.innerHTML = 'Erreur : ' + esc(e && e.message || e) + ' <button data-a="close">Fermer</button>';
    }
  }

  window.GSCRosterManager = { open: open, close: close, _rid: rid };
})(window);
