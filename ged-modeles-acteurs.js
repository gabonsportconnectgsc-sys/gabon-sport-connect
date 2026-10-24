/* GSC — Modèles de documents recommandés par type d'acteur (admin) */
(function () {
  'use strict';
  var COL = 'ged_modeles_acteurs';
  var ROLES = [
    ['joueur', '⚽ Joueur'], ['athlete', '🏃 Athlète'], ['entraineur', '📋 Entraîneur'], ['arbitre', '🟨 Arbitre'],
    ['club', '🏟️ Club'], ['association', '🤝 Association'], ['federation', '🏛️ Fédération'], ['organisateur', '🎪 Organisateur'],
    ['ecole_universite', '🏫 École / Université'], ['formateur', '🧑‍🏫 Formateur'], ['eleve_etudiant', '🎓 Élève / Étudiant'],
    ['ancien_sportif', '🎖️ Ancien sportif'], ['handisport', '🦾 Handisport'], ['gabonais_diaspora', '🇬🇦 Gabonais sportif à l’étranger'], ['sportif_etranger', '🌍 Sportif étranger'],
    ['independant', '🚴 Indépendant'], ['supporter', '💗 Supporter']
  ];
  var ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
  var EMET = { organisation: 'Organisation', federation: 'Fédération', administration: 'Administration GSC' };
  var all = [];
  var role = ROLES[0][0];
  var busy = false;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function ref() { return window.db ? window.db.collection(COL) : null; }
  function FV() { return firebase.firestore.FieldValue; }
  function who() { try { return firebase.auth().currentUser.uid; } catch (e) { return 'admin'; } }
  function view(d) { return Object.assign({}, d, d.draft || {}); }
  function ofRole() { return all.filter(function (d) { return d.role === role; }); }
  function pending() { return all.filter(function (d) { return d.draft; }); }

  async function load() {
    var r = ref();
    if (!r) return;
    try {
      var snap = await r.get();
      all = snap.docs.map(function (x) { return Object.assign({ id: x.id }, x.data()); });
      all.sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0); });
    } catch (e) {
      console.warn('[GMA] lecture impossible', e);
      if (e && e.code === 'permission-denied' && (window.__gmaRetry = (window.__gmaRetry || 0) + 1) <= 3) { setTimeout(load, 2500 * window.__gmaRetry); return; }
      var b = document.getElementById('gma-body');
      if (b) b.innerHTML = '<p style="color:#b91c1c">Lecture impossible : ' + esc(e.message) + ' (règles Firestore déployées ? admin connecté ?)</p>';
      return;
    }
    render();
  }

  function render() {
    var tabs = document.getElementById('gma-roles');
    var body = document.getElementById('gma-body');
    var foot = document.getElementById('gma-foot');
    if (!tabs || !body || !foot) return;
    tabs.innerHTML = ROLES.map(function (r) {
      var on = r[0] === role;
      return '<button type="button" class="btn-sm" data-a="role" data-r="' + esc(r[0]) + '" style="margin:2px;' + (on ? 'background:#009E60;color:#fff;' : '') + '">' + esc(r[1]) + '</button>';
    }).join('');
    var rows = ofRole().map(function (d) {
      var v = view(d);
      var gone = !!(d.draft && d.draft._suppr);
      var badge = gone ? ' <span style="color:#b91c1c;font-weight:700">● retrait en attente</span>'
        : (d.draft ? ' <span style="color:#b45309;font-weight:700">● modifié, non déployé</span>' : '');
      var em = v.emetteur ? ' · ' + esc(EMET[v.emetteur] || '') + (v.emetteurNom ? ' — ' + esc(v.emetteurNom) : '') : '';
      var model = v.url
        ? '<a href="' + esc(v.url) + '" target="_blank" rel="noopener">📄 ' + esc(v.fileName || 'Modèle') + '</a>' + em
        : '<span style="color:#6b7280">Aucun modèle</span>';
      var id = esc(d.id);
      return '<div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin:8px 0;' + (gone ? 'opacity:.55;' : '') + '">'
        + '<div style="font-weight:700">' + esc(v.nom || '(sans nom)') + ' '
        + (v.obligatoire ? '<span style="color:#b91c1c;font-size:11px">Obligatoire</span>' : '<span style="color:#6b7280;font-size:11px">Optionnel</span>') + badge + '</div>'
        + (v.description ? '<div style="font-size:12px;color:#6b7280">' + esc(v.description) + '</div>' : '')
        + '<div style="font-size:12px;margin:6px 0">' + model + (v.version ? ' · v' + esc(v.version) : '') + '</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:6px">'
        + '<button type="button" class="btn-sm" data-a="model" data-id="' + id + '">' + (v.url ? '🔄 Remplacer le modèle officiel' : '📤 Proposer le modèle officiel') + '</button>'
        + '<button type="button" class="btn-sm" data-a="edit" data-id="' + id + '">✏️ Modifier</button>'
        + '<button type="button" class="btn-sm" data-a="remove" data-id="' + id + '">🗑️ Retirer</button>'
        + (d.draft ? '<button type="button" class="btn-sm" data-a="cancel" data-id="' + id + '">↩️ Annuler le brouillon</button>' : '')
        + '</div></div>';
    }).join('');
    body.innerHTML = rows || '<p style="color:#6b7280;font-size:13px">Aucun type de document pour ce rôle. Touchez « ➕ Ajouter ».</p>';
    var n = pending().length;
    foot.innerHTML = '<button type="button" class="btn-sm" data-a="deploy" style="padding:10px 14px;font-weight:700;' + (n ? 'background:#009E60;color:#fff;' : 'opacity:.6;') + '">✅ Enregistrer et déployer (' + n + ' changement' + (n > 1 ? 's' : '') + ')</button>';
  }

  async function add() {
    var nom = (prompt("Nom du document à fournir (ex. Carte d'identité, Licence…)", '') || '').trim();
    if (!nom) return;
    var description = (prompt('Consigne pour le membre (facultatif)', '') || '').trim();
    var obligatoire = confirm('Ce document est-il OBLIGATOIRE ?\nOK = obligatoire, Annuler = optionnel');
    await ref().add({ role: role, publie: false, ordre: Date.now(), creePar: who(), draft: { nom: nom, description: description, obligatoire: obligatoire } });
  }

  async function edit(d) {
    var v = view(d);
    var nom = (prompt('Nom du document', v.nom || '') || '').trim();
    if (!nom) return;
    var description = (prompt('Consigne pour le membre (facultatif)', v.description || '') || '').trim();
    var obligatoire = confirm('Obligatoire ?\nOK = obligatoire, Annuler = optionnel');
    await ref().doc(d.id).update({ draft: Object.assign({}, d.draft || {}, { nom: nom, description: description, obligatoire: obligatoire }) });
  }

  function pickFile() {
    return new Promise(function (res) {
      var i = document.createElement('input');
      i.type = 'file'; i.accept = ACCEPT;
      i.onchange = function () { res(i.files[0] || null); };
      i.oncancel = function () { res(null); };
      i.click();
    });
  }

  async function model(d) {
    var file = await pickFile();
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Fichier trop lourd (max 10 Mo).'); return; }
    if (!file.type) { alert('Format non reconnu. Utilisez une image, un PDF, un fichier Word ou Excel.'); return; }
    var c = (prompt('Émetteur du modèle officiel :\n1 = Propriétaire / organisation\n2 = Fédération\n3 = Administration GSC', '3') || '').trim();
    if (['1', '2', '3'].indexOf(c) < 0) { alert('Import annulé : tapez 1, 2 ou 3.'); return; }
    var emetteur = { '1': 'organisation', '2': 'federation', '3': 'administration' }[c];
    var emetteurNom = (prompt("Nom de l'émetteur (facultatif, ex. FEGAFOOT)", '') || '').trim();
    try {
      /* __gscCloudinary */
      var __fd = new FormData();
      __fd.append('file', file);
      __fd.append('upload_preset', 'gsc_admin_uploads');
      var __rp = await fetch('https://api.cloudinary.com/v1_1/djvzc3vqp/auto/upload', { method: 'POST', body: __fd });
      var __rj = await __rp.json().catch(function () { return {}; });
      if (!__rp.ok || !__rj.secure_url) throw new Error('Cloudinary : ' + ((__rj.error && __rj.error.message) || ('HTTP ' + __rp.status)));
      var url = __rj.secure_url;
      var v = view(d);
      /* __gscModeleDirect */
      var __f = { url: url, fileName: file.name, size: file.size, emetteur: emetteur, emetteurNom: emetteurNom, version: (v.version || 0) + 1 };
      if (d.publie) {
        var __up = Object.assign({}, __f, { publieLe: FV().serverTimestamp() });
        if (d.draft) __up.draft = Object.assign({}, d.draft, __f);
        await ref().doc(d.id).update(__up);
      } else {
        await ref().doc(d.id).update({ draft: Object.assign({}, d.draft || {}, __f) });
      }
      alert(d.publie ? '✅ Modèle publié : visible tout de suite par les membres.' : '✅ Modèle ajouté au brouillon. Pensez à « Enregistrer et déployer ».');
    } catch (err) { alert('❌ Erreur import : ' + (err.message || err)); }
    await load();
  }

  async function remove(d) {
    if (!d.publie) { if (confirm('Supprimer ce type de document ?')) await ref().doc(d.id).delete(); return; }
    if (confirm('Retirer ce document des comptes ? (effectif au déploiement)')) {
      await ref().doc(d.id).update({ draft: Object.assign({}, d.draft || {}, { _suppr: true }) });
    }
  }

  async function cancel(d) {
    if (!d.publie) { await ref().doc(d.id).delete(); return; }
    await ref().doc(d.id).update({ draft: FV().delete() });
  }

  async function deploy() {
    var list = pending();
    if (!list.length) { alert('Rien à déployer.'); return; }
    if (!confirm('Déployer ' + list.length + ' changement(s) dans les comptes des acteurs ?')) return;
    var batch = window.db.batch();
    list.forEach(function (d) {
      var r = ref().doc(d.id);
      if (d.draft._suppr) { batch.delete(r); return; }
      var f = Object.assign({}, d.draft);
      delete f._suppr;
      f.publie = true; f.draft = FV().delete(); f.publieLe = FV().serverTimestamp(); f.publiePar = who();
      batch.update(r, f);
    });
    await batch.commit();
    alert('✅ Déployé dans les comptes.');
  }

  async function onClick(e) {
    var b = e.target.closest('[data-a]');
    if (!b) return;
    var a = b.getAttribute('data-a');
    var d = all.find(function (x) { return x.id === b.getAttribute('data-id'); });
    if (a === 'role') { role = b.getAttribute('data-r'); render(); return; }
    if (a === 'model' && d) { model(d); return; }
    if (busy) return;
    busy = true;
    try {
      if (a === 'add') await add();
      else if (a === 'edit' && d) await edit(d);
      else if (a === 'remove' && d) await remove(d);
      else if (a === 'cancel' && d) await cancel(d);
      else if (a === 'deploy') await deploy();
      await load();
    } catch (err) { alert('❌ ' + (err.message || err)); }
    finally { busy = false; }
  }

  function mount() {
    var sec = document.getElementById('documents');
    if (!sec || document.getElementById('gma-panel')) return;
    var p = document.createElement('div');
    p.id = 'gma-panel'; p.className = 'dash-card'; p.style.marginBottom = '16px';
    p.innerHTML = '<div class="dash-card-title">📑 Modèles de documents recommandés — par type d\'acteur</div>'
      + '<p style="font-size:12px;color:#6b7280;margin:6px 0 10px">Définissez les documents demandés à chaque type d\'acteur et proposez le modèle officiel. Les changements restent en brouillon jusqu\'à « Enregistrer et déployer ».</p>'
      + '<div id="gma-roles"></div>'
      + '<div style="margin:8px 0"><button type="button" class="btn-sm" data-a="add">➕ Ajouter un type de document</button></div>'
      + '<div id="gma-body"></div><div id="gma-foot" style="margin-top:10px"></div>';
    sec.insertBefore(p, sec.firstChild);
    p.addEventListener('click', onClick);
    render();
  }

  function init() {
    mount();
    load();
    var nav = document.getElementById('nav-documents');
    if (nav) nav.addEventListener('click', function () { setTimeout(load, 400); });
    document.addEventListener('firebase-ready', load);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
