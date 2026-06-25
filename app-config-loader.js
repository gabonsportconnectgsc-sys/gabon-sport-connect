/**
 * app-config-loader-v2.js (amélioré)
 * ─────────────────────────────────────────────────────────────────────────────
 * Charge et applique la configuration de thème depuis Firestore
 * Inclut couleurs, polices, tailles et zones textes/images
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const DEFAULT_THEME = {
    colorPrimary: '#009E60',
    colorAccent: '#FFD700',
    colorNavy: '#0A1628',
    colorDanger: '#ef4444',
    colorBg: '#F0F2F5',
    radiusSm: '8',
    radiusMd: '14',
    radiusLg: '22',
    fontDisplay: "'Syne', sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
    h1Size: '28',
    h2Size: '22',
    bodySize: '14',
    lineHeight: '1.6',
    zones: {},
    images: {}
  };

  function getDb() {
    return (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore()) ? firebase.firestore() : null;
  }

  function applyTheme(theme) {
    theme = Object.assign({}, DEFAULT_THEME, theme);

    // Créer ou mettre à jour la feuille de styles principale
    var styleId = 'gsc-theme-style';
    var styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    var css = `
      :root {
        --green: ${theme.colorPrimary};
        --green-dk: ${adjustColor(theme.colorPrimary, -20)};
        --green-lt: ${adjustColor(theme.colorPrimary, 90)};
        --yellow: ${theme.colorAccent};
        --navy: ${theme.colorNavy};
        --navy-md: ${adjustColor(theme.colorNavy, 30)};
        --white: #ffffff;
        --gray-bg: ${theme.colorBg};
        --gray-bd: #e2e8f0;
        --gray-txt: #64748b;
        --danger: ${theme.colorDanger};
        --warn: #f59e0b;
        --blue: #3b82f6;
        --purple: #8b5cf6;
        --orange: #f97316;
        --teal: #0d9488;
        --rose: #e11d48;
        --font-display: ${theme.fontDisplay};
        --font-body: ${theme.fontBody};
        --radius-sm: ${theme.radiusSm}px;
        --radius-md: ${theme.radiusMd}px;
        --radius-lg: ${theme.radiusLg}px;
        --shadow-sm: 0 1px 4px rgba(0,0,0,.08);
        --shadow-md: 0 4px 20px rgba(0,0,0,.10);
        --shadow-lg: 0 8px 40px rgba(0,0,0,.14);
      }

      h1, .h1 { font-size: ${theme.h1Size}px; font-family: var(--font-display); }
      h2, .h2 { font-size: ${theme.h2Size}px; font-family: var(--font-display); }
      body, p { font-size: ${theme.bodySize}px; line-height: ${theme.lineHeight}; font-family: var(--font-body); }
      
      .topnav-logo-text span { font-family: var(--font-display); font-weight: 800; }
      .card-title, .dash-card-title, .modal-title { font-family: var(--font-display); font-weight: 700; }
      button { font-family: var(--font-body); }
      label { font-family: var(--font-body); }
      .nav-item, .side-menu-item { font-family: var(--font-body); }
    `;

    styleEl.textContent = css;

    // Appliquer les zones textes
    if (theme.zones) {
      applyZonesStyles(theme.zones);
    }

    // Appliquer les images
    if (theme.images) {
      applyImagesStyles(theme.images);
    }
  }

  function applyZonesStyles(zones) {
    var styleId = 'gsc-zones-style';
    var styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    var css = '';
    Object.keys(zones).forEach(function(zoneId) {
      var zone = zones[zoneId];
      if (!zone) return;

      var selector = getZoneSelector(zoneId);
      if (!selector) return;

      css += selector + ' { ';
      if (zone.size) css += 'font-size: ' + zone.size + 'px !important; ';
      if (zone.color) css += 'color: ' + zone.color + ' !important; ';
      if (zone.weight) css += 'font-weight: ' + zone.weight + ' !important; ';
      if (zone.transform) css += 'text-transform: ' + zone.transform + ' !important; ';
      css += '} ';
    });

    styleEl.textContent = css;
  }

  function applyImagesStyles(images) {
    var styleId = 'gsc-images-style';
    var styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    var css = '';
    Object.keys(images).forEach(function(imageId) {
      var img = images[imageId];
      if (!img) return;

      var selector = getImageSelector(imageId);
      if (!selector) return;

      var shadowMap = {
        'none': 'none',
        'small': '0 1px 4px rgba(0,0,0,0.08)',
        'medium': '0 4px 20px rgba(0,0,0,0.1)',
        'large': '0 8px 40px rgba(0,0,0,0.14)'
      };

      css += selector + ' { ';
      if (img.size) css += 'width: ' + img.size + 'px !important; height: ' + img.size + 'px !important; ';
      if (img.opacity !== undefined) css += 'opacity: ' + (img.opacity / 100) + ' !important; ';
      if (img.radius) css += 'border-radius: ' + img.radius + 'px !important; ';
      if (img.shadow) css += 'box-shadow: ' + (shadowMap[img.shadow] || 'none') + ' !important; ';
      css += 'object-fit: cover !important; ';
      css += '} ';
    });

    styleEl.textContent = css;
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

  function adjustColor(hex, percent) {
    var num = parseInt(hex.replace('#', ''), 16);
    var amt = Math.round(2.55 * percent);
    var R = (num >> 16) + amt;
    var G = (num >> 8 & 0x00FF) + amt;
    var B = (num & 0x0000FF) + amt;
    
    R = R > 255 ? 255 : R < 0 ? 0 : R;
    G = G > 255 ? 255 : G < 0 ? 0 : G;
    B = B > 255 ? 255 : B < 0 ? 0 : B;
    
    return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1).toUpperCase();
  }

  function loadAndApplyTheme() {
    var db = getDb();
    if (!db) {
      applyTheme(DEFAULT_THEME);
      return;
    }

    db.collection('app_config').doc('theme').onSnapshot(function(doc) {
      var theme = doc.exists ? doc.data() : {};
      applyTheme(theme);
      console.log('[GSC] Thème appliqué depuis Firestore');
    }, function(error) {
      console.warn('[GSC] Erreur lecture Firestore, thème par défaut appliqué', error);
      applyTheme(DEFAULT_THEME);
    });
  }

  window.gscThemeLoader = {
    applyTheme: applyTheme,
    DEFAULT_THEME: DEFAULT_THEME,
    loadAndApply: loadAndApplyTheme
  };

  // Auto-load au démarrage
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndApplyTheme);
  } else {
    loadAndApplyTheme();
  }
})();
