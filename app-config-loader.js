/**
 * app-config-loader.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Charge le thème depuis Firestore et l'applique en temps réel à TOUTES les
 * pages (index.html ET admin.html), depuis n'importe quel appareil dans le monde.
 *
 * Inclut couleurs, rayons de bordure, polices, tailles de texte globales,
 * zones de texte personnalisées et images/icônes personnalisées.
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
    colorNavy    : '#0A1628',
    colorDanger  : '#ef4444',
    colorBg      : '#F0F2F5',
    radiusSm     : '8',
    radiusMd     : '14',
    radiusLg     : '22',
    fontDisplay  : "'Syne', sans-serif",
    fontBody     : "'Inter', system-ui, sans-serif",
    h1Size       : '28',
    h2Size       : '22',
    bodySize     : '14',
    lineHeight   : '1.6',
    zones        : {},
    images       : {}
  };

  // ── Charge dynamiquement une police Google Fonts si elle n'est pas déjà présente ──
  var _loadedFonts = {};
  function ensureFontLoaded(fontFamilyCss) {
    if (!fontFamilyCss) return;
    // Extrait le premier nom de famille entre quotes, ex: "'Poppins', sans-serif" → "Poppins"
    var m = /['"]([^'"]+)['"]/.exec(fontFamilyCss);
    var name = m ? m[1] : fontFamilyCss.split(',')[0].trim();
    if (!name || _loadedFonts[name]) return;
    // Polices système déjà disponibles sans Google Fonts
    var systemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica'];
    if (systemFonts.indexOf(name) !== -1) return;
    _loadedFonts[name] = true;
    var linkId = 'gsc-font-' + name.replace(/\s+/g, '-').toLowerCase();
    if (document.getElementById(linkId)) return;
    var link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(name).replace(/%20/g, '+') + ':wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  // ── Applique l'intégralité du thème (couleurs, rayons, polices, tailles) ──
  function applyTheme(theme) {
    var t = Object.assign({}, DEFAULT_THEME, theme || {});

    ensureFontLoaded(t.fontDisplay);
    ensureFontLoaded(t.fontBody);

    var styleId = 'gsc-theme-style';
    var styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    var css = ''
      + ':root {'
      + '--green:' + t.colorPrimary + ';'
      + '--green-dk:' + adjustColor(t.colorPrimary, -20) + ';'
      + '--green-lt:' + adjustColor(t.colorPrimary, 90) + ';'
      + '--yellow:' + t.colorAccent + ';'
      + '--navy:' + t.colorNavy + ';'
      + '--navy-md:' + adjustColor(t.colorNavy, 30) + ';'
      + '--white:#ffffff;'
      + '--gray-bg:' + t.colorBg + ';'
      + '--gray-bd:#e2e8f0;'
      + '--gray-txt:#64748b;'
      + '--danger:' + t.colorDanger + ';'
      + '--warn:#f59e0b;'
      + '--blue:#3b82f6;'
      + '--purple:#8b5cf6;'
      + '--orange:#f97316;'
      + '--teal:#0d9488;'
      + '--rose:#e11d48;'
      + '--font-display:' + t.fontDisplay + ';'
      + '--font-body:' + t.fontBody + ';'
      + '--radius:' + t.radiusMd + 'px;'
      + '--radius-sm:' + t.radiusSm + 'px;'
      + '--radius-md:' + t.radiusMd + 'px;'
      + '--radius-lg:' + t.radiusLg + 'px;'
      + '--shadow-sm:0 1px 4px rgba(0,0,0,.08);'
      + '--shadow-md:0 4px 20px rgba(0,0,0,.10);'
      + '--shadow-lg:0 8px 40px rgba(0,0,0,.14);'
      + '}'
      + 'h1,.h1{font-size:' + t.h1Size + 'px;font-family:var(--font-display);}'
      + 'h2,.h2{font-size:' + t.h2Size + 'px;font-family:var(--font-display);}'
      + 'body,p{font-size:' + t.bodySize + 'px;line-height:' + t.lineHeight + ';}'
      + '.topnav-logo-text span{font-family:var(--font-display);font-weight:800;}'
      + '.card-title,.dash-card-title,.modal-title{font-family:var(--font-display);font-weight:700;}'
      + 'button{font-family:var(--font-body);}'
      + 'label{font-family:var(--font-body);}'
      + '.nav-item,.side-menu-item{font-family:var(--font-body);}';

    styleEl.textContent = css;

    if (t.zones)  applyZonesStyles(t.zones);
    if (t.images) applyImagesStyles(t.images);

    window._gscCurrentTheme = t;
  }

  // ── Zones de texte personnalisées (taille, couleur, graisse, casse) ──────
  function applyZonesStyles(zones) {
    var styleId = 'gsc-zones-style';
    var styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    var css = '';
    Object.keys(zones).forEach(function (zoneId) {
      var zone = zones[zoneId];
      if (!zone) return;
      var selector = getZoneSelector(zoneId);
      if (!selector) return;
      css += selector + '{';
      if (zone.size)      css += 'font-size:' + zone.size + 'px !important;';
      if (zone.color)     css += 'color:' + zone.color + ' !important;';
      if (zone.weight)    css += 'font-weight:' + zone.weight + ' !important;';
      if (zone.transform) css += 'text-transform:' + zone.transform + ' !important;';
      if (zone.fontFamily) { css += 'font-family:' + zone.fontFamily + ' !important;'; ensureFontLoaded(zone.fontFamily); }
      if (zone.align)      css += 'text-align:' + zone.align + ' !important;';
      if (zone.hidden)     css += 'display:none !important;';
      css += '}';
    });
    styleEl.textContent = css;
  }

  // ── Images/icônes personnalisées (taille, position, forme, opacité…) ─────
  function applyImagesStyles(images) {
    var styleId = 'gsc-images-style';
    var styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    var shadowMap = {
      none:   'none',
      small:  '0 1px 4px rgba(0,0,0,0.08)',
      medium: '0 4px 20px rgba(0,0,0,0.1)',
      large:  '0 8px 40px rgba(0,0,0,0.14)'
    };
    // Formes prédéfinies → border-radius équivalent (ou clip-path pour les non-rectangulaires)
    var shapeMap = {
      square:        { radius: '0' },
      rounded:       { radius: null },     // utilise img.radius tel quel
      circle:        { radius: '50%' },
      hexagon:       { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' },
      'rounded-square': { radius: '18%' }
    };
    var css = '';
    Object.keys(images).forEach(function (imageId) {
      var img = images[imageId];
      if (!img) return;
      var selector = getImageSelector(imageId);
      if (!selector) return;

      css += selector + '{';
      if (img.size) css += 'width:' + img.size + 'px !important;height:' + img.size + 'px !important;';
      if (img.opacity !== undefined) css += 'opacity:' + (img.opacity / 100) + ' !important;';

      var shape = shapeMap[img.shape || 'rounded'];
      if (shape) {
        if (shape.clipPath) {
          css += 'clip-path:' + shape.clipPath + ' !important;border-radius:0 !important;';
        } else {
          var rad = shape.radius !== null ? shape.radius : ((img.radius || 0) + 'px');
          css += 'border-radius:' + rad + ' !important;';
        }
      } else if (img.radius) {
        css += 'border-radius:' + img.radius + 'px !important;';
      }

      if (img.shadow) css += 'box-shadow:' + (shadowMap[img.shadow] || 'none') + ' !important;';
      if (img.hidden) css += 'display:none !important;';
      css += 'object-fit:cover !important;';
      css += '}';

      // Position (gauche/droite/haut/bas) appliquée au conteneur parent flex le plus proche
      if (img.position && img.position !== 'default') {
        var posCss = getPositionCss(img.position);
        if (posCss) css += selector + '{' + posCss + '}';
      }
    });
    styleEl.textContent = css;
  }

  function getPositionCss(position) {
    var map = {
      left:   'margin-right:auto !important;order:-1;',
      right:  'margin-left:auto !important;order:99;',
      top:    'align-self:flex-start !important;',
      bottom: 'align-self:flex-end !important;'
    };
    return map[position] || '';
  }

  function getZoneSelector(zoneId) {
    var selectors = {
      'topnav-logo-text': '.topnav-logo-text',
      'hero-title': '.hero-title',
      'hero-subtitle': '.hero-subtitle',
      'dashboard-heading': '.dashboard-heading',
      'card-titles': '.card-title',
      'modal-titles': '.modal-title',
      'button-texts': 'button',
      'label-texts': 'label',
      'nav-items': '.nav-item',
      'side-menu-items': '.side-menu-item'
    };
    return selectors[zoneId];
  }

  function getImageSelector(imageId) {
    var selectors = {
      'topnav-logo-img': '.topnav-logo img',
      'hero-image': '.hero-image',
      'stat-icons': '.stat-real-icon',
      'card-icons': '.card-icon',
      'nav-icons': '.nav-icon',
      'side-menu-icons': '.smi-ico',
      'button-icons': '.btn-icon',
      'profile-avatar': '.profile-avatar',
      'team-photos': '.team-photo'
    };
    return selectors[imageId];
  }

  // ── Utilitaire couleur (assombrir/éclaircir un hex) ───────────────────────
  function adjustColor(hex, percent) {
    try {
      var num = parseInt((hex || '#009E60').replace('#', ''), 16);
      var amt = Math.round(2.55 * percent);
      var R = (num >> 16) + amt;
      var G = (num >> 8 & 0x00FF) + amt;
      var B = (num & 0x0000FF) + amt;
      R = R > 255 ? 255 : R < 0 ? 0 : R;
      G = G > 255 ? 255 : G < 0 ? 0 : G;
      B = B > 255 ? 255 : B < 0 ? 0 : B;
      return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1).toUpperCase();
    } catch (e) { return hex || '#009E60'; }
  }
  // Alias conservé pour compatibilité avec du code existant qui appellerait shadeColor
  var shadeColor = adjustColor;

  // ── Démarrage Firestore avec le SDK MODULAR (index.html) ─────────────────
  function startModular() {
    var db = window.db;
    var colFn  = window.collection;
    var docFn  = window.doc;
    var getDoc = window.getDoc;
    var snapFn = window.onSnapshot;
    if (!db || !colFn || !docFn || !getDoc || !snapFn) return false;

    var ref = docFn(colFn(db, 'app_config'), 'theme');

    getDoc(ref).then(function (snap) {
      applyTheme(snap.exists() ? snap.data() : {});
    }).catch(function (e) {
      console.warn('[GSC Config] Lecture initiale :', e);
      applyTheme(DEFAULT_THEME);
    });

    snapFn(ref, function (snap) {
      if (snap.exists()) applyTheme(snap.data());
    }, function (e) {
      console.warn('[GSC Config] onSnapshot :', e);
    });

    return true;
  }

  // ── Démarrage Firestore avec le SDK COMPAT (admin.html) ───────────────────
  function startCompat() {
    if (typeof firebase === 'undefined' || !firebase.firestore) return false;
    var db  = firebase.firestore();
    var ref = db.collection('app_config').doc('theme');

    ref.get().then(function (snap) {
      applyTheme(snap.exists ? snap.data() : {});
    }).catch(function (e) {
      console.warn('[GSC Config] Lecture initiale (compat) :', e);
      applyTheme(DEFAULT_THEME);
    });

    ref.onSnapshot(function (snap) {
      if (snap.exists) applyTheme(snap.data());
    }, function (e) {
      console.warn('[GSC Config] onSnapshot (compat) :', e);
    });

    return true;
  }

  // ── Tentative de connexion avec retry (couvre les deux SDK) ───────────────
  var _attempts = 0;
  var _maxAttempts = 30; // 6 secondes max

  function tryConnect() {
    _attempts++;
    if (startModular() || startCompat()) return;
    if (_attempts < _maxAttempts) {
      setTimeout(tryConnect, 200);
    } else {
      console.warn('[GSC Config] Firebase introuvable après 6 s — thème par défaut conservé.');
    }
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  applyTheme(DEFAULT_THEME); // évite le flash non stylé

  function init() {
    // index.html émet 'firebase-ready' quand le SDK modular est prêt
    document.addEventListener('firebase-ready', function () { startModular(); });
    // Couvre aussi admin.html (SDK compat, synchrone) et les cas de timing
    tryConnect();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── API publique pour admin-cms.js ────────────────────────────────────────
  window.gscThemeLoader = {
    applyTheme    : applyTheme,
    shadeColor    : shadeColor,
    adjustColor   : adjustColor,
    DEFAULT_THEME : DEFAULT_THEME
  };

})();
