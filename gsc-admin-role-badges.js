/* GSC admin — badges "nouveaux membres" par profil (menu latéral) */
(function () {
  'use strict';
  var ROLES = { joueur: 'nav-joueurs', club: 'nav-clubs' };
  ['athlete','entraineur','arbitre','association','federation','organisateur','supporter','independant','eleve_etudiant','gabonais_diaspora', 'sportif_etranger','handisport','ancien_sportif','ecole_universite','formateur']
    .forEach(function (r) { ROLES[r] = 'nav-role-' + r; });
  var KEY = 'gsc_admin_role_seen_v1';
  var seen = {}; try { seen = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  var counts = {}, last = [], unsub = null, baseTitle = document.title;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) {} }
  function ms(v) {
    if (!v) return 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (v.seconds) return v.seconds * 1000;
    var t = new Date(v).getTime(); return isNaN(t) ? 0 : t;
  }
  function badgeEl(role) {
    var el = document.getElementById('nav-count-' + role);
    if (!el) {
      var b = document.getElementById(ROLES[role]); if (!b) return null;
      el = document.createElement('span'); el.className = 'nav-badge-count';
      el.id = 'nav-count-' + role; el.style.display = 'none'; b.appendChild(el);
    }
    return el;
  }
  function render() {
    var total = 0;
    Object.keys(ROLES).forEach(function (r) {
      var el = badgeEl(r), n = counts[r] || 0; total += n;
      if (!el) return;
      el.textContent = n > 99 ? '99+' : String(n);
      el.style.display = n ? '' : 'none';
    });
    document.title = (total ? '(' + total + ') ' : '') + baseTitle;
  }
  function recompute() {
    counts = {};
    last.forEach(function (d) {
      var u = d.data(); if (!u || u.isDemo || u.status === 'deleted') return;
      var r = u.role; if (!ROLES[r] || seen[r] == null) return;
      var t = ms(u.createdAt || u.dateInscription || u.created_at);
      if (t && t > seen[r]) counts[r] = (counts[r] || 0) + 1;
    });
    render();
  }
  function start() {
    if (!window.firebase || !firebase.firestore || !firebase.auth) return setTimeout(start, 1000);
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) return;
      if (unsub) unsub();
      unsub = firebase.firestore().collection('users').onSnapshot(function (snap) {
        Object.keys(ROLES).forEach(function (r) { if (seen[r] == null) seen[r] = Date.now(); });
        save(); last = snap.docs; recompute();
      }, function (e) { console.warn('[RoleBadges]', e.message); });
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.nav-item'); if (!b) return;
    Object.keys(ROLES).forEach(function (r) {
      if (ROLES[r] === b.id) { seen[r] = Date.now(); save(); recompute(); }
    });
  }, true);
  window.GSCRoleBadges = { counts: function () { return counts; }, refresh: recompute };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
