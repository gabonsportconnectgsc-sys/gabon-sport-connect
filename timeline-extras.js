/* ==========================================================
   GSC — Extras du bandeau chronologique :
   plein écran, zoom (saison / trimestre / mois), mois cliquables.
   Aucune modification de timeline-competitions.js : tout se
   rebranche après chaque rendu du bandeau.
   ========================================================== */
(function () {
  'use strict';
  var COURTS = { 'Jan': 'Jan', 'Fév': 'Fév', 'Mar': 'Mar', 'Avr': 'Avr', 'Mai': 'Mai', 'Juin': 'Jun', 'Juil': 'Jul', 'Août': 'Aoû', 'Sep': 'Sep', 'Oct': 'Oct', 'Nov': 'Nov', 'Déc': 'Déc' };
  var INITIALES = { 'Jan': 'J', 'Fév': 'F', 'Mar': 'M', 'Avr': 'A', 'Mai': 'M', 'Juin': 'J', 'Juil': 'J', 'Août': 'A', 'Sep': 'S', 'Oct': 'O', 'Nov': 'N', 'Déc': 'D' };
  var etat = { open: false, zoom: 'fit', sl: 0, st: 0, pend: 0, hist: false };
  var timer = 0;

  function q(el, s) { return el.querySelector(s); }

  function labelW(host) {
    var l = q(host, '.gsc-tl__label');
    return l && l.offsetWidth ? l.offsetWidth : 110;
  }

  /* Noms de mois : complets, abrégés ou initiales selon la largeur disponible */
  function ajusterMois(host) {
    var ms = host.querySelectorAll('.gsc-tl__month');
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (!m.getAttribute('data-full')) m.setAttribute('data-full', m.textContent.trim());
      var full = m.getAttribute('data-full');
      var w = m.offsetWidth;
      if (!w) continue;
      var t = w < 26 ? (INITIALES[full] || full.charAt(0)) : (w < 42 ? (COURTS[full] || full) : full);
      if (m.textContent !== t) m.textContent = t;
      if (m.getAttribute('title') !== full) m.setAttribute('title', full);
    }
  }

  function appliquerZoom(host) {
    var grid = q(host, '.gsc-tl__grid'), sc = q(host, '.gsc-tl__scroll');
    if (!grid || !sc) return;
    if (!etat.open || etat.zoom === 'fit') {
      if (grid.style.minWidth) grid.style.minWidth = '';
    } else {
      var lw = labelW(host);
      var vis = sc.clientWidth - lw;
      if (vis < 120) vis = 120;
      var parMois = etat.zoom === 'mois' ? vis : vis / 3;
      var px = Math.round(lw + parMois * 12) + 'px';
      if (grid.style.minWidth !== px) grid.style.minWidth = px;
    }
    var bs = host.querySelectorAll('[data-fs-zoom]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].classList.toggle('is-on', bs[i].getAttribute('data-fs-zoom') === etat.zoom);
    }
  }

  function allerAuMois(host, mEl) {
    var sc = q(host, '.gsc-tl__scroll');
    if (!sc || !mEl) return;
    sc.scrollLeft = Math.max(0, mEl.offsetLeft);
  }
  function allerAujourdhui(host) {
    var sc = q(host, '.gsc-tl__scroll'), td = q(host, '.gsc-tl__today');
    if (!sc) return;
    if (td) sc.scrollLeft = Math.max(0, td.offsetLeft - (sc.clientWidth - labelW(host)) / 3);
    else sc.scrollLeft = 0;
  }

  function majBouton(host) {
    var b = q(host, '[data-fs="toggle"]');
    if (!b) return;
    var st = etat.open ? 'open' : 'closed';
    if (b.getAttribute('data-st') !== st) {
      b.setAttribute('data-st', st);
      b.innerHTML = '<span class="gsc-tl__fsico">' + (etat.open ? '✕' : '⛶') + '</span>' +
        '<span class="gsc-tl__fstxt">' + (etat.open ? 'fermer' : 'plein écran') + '</span>';
    }
    b.setAttribute('aria-label', etat.open ? 'Quitter le plein écran' : 'Plein écran');
  }

  function injecter(host) {
    var nav = q(host, '.gsc-tl__nav') || q(host, '.gsc-tl__head');
    if (!nav) return;
    if (!q(host, '[data-fs="toggle"]')) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gsc-tl__btn gsc-tl__fsbtn';
      b.setAttribute('data-fs', 'toggle');
      nav.appendChild(b);
    }
    var head = q(host, '.gsc-tl__head');
    if (head && !q(host, '.gsc-tl__zoom')) {
      var z = document.createElement('div');
      z.className = 'gsc-tl__zoom';
      z.innerHTML = '<button type="button" class="gsc-tl__btn" data-fs-zoom="fit">Saison</button>' +
        '<button type="button" class="gsc-tl__btn" data-fs-zoom="tri">Trimestre</button>' +
        '<button type="button" class="gsc-tl__btn" data-fs-zoom="mois">Mois</button>';
      head.appendChild(z);
    }
    majBouton(host);
  }

  function restaurer(host) {
    if (!etat.pend) return;
    if (Date.now() - etat.pend < 800) {
      var sc = q(host, '.gsc-tl__scroll');
      if (sc) sc.scrollLeft = etat.sl;
      host.scrollTop = etat.st;
    }
    etat.pend = 0;
  }

  function scan() {
    timer = 0;
    var host = document.querySelector('.gsc-tl');
    if (!host) return;
    injecter(host);
    if (etat.open && !host.classList.contains('gsc-tl--fs')) host.classList.add('gsc-tl--fs');
    appliquerZoom(host);
    ajusterMois(host);
    restaurer(host);
  }
  function planifier() { if (!timer) timer = requestAnimationFrame(scan); }

  function ouvrir(host, mEl) {
    etat.open = true;
    etat.zoom = mEl ? 'mois' : 'tri';
    host.classList.add('gsc-tl--fs');
    document.documentElement.classList.add('gsc-tl-fs-lock');
    majBouton(host);
    appliquerZoom(host);
    ajusterMois(host);
    if (mEl) allerAuMois(host, mEl); else allerAujourdhui(host);
    if (!etat.hist) { try { history.pushState({ gscTlFs: 1 }, ''); etat.hist = true; } catch (e) {} }
  }

  function fermer(depuisRetour) {
    if (!etat.open) return;
    var host = document.querySelector('.gsc-tl');
    etat.open = false;
    etat.zoom = 'fit';
    document.documentElement.classList.remove('gsc-tl-fs-lock');
    if (host) {
      host.classList.remove('gsc-tl--fs');
      appliquerZoom(host);
      ajusterMois(host);
      majBouton(host);
    }
    if (etat.hist && !depuisRetour) { etat.hist = false; try { history.back(); } catch (e) {} }
    else etat.hist = false;
  }

  function changerZoom(host, z, mEl) {
    var sc = q(host, '.gsc-tl__scroll'), grid = q(host, '.gsc-tl__grid');
    var lw = labelW(host), f = 0;
    if (sc && grid) { var tw = grid.offsetWidth - lw; f = tw > 0 ? sc.scrollLeft / tw : 0; }
    etat.zoom = z;
    appliquerZoom(host);
    ajusterMois(host);
    if (mEl) allerAuMois(host, mEl);
    else if (sc && grid) sc.scrollLeft = f * (grid.offsetWidth - lw);
  }

  document.addEventListener('click', function (e) {
    var host = document.querySelector('.gsc-tl');
    var t = e.target;
    if (!host || !t || !t.closest || !host.contains(t)) return;
    if (t.closest('[data-fs]')) { e.preventDefault(); if (etat.open) fermer(); else ouvrir(host, null); return; }
    var z = t.closest('[data-fs-zoom]');
    if (z) { e.preventDefault(); changerZoom(host, z.getAttribute('data-fs-zoom'), null); return; }
    var m = t.closest('.gsc-tl__month');
    if (m) { if (etat.open) changerZoom(host, 'mois', m); else ouvrir(host, m); return; }
    if (etat.open && t.closest('[data-act],[data-c],[data-x]')) {
      var sc = q(host, '.gsc-tl__scroll');
      etat.sl = sc ? sc.scrollLeft : 0;
      etat.st = host.scrollTop;
      etat.pend = Date.now();
    }
  }, true);

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && etat.open) fermer(); });
  window.addEventListener('popstate', function () { if (etat.open) fermer(true); });
  window.addEventListener('resize', planifier);
  window.addEventListener('orientationchange', planifier);
  try { new MutationObserver(planifier).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  planifier();
})();
