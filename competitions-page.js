/* ==========================================================
   GSC — Page publique « Compétitions » (remplace l'onglet Sport)
   Fichier dédié : js/competitions-page.js
   Dépend de : timeline-competitions.js, competitions-data.js, competitions-service.js
   Usage :
     GSCCompetitionsPage.mount('#page-competitions');
   ========================================================== */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(ts) {
    var d = new Date(ts), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return p(d.getUTCDate()) + '/' + p(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
  }

  function resume(liste) {
    var n = global.GSCTimeline._interne.normaliser(liste).filter(function (c) { return c.statut !== 'annule'; });
    var now = new Date(), t = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var DAY = 86400000, enCours = [], prochaine = null;
    n.forEach(function (c) {
      var actif = c.segments.some(function (s) { return s.debut <= t && t < s.fin + DAY; });
      if (actif) enCours.push(c);
      c.segments.forEach(function (s) {
        if (s.debut > t && (!prochaine || s.debut < prochaine.date)) prochaine = { date: s.debut, nom: c.nom, label: s.label };
      });
    });
    return { enCours: enCours, prochaine: prochaine };
  }

  function mount(target, options) {
    var root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) return null;
    var opt = options || {};
    root.classList.add('gsc-cp');
    root.innerHTML = '<div class="gsc-cp__chips" data-r="chips"></div><div data-r="tl"></div><div class="gsc-cp__foot" data-r="foot"></div>';
    var chips = root.querySelector('[data-r="chips"]');
    var tlEl = root.querySelector('[data-r="tl"]');
    var foot = root.querySelector('[data-r="foot"]');
    var tl = null;

    function afficher(liste) {
      var r = resume(liste);
      chips.innerHTML =
        '<div class="gsc-cp__chip"><b>' + r.enCours.length + '</b>en cours aujourd\'hui</div>' +
        (r.prochaine ? '<div class="gsc-cp__chip"><b>' + fmt(r.prochaine.date) + '</b>Prochaine échéance : ' + esc(r.prochaine.label || r.prochaine.nom) + '</div>' : '');
      if (!tl) tl = global.GSCTimeline.render(tlEl, liste, { moisDebut: opt.moisDebut || 9, titre: opt.titre || 'Calendrier des compétitions' });
      else tl.mettreAJour(liste);
      foot.textContent = 'Dates issues de sources publiques (presse, CAF) — susceptibles d\'évoluer. Référence du ' +
        fmt(Date.parse(global.GSCCompetitions.versionReference())) + '.';
    }

    function recharger() { return global.GSCCompetitions.charger().then(afficher); }
    recharger();
    return { recharger: recharger };
  }

  global.GSCCompetitionsPage = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
