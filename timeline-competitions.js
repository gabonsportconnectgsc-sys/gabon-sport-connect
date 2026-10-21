/* ==========================================================
   GSC — Bandeau chronologique des compétitions (v2)
   Fichier dédié : js/timeline-competitions.js
   Usage :
     var tl = GSCTimeline.render('#cible', liste, { moisDebut: 9 });
     tl.mettreAJour(nouvelleListe);
   Compétition : { id, nom, discipline, portee('national'|'international'),
     statut('confirme'|'provisoire'|'reporte'|'annule'), organisateur, lieu,
     source (https://…), note, couleur (#hex),
     debut + fin   OU   periodes: [{ debut, fin, label }] }
   Dates : 'AAAA-MM-JJ', Date ou Timestamp Firestore.
   ========================================================== */
(function (global) {
  'use strict';

  var MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  var PALETTE = ['#1e88e5', '#43a047', '#e53935', '#fb8c00', '#8e24aa', '#00acc1',
                 '#d81b60', '#6d4c41', '#3949ab', '#7cb342', '#f4511e', '#00897b'];
  var STATUTS = { confirme: 'Dates confirmées', provisoire: 'Dates à confirmer', reporte: 'Reportée', annule: 'Annulée' };
  var DAY = 86400000;

  /* ---------- Utilitaires ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pick(o, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (o[keys[i]] != null && o[keys[i]] !== '') return o[keys[i]];
    }
    return null;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmt(ts) {
    var d = new Date(ts);
    return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
  }
  function fmtCourt(ts) {
    var d = new Date(ts);
    return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1);
  }
  function parseDate(v) {
    if (v == null || v === '') return null;
    if (typeof v.toDate === 'function') v = v.toDate();
    else if (typeof v === 'object' && typeof v.seconds === 'number') v = new Date(v.seconds * 1000);
    if (v instanceof Date) {
      if (isNaN(v)) return null;
      return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
    }
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(v);
    if (isNaN(d)) return null;
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /* ---------- Données ---------- */
  function lirePeriodes(o) {
    var segs = [];
    if (Array.isArray(o.periodes)) {
      o.periodes.forEach(function (p) {
        if (!p) return;
        var a = parseDate(pick(p, ['debut', 'dateDebut', 'start']));
        var b = parseDate(pick(p, ['fin', 'dateFin', 'end']));
        if (a == null) return;
        if (b == null) b = a;
        if (b < a) { var t = a; a = b; b = t; }
        segs.push({ debut: a, fin: b, label: String(p.label || p.libelle || '') });
      });
    }
    if (!segs.length) {
      var d = parseDate(pick(o, ['debut', 'dateDebut', 'date_debut', 'startDate', 'start']));
      var f = parseDate(pick(o, ['fin', 'dateFin', 'date_fin', 'endDate', 'end']));
      if (d == null) return [];
      if (f == null) f = d;
      if (f < d) { var u = d; d = f; f = u; }
      segs.push({ debut: d, fin: f, label: '' });
    }
    segs.sort(function (a, b) { return a.debut - b.debut; });
    return segs;
  }

  function normaliser(liste) {
    var out = [];
    (liste || []).forEach(function (o, i) {
      if (!o) return;
      var segs = lirePeriodes(o);
      if (!segs.length) return;
      var col = pick(o, ['couleur', 'color']);
      if (col && !/^#[0-9a-f]{3,8}$/i.test(col)) col = null;
      var id = pick(o, ['id', 'uid', 'cle']);
      var src = pick(o, ['source', 'lien']);
      if (src && !/^https?:\/\//i.test(src)) src = null;
      var statut = String(o.statut || 'confirme');
      if (!STATUTS[statut]) statut = 'confirme';
      var fin = 0;
      segs.forEach(function (s) { if (s.fin > fin) fin = s.fin; });
      out.push({
        id: String(id != null ? id : 'c' + i),
        nom: String(pick(o, ['nom', 'name', 'titre', 'title']) || 'Compétition'),
        discipline: String(pick(o, ['discipline', 'sport']) || ''),
        portee: o.portee === 'international' ? 'international' : 'national',
        statut: statut,
        organisateur: String(o.organisateur || ''),
        lieu: String(o.lieu || ''),
        note: String(o.note || ''),
        source: src || null,
        couleur: col || null,
        segments: segs, debut: segs[0].debut, fin: fin
      });
    });
    out.sort(function (a, b) { return a.debut - b.debut || a.nom.localeCompare(b.nom); });
    out.forEach(function (c, i) { c.couleurFinale = c.couleur || PALETTE[i % PALETTE.length]; });
    return out;
  }

  function fenetre(annee, moisDebut) {
    return { start: Date.UTC(annee, moisDebut - 1, 1), end: Date.UTC(annee + 1, moisDebut - 1, 1) };
  }

  /* Un élément par période visible dans la fenêtre */
  function visibles(comps, w) {
    var out = [];
    comps.forEach(function (c) {
      c.segments.forEach(function (sg, k) {
        if (sg.debut < w.end && sg.fin + DAY > w.start) {
          out.push({ c: c, k: k, sg: sg, s: Math.max(sg.debut, w.start), e: Math.min(sg.fin + DAY, w.end) });
        }
      });
    });
    return out;
  }

  /* Périodes où au moins deux compétitions différentes se déroulent en même temps */
  function croisements(vis) {
    var set = {};
    vis.forEach(function (v) { set[v.s] = 1; set[v.e] = 1; });
    var temps = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
    var res = [];
    for (var i = 0; i < temps.length - 1; i++) {
      var t0 = temps[i], t1 = temps[i + 1];
      var ids = {}, items = [];
      vis.forEach(function (v) {
        if (v.s <= t0 && v.e >= t1 && !ids[v.c.id]) { ids[v.c.id] = 1; items.push(v.c); }
      });
      if (items.length < 2) continue;
      var key = items.map(function (c) { return c.id; }).sort().join('|');
      var prev = res[res.length - 1];
      if (prev && prev.e === t0 && prev.key === key) { prev.e = t1; continue; }
      res.push({ s: t0, e: t1, key: key, items: items });
    }
    return res;
  }

  function chevauche(a, b) {
    for (var i = 0; i < a.segments.length; i++) {
      for (var j = 0; j < b.segments.length; j++) {
        if (a.segments[i].debut <= b.segments[j].fin && b.segments[j].debut <= a.segments[i].fin) return true;
      }
    }
    return false;
  }

  /* ---------- Rendu ---------- */
  function render(target, liste, options) {
    var root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) return null;
    var opt = options || {};
    var now = new Date();
    var aujourdhui = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var etat = {
      comps: normaliser(liste),
      moisDebut: opt.moisDebut || 1,
      discipline: '',
      portee: '',
      annee: opt.annee || null,
      sel: null
    };
    if (!etat.annee) {
      etat.annee = now.getFullYear();
      if (etat.moisDebut > 1 && now.getMonth() + 1 < etat.moisDebut) etat.annee--;
    }
    root.classList.add('gsc-tl');

    function libellePeriode() {
      return etat.moisDebut === 1 ? String(etat.annee) : etat.annee + '–' + (etat.annee + 1);
    }

    function distinctes(vis) {
      var seen = {}, out = [];
      vis.forEach(function (v) { if (!seen[v.c.id]) { seen[v.c.id] = 1; out.push(v.c); } });
      return out;
    }

    function detailHtml(vis, cro) {
      var sel = etat.sel;
      if (!sel) {
        return '<span class="gsc-tl__hint">Touchez une barre ou une zone de croisement pour voir les dates et les compétitions qui se chevauchent.</span>';
      }
      if (sel.type === 'c') {
        var c = null;
        for (var i = 0; i < etat.comps.length; i++) if (etat.comps[i].id === sel.id) c = etat.comps[i];
        if (!c) return '';
        var autres = distinctes(vis).filter(function (o) { return o.id !== c.id && chevauche(c, o); });
        var h = '<span class="gsc-tl__dot" style="background:' + c.couleurFinale + '"></span><b>' + esc(c.nom) + '</b>' +
          '<div class="gsc-tl__tags"><span class="gsc-tl__tag gsc-tl__tag--' + c.portee + '">' + (c.portee === 'international' ? 'International' : 'National') + '</span>' +
          (c.discipline ? '<span class="gsc-tl__tag">' + esc(c.discipline) + '</span>' : '') +
          '<span class="gsc-tl__tag gsc-tl__tag--' + c.statut + '">' + STATUTS[c.statut] + '</span></div>';
        if (c.segments.length > 1) {
          h += '<ul>' + c.segments.map(function (sg) {
            return '<li>' + (sg.label ? esc(sg.label) + ' : ' : '') + fmt(sg.debut) + ' → ' + fmt(sg.fin) + '</li>';
          }).join('') + '</ul>';
        } else {
          var sg = c.segments[0];
          var jours = Math.round((sg.fin - sg.debut) / DAY) + 1;
          h += 'Du ' + fmt(sg.debut) + ' au ' + fmt(sg.fin) + ' (' + jours + ' jour' + (jours > 1 ? 's' : '') + ')<br>';
        }
        if (c.organisateur || c.lieu) h += esc([c.organisateur, c.lieu].filter(Boolean).join(' · ')) + '<br>';
        if (c.note) h += '<span class="gsc-tl__hint">' + esc(c.note) + '</span><br>';
        h += autres.length
          ? 'Se chevauche avec :<ul>' + autres.map(function (o) {
            return '<li><span class="gsc-tl__dot" style="background:' + o.couleurFinale + '"></span>' + esc(o.nom) + '</li>';
          }).join('') + '</ul>'
          : '<span class="gsc-tl__hint">Aucun croisement avec une autre compétition.</span>';
        if (c.source) h += '<div><a class="gsc-tl__src" href="' + esc(c.source) + '" target="_blank" rel="noopener noreferrer">Source des dates ↗</a></div>';
        return h;
      }
      var x = cro[sel.idx];
      if (!x) return '';
      return '<b>' + x.items.length + ' compétitions en même temps</b><br>Période : ' + fmt(x.s) + ' → ' + fmt(x.e - DAY) +
        '<ul>' + x.items.map(function (o) {
          return '<li><span class="gsc-tl__dot" style="background:' + o.couleurFinale + '"></span>' + esc(o.nom) + '</li>';
        }).join('') + '</ul>';
    }

    function dessiner() {
      var w = fenetre(etat.annee, etat.moisDebut);
      var total = w.end - w.start;
      var pct = function (t) { return (t - w.start) / total * 100; };
      var pool = etat.comps.filter(function (c) {
        return (!etat.discipline || c.discipline === etat.discipline) && (!etat.portee || c.portee === etat.portee) && c.statut !== 'annule';
      });
      var vis = visibles(pool, w);
      var cro = croisements(vis);
      var lignes = distinctes(vis);

      var disciplines = [];
      etat.comps.forEach(function (c) { if (c.discipline && disciplines.indexOf(c.discipline) < 0) disciplines.push(c.discipline); });

      var proches = null;
      if (etat.sel && etat.sel.type === 'c') {
        var cs = null;
        lignes.forEach(function (c) { if (c.id === etat.sel.id) cs = c; });
        if (cs) {
          proches = {};
          lignes.forEach(function (c) { if (chevauche(cs, c)) proches[c.id] = 1; });
        }
      }

      var h = '';
      h += '<div class="gsc-tl__head">' +
        '<div class="gsc-tl__title">' + esc(opt.titre || 'Calendrier des compétitions') + '</div>' +
        '<div class="gsc-tl__nav">' +
        '<button type="button" class="gsc-tl__btn" data-act="prev" aria-label="Période précédente">‹</button>' +
        '<span class="gsc-tl__period">' + libellePeriode() + '</span>' +
        '<button type="button" class="gsc-tl__btn" data-act="next" aria-label="Période suivante">›</button>' +
        '<button type="button" class="gsc-tl__btn" data-act="today">Aujourd\'hui</button>' +
        '</div>' +
        '<select class="gsc-tl__select" data-act="vue" aria-label="Type de vue">' +
        '<option value="1"' + (etat.moisDebut === 1 ? ' selected' : '') + '>Année (janv. → déc.)</option>' +
        '<option value="7"' + (etat.moisDebut === 7 ? ' selected' : '') + '>Saison (juil. → juin)</option>' +
        '<option value="9"' + (etat.moisDebut === 9 ? ' selected' : '') + '>Saison (sept. → août)</option>' +
        '</select>' +
        '<select class="gsc-tl__select" data-act="portee" aria-label="Portée">' +
        '<option value="">National + International</option>' +
        '<option value="national"' + (etat.portee === 'national' ? ' selected' : '') + '>National</option>' +
        '<option value="international"' + (etat.portee === 'international' ? ' selected' : '') + '>International</option>' +
        '</select>';
      if (disciplines.length > 1) {
        h += '<select class="gsc-tl__select" data-act="discipline" aria-label="Discipline">' +
          '<option value="">Toutes disciplines</option>' +
          disciplines.map(function (d) {
            return '<option value="' + esc(d) + '"' + (etat.discipline === d ? ' selected' : '') + '>' + esc(d) + '</option>';
          }).join('') + '</select>';
      }
      h += '</div>';

      h += '<div class="gsc-tl__scroll"><div class="gsc-tl__grid">';

      h += '<div class="gsc-tl__row gsc-tl__row--months"><div class="gsc-tl__label"></div><div class="gsc-tl__track">';
      for (var i = 0; i < 12; i++) {
        var m = etat.moisDebut - 1 + i;
        var ms = Date.UTC(etat.annee, m, 1), me = Date.UTC(etat.annee, m + 1, 1);
        h += '<div class="gsc-tl__month" style="left:' + pct(ms).toFixed(3) + '%;width:' + ((me - ms) / total * 100).toFixed(3) + '%">' +
          MOIS[m % 12] + '</div>';
      }
      h += '</div></div>';

      h += '<div class="gsc-tl__body"><div class="gsc-tl__lines">';
      for (var j = 0; j < 12; j++) {
        h += '<div class="gsc-tl__line" style="left:' + pct(Date.UTC(etat.annee, etat.moisDebut - 1 + j, 1)).toFixed(3) + '%"></div>';
      }
      if (aujourdhui >= w.start && aujourdhui < w.end) {
        h += '<div class="gsc-tl__today" style="left:' + pct(aujourdhui).toFixed(3) + '%"></div>';
      }
      h += '</div>';

      h += '<div class="gsc-tl__row gsc-tl__row--cross"><div class="gsc-tl__label">Croisements<small>2 compétitions ou plus</small></div><div class="gsc-tl__track">';
      cro.forEach(function (x, idx) {
        var n = Math.min(x.items.length, 4);
        var isSel = etat.sel && etat.sel.type === 'x' && etat.sel.idx === idx;
        h += '<button type="button" class="gsc-tl__cross gsc-tl__cross--' + n + (isSel ? ' is-sel' : '') + '" data-x="' + idx + '"' +
          ' style="left:' + pct(x.s).toFixed(3) + '%;width:' + ((x.e - x.s) / total * 100).toFixed(3) + '%"' +
          ' title="' + x.items.length + ' compétitions : ' + fmt(x.s) + ' → ' + fmt(x.e - DAY) + '" aria-label="Croisement de ' + x.items.length + ' compétitions"></button>';
      });
      h += '</div></div>';

      if (!lignes.length) {
        h += '<div class="gsc-tl__empty">Aucune compétition sur cette période.</div>';
      }
      lignes.forEach(function (c) {
        var dim = proches && !proches[c.id];
        var isSel = etat.sel && etat.sel.type === 'c' && etat.sel.id === c.id;
        h += '<div class="gsc-tl__row"><div class="gsc-tl__label' + (dim ? ' is-dim' : '') + '">' + esc(c.nom) +
          '<small>' + (c.portee === 'international' ? 'International' : 'National') + (c.discipline ? ' · ' + esc(c.discipline) : '') + '</small></div><div class="gsc-tl__track">';
        vis.forEach(function (v) {
          if (v.c.id !== c.id) return;
          var width = Math.max((v.e - v.s) / total * 100, 0.6);
          var cls = 'gsc-tl__bar' + (isSel ? ' is-sel' : '') + (dim ? ' is-dim' : '') +
            (c.statut === 'provisoire' ? ' is-prov' : '') + (c.statut === 'reporte' ? ' is-rep' : '') +
            (v.sg.debut < w.start ? ' is-cut-left' : '') + (v.sg.fin + DAY > w.end ? ' is-cut-right' : '');
          var texte = v.sg.label || c.nom;
          var affiche = width < 4.5 ? '' : texte;
          h += '<button type="button" class="' + cls + '" data-c="' + esc(c.id) + '" style="left:' + pct(v.s).toFixed(3) + '%;width:' +
            width.toFixed(3) + '%;background-color:' + c.couleurFinale + '" title="' + esc(texte) + ' : ' + fmt(v.sg.debut) + ' → ' + fmt(v.sg.fin) +
            (c.statut !== 'confirme' ? ' (' + STATUTS[c.statut] + ')' : '') + '">' + esc(affiche) + '</button>';
        });
        h += '</div></div>';
      });
      h += '</div></div></div>';

      h += '<div class="gsc-tl__detail" aria-live="polite">' + detailHtml(vis, cro) + '</div>';
      h += '<div class="gsc-tl__legend"><span>Croisements :</span>' +
        '<span><i style="background:#ffb300"></i>2 compétitions</span>' +
        '<span><i style="background:#fb8c00"></i>3 compétitions</span>' +
        '<span><i style="background:#e53935"></i>4 ou plus</span>' +
        '<span><i class="gsc-tl__swatch-prov"></i>Dates à confirmer</span></div>';

      root.innerHTML = h;
    }

    root.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-act],[data-c],[data-x]') : null;
      if (!t || !root.contains(t)) return;
      if (t.hasAttribute('data-c')) {
        var id = t.getAttribute('data-c');
        etat.sel = (etat.sel && etat.sel.type === 'c' && etat.sel.id === id) ? null : { type: 'c', id: id };
      } else if (t.hasAttribute('data-x')) {
        var idx = +t.getAttribute('data-x');
        etat.sel = (etat.sel && etat.sel.type === 'x' && etat.sel.idx === idx) ? null : { type: 'x', idx: idx };
      } else {
        var act = t.getAttribute('data-act');
        if (act === 'prev') { etat.annee -= 1; etat.sel = null; }
        else if (act === 'next') { etat.annee += 1; etat.sel = null; }
        else if (act === 'today') {
          etat.annee = now.getFullYear();
          if (etat.moisDebut > 1 && now.getMonth() + 1 < etat.moisDebut) etat.annee--;
          etat.sel = null;
        } else return;
      }
      dessiner();
    });

    root.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var act = t.getAttribute('data-act');
      if (act === 'vue') { etat.moisDebut = +t.value; etat.sel = null; }
      else if (act === 'discipline') { etat.discipline = t.value; etat.sel = null; }
      else if (act === 'portee') { etat.portee = t.value; etat.sel = null; }
      else return;
      dessiner();
    });

    dessiner();
    return {
      mettreAJour: function (nouvelleListe) { etat.comps = normaliser(nouvelleListe); etat.sel = null; dessiner(); }
    };
  }

  global.GSCTimeline = {
    render: render,
    _interne: { normaliser: normaliser, fenetre: fenetre, visibles: visibles, croisements: croisements, chevauche: chevauche, PALETTE: PALETTE }
  };
})(typeof window !== 'undefined' ? window : globalThis);
