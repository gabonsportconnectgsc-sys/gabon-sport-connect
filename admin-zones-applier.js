/**
 * admin-zones-applier.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Applique les modifications des zones textes, images et icônes en temps réel
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const ZONES_SELECTORS = {
    // Textes
    'topnav-logo-text': '.topnav-logo-text',
    'hero-title': '.hero-title',
    'hero-subtitle': '.hero-subtitle',
    'dashboard-heading': '.dashboard-heading',
    'card-titles': '.card-title',
    'modal-titles': '.modal-title',
    'button-texts': 'button',
    'label-texts': 'label',
    'nav-items': '.nav-item',
    'side-menu-items': '.side-menu-item',
    
    // Images
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

  window.gscZonesApplier = {
    applyZones: function(config) {
      if (!config) return;

      // Appliquer les zones textes
      if (config.zones) {
        Object.keys(config.zones).forEach(function(zoneId) {
          var zoneConfig = config.zones[zoneId];
          var selector = ZONES_SELECTORS[zoneId];
          if (!selector) return;

          var style = `
            font-size: ${zoneConfig.size}px !important;
            color: ${zoneConfig.color} !important;
            font-weight: ${zoneConfig.weight} !important;
            text-transform: ${zoneConfig.transform} !important;
          `;

          // Créer ou mettre à jour une feuille de styles
          var styleId = 'zone-style-' + zoneId;
          var styleEl = document.getElementById(styleId);
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = selector + ' { ' + style + ' }';
        });
      }

      // Appliquer les images
      if (config.images) {
        Object.keys(config.images).forEach(function(imageId) {
          var imgConfig = config.images[imageId];
          var selector = ZONES_SELECTORS[imageId];
          if (!selector) return;

          var shadowMap = {
            'none': 'none',
            'small': '0 1px 4px rgba(0,0,0,0.08)',
            'medium': '0 4px 20px rgba(0,0,0,0.1)',
            'large': '0 8px 40px rgba(0,0,0,0.14)'
          };

          var style = `
            width: ${imgConfig.size}px !important;
            height: ${imgConfig.size}px !important;
            opacity: ${imgConfig.opacity / 100} !important;
            border-radius: ${imgConfig.radius}px !important;
            box-shadow: ${shadowMap[imgConfig.shadow] || 'none'} !important;
            object-fit: cover;
          `;

          var styleId = 'image-style-' + imageId;
          var styleEl = document.getElementById(styleId);
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = selector + ' { ' + style + ' }';
        });
      }
    }
  };
})();
