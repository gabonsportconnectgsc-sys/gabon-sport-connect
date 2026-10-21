/* ==========================================================
   GSC — Admin : gestion du calendrier des compétitions
   Fichier dédié : js/competitions-admin.js  (+ css/competitions-admin.css)
   Dépend de : timeline-competitions.js, competitions-data.js, competitions-service.js
   Usage (dans la console admin) :
     GSCCompetitionsAdmin.mount('#admin-competitions');
   ========================================================== */
(function (global) {
  'use strict';

  var DISCIPLINES = ['Football', 'Basketball', 'Handball', 'Volley-ball', 'Athlétisme', 'Arts martiaux', 'Rugby', 'Cyclisme', 'Natation', 'Multisports'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtIso(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
  function fmtHeure(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' à ' + p(d.getHours()) + 'h' + p(d.getMinutes());
  }

  /* « AAAA-MM-JJ → AAAA-MM-JJ | libellé » (une période par ligne) */
  function lirePeriodes(texte) {
    var out = [], erreurs = [];
    String(texte || '').split(/\r?\n/).forEach(function (ligne, i) {
      var l = ligne.trim();
      if (!l) return;
      var m = /^(\d{4}-\d{2}-\d{2})\s*(?:→|->|—|–|à|au)\s*(\d{4}-\d{2}-\d{2})\s*(?:\|\s*(.*))?$/.exec(l);
      if (!m) { erreurs.push('Ligne ' + (i + 1) + ' : format attendu « AAAA-MM-JJ → AAAA-MM-JJ | libellé ».'); return; }
      out.push({ debut: m[1], fin: m[2], label: (m[3] || '').trim() });
    });
    return { periodes: out, erreurs: erreurs };
  }
  function periodesEnTexte(c) {
    if (!c.periodes || c.periodes.length < 2) return '';
    return c.periodes.map(function (p) { return p.debut + ' → ' + p.fin + (p.label ? ' | ' + p.label : ''); }).join('\n');
  }
  function iso(v) { return typeof v === 'string' ? v.slice(0, 10) : ''; }

  function mount(target) {
    var root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) return null;
    var S = global.GSCCompetitions;
    var etat = { liste: [], edition: null, occupe: false, tl: null };
    root.classList.add('gsc-ca');
    root.innerHTML =
      '<div class="gsc-ca__head"><div><div class="gsc-ca__title">Calendrier des compétitions</div>' +
      '<div class="gsc-ca__sub" data-r="sub"></div></div>' +
      '<div class="gsc-ca__actions">' +
      '<button type="button" class="gsc-ca__btn gsc-ca__btn--sync" data-a="sync">⟳ Synchroniser</button>' +
      '<button type="button" class="gsc-ca__btn" data-a="new">+ Nouvelle compétition</button></div></div>' +
      '<div class="gsc-ca__msg" data-r="msg" role="status"></div>' +
      '<div data-r="form"></div>' +
      '<div class="gsc-ca__tablewrap" data-r="table"></div>' +
      '<div class="gsc-ca__preview" data-r="preview"></div>';
    var R = {};
    ['sub', 'msg', 'form', 'table', 'preview'].forEach(function (k) { R[k] = root.querySelector('[data-r="' + k + '"]'); });

    function message(texte, type) {
      R.msg.textContent = texte || '';
      R.msg.className = 'gsc-ca__msg' + (type ? ' gsc-ca__msg--' + type : '');
    }
    function occupe(b) {
      etat.occupe = b;
      var s = root.querySelector('[data-a="sync"]');
      if (s) { s.disabled = b; s.textContent = b ? '⟳ Synchronisation…' : '⟳ Synchroniser'; }
    }

    function dessinerSub() {
      var mode = S.connecte() ? '' : ' · Mode lecture seule (base non connectée)';
      R.sub.textContent = 'Calendrier de référence du ' + fmtIso(S.versionReference()) + mode;
      S.derniereSynchro().then(function (d) {
        if (d && d.date) R.sub.textContent = 'Dernière synchro : ' + fmtHeure(d.date) + ' · référence du ' + fmtIso(d.version) + mode;
      });
    }

    function dessinerTable() {
      var l = etat.liste.slice().sort(function (a, b) { return String(a.debut).localeCompare(String(b.debut)); });
      if (!l.length) { R.table.innerHTML = '<div class="gsc-ca__empty">Aucune compétition.</div>'; return; }
      R.table.innerHTML = '<table class="gsc-ca__table"><thead><tr><th>Compétition</th><th>Portée</th><th>Dates</th><th>Statut</th><th></th></tr></thead><tbody>' +
        l.map(function (c) {
          var dates = (c.periodes && c.periodes.length > 1)
            ? c.periodes.length + ' périodes (' + fmtIso(iso(c.debut)) + ' → ' + fmtIso(iso(c.fin)) + ')'
            : fmtIso(iso(c.debut)) + ' → ' + fmtIso(iso(c.fin));
          return '<tr><td><span class="gsc-ca__dot" style="background:' + esc(c.couleur || '#9aa5b1') + '"></span><b>' + esc(c.nom) + '</b><small>' + esc(c.discipline || '') + '</small></td>' +
            '<td>' + (c.portee === 'international' ? 'International' : 'National') + '</td><td>' + dates + '</td>' +
            '<td>' + ({ confirme: 'Confirmé', provisoire: 'À confirmer', reporte: 'Reporté', annule: 'Annulé' }[c.statut] || 'Confirmé') + '</td>' +
            '<td class="gsc-ca__row-actions"><button type="button" class="gsc-ca__link" data-a="edit" data-id="' + esc(c.id) + '">Modifier</button>' +
            '<button type="button" class="gsc-ca__link gsc-ca__link--danger" data-a="del" data-id="' + esc(c.id) + '">Supprimer</button></td></tr>';
        }).join('') + '</tbody></table>';
    }

    function dessinerApercu() {
      if (!etat.tl) etat.tl = global.GSCTimeline.render(R.preview, etat.liste, { moisDebut: 9, titre: 'Aperçu du graphique public' });
      else etat.tl.mettreAJour(etat.liste);
    }
    function toutDessiner() { dessinerTable(); dessinerApercu(); }

    function formulaire(c) {
      var n = c || {};
      var opt = function (v, lib, cur) { return '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + lib + '</option>'; };
      return '<form class="gsc-ca__form" data-r="f" novalidate>' +
        '<div class="gsc-ca__formtitle">' + (n.id ? 'Modifier la compétition' : 'Nouvelle compétition ou tournoi') + '</div>' +
        '<div class="gsc-ca__grid">' +
        '<label>Nom *<input name="nom" required maxlength="120" value="' + esc(n.nom) + '"></label>' +
        '<label>Portée<select name="portee">' + opt('national', 'National', n.portee || 'national') + opt('international', 'International', n.portee) + '</select></label>' +
        '<label>Discipline<input name="discipline" list="gsc-ca-disc" maxlength="60" value="' + esc(n.discipline) + '"><datalist id="gsc-ca-disc">' +
        DISCIPLINES.map(function (d) { return '<option value="' + esc(d) + '">'; }).join('') + '</datalist></label>' +
        '<label>Statut des dates<select name="statut">' + opt('confirme', 'Confirmées', n.statut || 'confirme') + opt('provisoire', 'À confirmer', n.statut) +
        opt('reporte', 'Reportée', n.statut) + opt('annule', 'Annulée', n.statut) + '</select></label>' +
        '<label>Début *<input type="date" name="debut" value="' + esc(iso(n.debut)) + '"></label>' +
        '<label>Fin *<input type="date" name="fin" value="' + esc(iso(n.fin)) + '"></label>' +
        '<label>Organisateur<input name="organisateur" maxlength="80" value="' + esc(n.organisateur) + '"></label>' +
        '<label>Lieu<input name="lieu" maxlength="80" value="' + esc(n.lieu) + '"></label>' +
        '<label class="gsc-ca__wide">Lien source (annonce officielle)<input type="url" name="source" placeholder="https://…" value="' + esc(n.source) + '"></label>' +
        '<label class="gsc-ca__wide">Note<input name="note" maxlength="240" value="' + esc(n.note) + '"></label>' +
        '<label class="gsc-ca__wide">Plusieurs périodes (facultatif — une par ligne, remplace Début/Fin)' +
        '<textarea name="periodes" rows="3" placeholder="2026-11-27 → 2027-01-24 | Phase de groupes">' + esc(periodesEnTexte(n)) + '</textarea></label>' +
        '<label>Couleur<input type="color" name="couleur" value="' + esc(n.couleur || S.couleurLibre(etat.liste)) + '"></label>' +
        '</div><div class="gsc-ca__formbtns"><button type="submit" class="gsc-ca__btn gsc-ca__btn--sync">Enregistrer</button>' +
        '<button type="button" class="gsc-ca__btn" data-a="cancel">Annuler</button></div></form>';
    }

    function recharger() {
      return S.charger().then(function (l) { etat.liste = l; toutDessiner(); });
    }

    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-a]') : null;
      if (!b || !root.contains(b)) return;
      var a = b.getAttribute('data-a'), id = b.getAttribute('data-id');
      if (a === 'new') { etat.edition = 'new'; R.form.innerHTML = formulaire(null); R.form.scrollIntoView && R.form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else if (a === 'cancel') { etat.edition = null; R.form.innerHTML = ''; }
      else if (a === 'edit') {
        var c = etat.liste.filter(function (x) { return x.id === id; })[0];
        if (c) { etat.edition = id; R.form.innerHTML = formulaire(c); R.form.scrollIntoView && R.form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      } else if (a === 'del') {
        var cc = etat.liste.filter(function (x) { return x.id === id; })[0];
        if (!cc || !global.confirm('Supprimer « ' + cc.nom + ' » du calendrier ?')) return;
        S.supprimer(id).then(function () { message('Compétition supprimée.', 'ok'); return recharger(); })
          .catch(function (err) { message('Suppression impossible : ' + err.message, 'err'); });
      } else if (a === 'sync') {
        if (etat.occupe) return;
        occupe(true); message('Synchronisation en cours…');
        S.synchroniser().then(function (r) {
          etat.liste = r.liste; toutDessiner(); dessinerSub();
          message('Synchronisation terminée : ' + r.ajoutees + ' ajoutée(s), ' + r.misesAJour + ' mise(s) à jour, ' +
            r.conservees + ' conservée(s) telle(s) quelle(s) (modifiées par vous). Total : ' + r.total + ' compétition(s).', 'ok');
        }).catch(function (err) { message('Synchronisation impossible : ' + err.message, 'err'); })
          .then(function () { occupe(false); });
      }
    });

    root.addEventListener('submit', function (e) {
      var f = e.target;
      if (!f || f.getAttribute('data-r') !== 'f') return;
      e.preventDefault();
      var v = function (n) { return (f.elements[n].value || '').trim(); };
      var orig = etat.edition && etat.edition !== 'new'
        ? etat.liste.filter(function (x) { return x.id === etat.edition; })[0] : null;
      var comp = Object.assign({}, orig || {}, {
        nom: v('nom'), portee: v('portee'), discipline: v('discipline'), statut: v('statut'),
        debut: v('debut'), fin: v('fin'), organisateur: v('organisateur'), lieu: v('lieu'),
        source: v('source'), note: v('note'), couleur: v('couleur')
      });
      var p = lirePeriodes(f.elements.periodes.value);
      if (p.erreurs.length) { message(p.erreurs.join(' '), 'err'); return; }
      comp.periodes = p.periodes;
      S.enregistrer(comp, etat.liste).then(function () {
        etat.edition = null; R.form.innerHTML = '';
        message('Compétition enregistrée. Le graphique public est à jour.', 'ok');
        return recharger();
      }).catch(function (err) { message(err.message, 'err'); });
    });

    dessinerSub();
    recharger();
    return { recharger: recharger };
  }

  global.GSCCompetitionsAdmin = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
