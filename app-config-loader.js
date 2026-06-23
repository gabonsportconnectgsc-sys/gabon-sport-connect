/**
 * app-config-loader.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Charge le thème depuis Firestore et l'applique en temps réel à TOUTES les
 * pages (index.html ET admin.html), depuis n'importe quel appareil dans le monde.
 *
 * Compatible avec :
 *   - Firebase Modular v10 (index.html → window.db + window.onSnapshot…)
 *   - Firebase Compat  v10 (admin.html → firebase.firestore())
 *
 * Placez ce fichier dans le même dossier que index.html et admin.html.
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // ── Valeurs par défaut du thème ──────────────────────────────────────────
  var DEFAULT_THEME = {
    colorPrimary : '#009E60',
    colorAccent  : '#FFD700',
    colorDanger  : '#ef4444',
    colorNavy    : '#0A1628',
    colorBg      : '#F0F2F5',
    radiusSm     : 8,
    radiusMd     : 14,
    radiusLg     : 22,
  };

  // ── Applique le thème aux variables CSS ──────────────────────────────────
  function applyTheme(theme) {
    var t = Object.assign({}, DEFAULT_THEME, theme || {});
    var root = document.documentElement;
    root.style.setProperty('--green',     t.colorPrimary);
    root.style.setProperty('--green-dk',  shadeColor(t.colorPrimary, -20));
    root.style.setProperty('--green-lt',  shadeColor(t.colorPrimary, 85));
    root.style.setProperty('--yellow',    t.colorAccent);
    root.style.setProperty('--danger',    t.colorDanger);
    root.style.setProperty('--navy',      t.colorNavy);
    root.style.setProperty('--navy-md',   shadeColor(t.colorNavy, 10));
    root.style.setProperty('--gray-bg',   t.colorBg);
    root.style.setProperty('--radius',    (t.radiusMd || 14) + 'px');
    root.style.setProperty('--radius-lg', (t.radiusLg || 22) + 'px');
    root.style.setProperty('--radius-sm', (t.radiusSm || 8)  + 'px');
    window._gscCurrentTheme = t;
  }

  // ── Utilitaire couleur ────────────────────────────────────────────────────
  function shadeColor(hex, percent) {
    try {
      var h = (hex || '').replace('#', '');
      if (h.length === 3) h = h.split('').map(function(c){ return c+c; }).join('');
      var r = parseInt(h.slice(0,2), 16);
      var g = parseInt(h.slice(2,4), 16);
      var b = parseInt(h.slice(4,6), 16);
      r = Math.min(255, Math.max(0, r + Math.round(255 * percent / 100)));
      g = Math.min(255, Math.max(0, g + Math.round(255 * percent / 100)));
      b = Math.min(255, Math.max(0, b + Math.round(255 * percent / 100)));
      return '#' + [r,g,b].map(function(v){ return v.toString(16).padStart(2,'0'); }).join('');
    } catch(e) { return hex || '#009E60'; }
  }

  // ── Démarrage Firestore avec le SDK MODULAR (index.html) ─────────────────
  function startModular() {
    var db = window.db;
    var colFn  = window.collection;
    var docFn  = window.doc;
    var getDoc = window.getDoc;
    var snapFn = window.onSnapshot;
    if (!db || !colFn || !docFn || !getDoc || !snapFn) return false;

    var ref = docFn(colFn(db, 'app_config'), 'theme');

    getDoc(ref).then(function(snap) {
      applyTheme(snap.exists() ? snap.data() : {});
    }).catch(function(e) {
      console.warn('[GSC Config] Lecture initiale :', e);
    });

    snapFn(ref, function(snap) {
      if (snap.exists()) applyTheme(snap.data());
    }, function(e) {
      console.warn('[GSC Config] onSnapshot :', e);
    });

    return true;
  }

  // ── Démarrage Firestore avec le SDK COMPAT (admin.html) ──────────────────
  function startCompat() {
    if (typeof firebase === 'undefined' || !firebase.firestore) return false;
    var db  = firebase.firestore();
    var ref = db.collection('app_config').doc('theme');

    ref.get().then(function(snap) {
      applyTheme(snap.exists ? snap.data() : {});
    }).catch(function(e) {
      console.warn('[GSC Config] Lecture initiale (compat) :', e);
    });

    ref.onSnapshot(function(snap) {
      if (snap.exists) applyTheme(snap.data());
    }, function(e) {
      console.warn('[GSC Config] onSnapshot (compat) :', e);
    });

    return true;
  }

  // ── Tentative de connexion avec retry ────────────────────────────────────
  var _attempts = 0;
  var _maxAttempts = 30; // 6 secondes max

  function tryConnect() {
    _attempts++;
    // Essaie d'abord modular (index.html), puis compat (admin.html)
    if (startModular() || startCompat()) return;
    if (_attempts < _maxAttempts) {
      setTimeout(tryConnect, 200);
    } else {
      console.warn('[GSC Config] Firebase introuvable après 6 s — thème par défaut conservé.');
    }
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────
  // Applique les valeurs par défaut immédiatement (évite le flash non stylé)
  applyTheme(DEFAULT_THEME);

  function init() {
    // index.html émet 'firebase-ready' quand le SDK modular est prêt
    document.addEventListener('firebase-ready', function() {
      startModular();
    });
    // Essaie aussi en polling (admin.html utilise les scripts compat synchrones)
    tryConnect();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── API publique pour admin-cms.js ───────────────────────────────────────
  window.gscThemeLoader = {
    applyTheme    : applyTheme,
    shadeColor    : shadeColor,
    DEFAULT_THEME : DEFAULT_THEME,
  };

})();
