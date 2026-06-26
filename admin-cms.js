/**
 * admin-cms.js - ENRICHI
 * ─────────────────────────────────────────────────────────────────────────────
 * CMS & Apparence amélioré avec édition visuelle des zones, typographies, tailles
 * et gestion des images/icônes
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── Pont d'authentification Firebase ──────────────────────────────────────
     Comme dans admin-controller.js : toute écriture/lecture Firestore doit
     passer par withAuth() pour garantir que le token Firebase Auth (obtenu via
     Supabase + Cloudflare Worker) est encore valide. Sans ça, le token expire
     après ~1h et Firestore rejette en permission-denied (capté en silence
     par un catch générique).
  ────────────────────────────────────────────────────────────────────────── */
  async function withAuth(fn) {
    // Guard : n'appelle le pont Auth que si firebase.auth est bien disponible.
    // Sans firebase-auth-compat.js chargé, firebase.auth n'est pas une fonction
    // et l'appel planterait avec "firebase.auth is not a function".
    if (typeof window.ensureFirebaseAuthViaSupabase === 'function') {
      if (window.firebase && typeof window.firebase.auth === 'function') {
        try {
          await window.ensureFirebaseAuthViaSupabase();
        } catch (e) {
          console.warn('[GSC CMS] withAuth — pont Auth ignoré (non critique) :', e && e.message || e);
        }
      } else {
        console.warn('[GSC CMS] withAuth — firebase.auth non disponible, tentative Firestore sans renouvellement du token.');
      }
    }
    return fn();
  }

  const ZONES_CONFIG = {
    texts: [
      { id: 'topnav-logo-text', label: 'Logo - Texte (Gabon Sport Connect)', type: 'text', selector: '.topnav-logo-text' },
      { id: 'hero-title', label: 'En-tête - Titre principal', type: 'text', selector: '.hero-title' },
      { id: 'hero-subtitle', label: 'En-tête - Sous-titre', type: 'text', selector: '.hero-subtitle' },
      { id: 'dashboard-heading', label: 'Tableau de bord - Titre', type: 'text', selector: '.dashboard-heading' },
      { id: 'card-titles', label: 'Titres des cartes', type: 'text', selector: '.card-title' },
      { id: 'modal-titles', label: 'Titres des modales', type: 'text', selector: '.modal-title' },
      { id: 'button-texts', label: 'Texte des boutons', type: 'text', selector: 'button' },
      { id: 'label-texts', label: 'Étiquettes (labels)', type: 'text', selector: 'label' },
      { id: 'nav-items', label: 'Éléments de navigation', type: 'text', selector: '.nav-item' },
      { id: 'side-menu-items', label: 'Menu latéral - Éléments', type: 'text', selector: '.side-menu-item' }
    ],
    images: [
      { id: 'topnav-logo-img', label: 'Logo - Image', type: 'image', selector: '.topnav-logo img' },
      { id: 'hero-image', label: 'En-tête - Image de fond', type: 'image', selector: '.hero-image' },
      { id: 'stat-icons', label: 'Icônes des statistiques', type: 'image', selector: '.stat-real-icon' },
      { id: 'card-icons', label: 'Icônes des cartes', type: 'image', selector: '.card-icon' },
      { id: 'nav-icons', label: 'Icônes de navigation', type: 'image', selector: '.nav-icon' },
      { id: 'side-menu-icons', label: 'Icônes menu latéral', type: 'image', selector: '.smi-ico' },
      { id: 'button-icons', label: 'Icônes des boutons', type: 'image', selector: '.btn-icon' },
      { id: 'profile-avatar', label: 'Avatar utilisateur', type: 'image', selector: '.profile-avatar' },
      { id: 'team-photos', label: 'Photos des équipes', type: 'image', selector: '.team-photo' }
    ]
  };

  // Liste de polices façon menu déroulant Word — chargées dynamiquement par
  // app-config-loader.js (ensureFontLoaded) dès qu'elles sont sélectionnées.
  const FONTS = [
    { name: 'Inter', value: "'Inter', system-ui, sans-serif" },
    { name: 'Syne', value: "'Syne', sans-serif" },
    { name: 'Poppins', value: "'Poppins', sans-serif" },
    { name: 'Raleway', value: "'Raleway', sans-serif" },
    { name: 'DM Sans', value: "'DM Sans', sans-serif" },
    { name: 'Outfit', value: "'Outfit', sans-serif" },
    { name: 'Space Mono', value: "'Space Mono', monospace" },
    { name: 'Montserrat', value: "'Montserrat', sans-serif" },
    { name: 'Roboto', value: "'Roboto', sans-serif" },
    { name: 'Open Sans', value: "'Open Sans', sans-serif" },
    { name: 'Lato', value: "'Lato', sans-serif" },
    { name: 'Nunito', value: "'Nunito', sans-serif" },
    { name: 'Playfair Display', value: "'Playfair Display', serif" },
    { name: 'Merriweather', value: "'Merriweather', serif" },
    { name: 'Oswald', value: "'Oswald', sans-serif" },
    { name: 'Work Sans', value: "'Work Sans', sans-serif" },
    { name: 'Manrope', value: "'Manrope', sans-serif" },
    { name: 'Bricolage Grotesque', value: "'Bricolage Grotesque', sans-serif" }
  ];

  // Formes disponibles pour les images / icônes
  const SHAPES = [
    { value: 'square', label: '⬛ Carré' },
    { value: 'rounded', label: '⬜ Coins arrondis' },
    { value: 'rounded-square', label: '🔲 Carré très arrondi' },
    { value: 'circle', label: '⚪ Rond' },
    { value: 'hexagon', label: '⬡ Hexagone' }
  ];

  // Positions disponibles pour les images / icônes
  const POSITIONS = [
    { value: 'default', label: '↔️ Par défaut' },
    { value: 'left', label: '⬅️ Gauche' },
    { value: 'right', label: '➡️ Droite' },
    { value: 'top', label: '⬆️ Haut' },
    { value: 'bottom', label: '⬇️ Bas' }
  ];

  function injectCmsUI() {
    // Guard: ne ré-injecter que la section div#cms si elle est absente.
    // Les boutons #nav-cms et #mnav-cms sont déjà présents dans le HTML statique —
    // inutile de les recréer ici.
    if (document.getElementById('cms')) return;

    var mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    var section = document.createElement('div');
    section.id = 'cms';
    section.className = 'section';
    section.innerHTML = buildCmsHTML();
    mainContent.appendChild(section);
  }

  function buildCmsHTML() {
    return `
    <div class="admin-header" style="background:linear-gradient(135deg,#0A1628,#1a2d4a 55%,#0d3a1f);">
      <div class="admin-header-title">🎨 CMS &amp; Apparence — Édition Visuelle</div>
      <div class="admin-header-sub">Personnalisez les zones de texte, images, polices et tailles — modifications en temps réel</div>
    </div>

    <!-- Onglets -->
    <div class="cms-tabs" style="display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid #e2e8f0;flex-wrap:wrap;">
      <button class="cms-tab active" data-tab="colors" style="padding:12px 16px;border:none;background:none;cursor:pointer;border-bottom:2px solid var(--green);color:var(--navy);font-weight:600;font-size:14px;">🎨 Couleurs</button>
      <button class="cms-tab" data-tab="typography" style="padding:12px 16px;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;color:#64748b;font-weight:600;font-size:14px;transition:.2s;">✍️ Typographies</button>
      <button class="cms-tab" data-tab="zones" style="padding:12px 16px;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;color:#64748b;font-weight:600;font-size:14px;transition:.2s;">🖼️ Zones textes</button>
      <button class="cms-tab" data-tab="images" style="padding:12px 16px;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;color:#64748b;font-weight:600;font-size:14px;transition:.2s;">📷 Images/Icônes</button>
    </div>

    <!-- TAB: COULEURS -->
    <div class="cms-tab-content active" data-tab="colors">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;" class="cms-grid">
        <div class="dash-card">
          <div class="dash-card-title">🎨 Couleurs de l'application</div>
          <div class="cms-row">
            <label class="cms-label">Couleur principale</label>
            <div class="cms-color-row">
              <input type="color" id="cms-color-primary" value="#009E60" class="cms-color-input">
              <input type="text" id="cms-hex-primary" value="#009E60" class="cms-hex-input">
            </div>
          </div>
          <div class="cms-row">
            <label class="cms-label">Accent (jaune)</label>
            <div class="cms-color-row">
              <input type="color" id="cms-color-accent" value="#FFD700" class="cms-color-input">
              <input type="text" id="cms-hex-accent" value="#FFD700" class="cms-hex-input">
            </div>
          </div>
          <div class="cms-row">
            <label class="cms-label">Marine (header)</label>
            <div class="cms-color-row">
              <input type="color" id="cms-color-navy" value="#0A1628" class="cms-color-input">
              <input type="text" id="cms-hex-navy" value="#0A1628" class="cms-hex-input">
            </div>
          </div>
          <div class="cms-row">
            <label class="cms-label">Danger</label>
            <div class="cms-color-row">
              <input type="color" id="cms-color-danger" value="#ef4444" class="cms-color-input">
              <input type="text" id="cms-hex-danger" value="#ef4444" class="cms-hex-input">
            </div>
          </div>
          <div class="cms-row">
            <label class="cms-label">Fond général</label>
            <div class="cms-color-row">
              <input type="color" id="cms-color-bg" value="#F0F2F5" class="cms-color-input">
              <input type="text" id="cms-hex-bg" value="#F0F2F5" class="cms-hex-input">
            </div>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-title">🔲 Bordures arrondies</div>
          <div class="cms-row">
            <label class="cms-label">Bordure légère (cartes)</label>
            <input type="range" id="cms-radius-light" min="0" max="20" value="8" class="cms-slider" style="width:100%;margin:8px 0;">
            <span class="cms-value-label" id="cms-radius-light-val">8px</span>
          </div>
          <div class="cms-row">
            <label class="cms-label">Bordure normale (boutons)</label>
            <input type="range" id="cms-radius-normal" min="0" max="20" value="10" class="cms-slider" style="width:100%;margin:8px 0;">
            <span class="cms-value-label" id="cms-radius-normal-val">10px</span>
          </div>
          <div class="cms-row">
            <label class="cms-label">Bordure forte (images)</label>
            <input type="range" id="cms-radius-strong" min="0" max="20" value="12" class="cms-slider" style="width:100%;margin:8px 0;">
            <span class="cms-value-label" id="cms-radius-strong-val">12px</span>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: TYPOGRAPHIES -->
    <div class="cms-tab-content" data-tab="typography">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;" class="cms-grid">
        <div class="dash-card">
          <div class="dash-card-title">✍️ Polices par zone</div>
          <div class="cms-row">
            <label class="cms-label">En-têtes (h1, h2, h3)</label>
            <select id="cms-font-heading" class="cms-select">
              ${FONTS.map(f => `<option value="${f.value}">${f.name}</option>`).join('')}
            </select>
          </div>
          <div class="cms-row">
            <label class="cms-label">Corps (paragraphes, corps)</label>
            <select id="cms-font-body" class="cms-select">
              ${FONTS.map(f => `<option value="${f.value}">${f.name}</option>`).join('')}
            </select>
          </div>
          <div class="cms-row">
            <label class="cms-label">Boutons &amp; étiquettes</label>
            <select id="cms-font-buttons" class="cms-select">
              ${FONTS.map(f => `<option value="${f.value}">${f.name}</option>`).join('')}
            </select>
          </div>
          <div class="cms-row">
            <label class="cms-label">Code/monospace</label>
            <select id="cms-font-mono" class="cms-select">
              ${FONTS.map(f => `<option value="${f.value}">${f.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-title">📏 Tailles de typographies</div>
          <div class="cms-row">
            <label class="cms-label">Titre principal (h1)</label>
            <input type="range" id="cms-size-h1" min="20" max="60" value="40" class="cms-slider" style="width:100%;margin:8px 0;">
            <span class="cms-value-label" id="cms-size-h1-val">40px</span>
          </div>
          <div class="cms-row">
            <label class="cms-label">Titre secondaire (h2)</label>
            <input type="range" id="cms-size-h2" min="16" max="40" value="28" class="cms-slider" style="width:100%;margin:8px 0;">
            <span class="cms-value-label" id="cms-size-h2-val">28px</span>
          </div>
          <div class="cms-row">
            <label class="cms-label">Corps (p)</label>
            <input type="range" id="cms-size-body" min="12" max="20" value="16" class="cms-slider" style="width:100%;margin:8px 0;">
            <span class="cms-value-label" id="cms-size-body-val">16px</span>
          </div>
          <div class="cms-row">
            <label class="cms-label">Petit texte (small)</label>
            <input type="range" id="cms-size-small" min="10" max="14" value="12" class="cms-slider" style="width:100%;margin:8px 0;">
            <span class="cms-value-label" id="cms-size-small-val">12px</span>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: ZONES TEXTES -->
    <div class="cms-tab-content" data-tab="zones">
      <div class="dash-card">
        <div class="dash-card-title">🖼️ Éditer zones de texte</div>
        <input type="text" id="zones-search" placeholder="Rechercher une zone…" class="cms-search-input" style="width:100%;padding:10px;margin-bottom:16px;border:1px solid #cbd5e1;border-radius:8px;">
        <div id="cms-zones-container" style="display:grid;gap:12px;">
          <!-- Sera généré par JavaScript -->
        </div>
      </div>
    </div>

    <!-- TAB: IMAGES/ICÔNES -->
    <div class="cms-tab-content" data-tab="images">
      <div class="dash-card">
        <div class="dash-card-title">📷 Éditer images &amp; icônes</div>
        <input type="text" id="images-search" placeholder="Rechercher une image…" class="cms-search-input" style="width:100%;padding:10px;margin-bottom:16px;border:1px solid #cbd5e1;border-radius:8px;">
        <div id="cms-images-container" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">
          <!-- Sera généré par JavaScript -->
        </div>
        <button id="cms-btn-add-image" style="margin-top:16px;padding:10px 16px;background:#009E60;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">➕ Ajouter une image personnalisée</button>
      </div>
    </div>

    <!-- Boutons globaux en bas -->
    <div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap;justify-content:flex-end;">
      <button id="cms-btn-reset" style="padding:10px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font-weight:600;color:#64748b;">↺ Réinitialiser aux défauts</button>
      <button id="cms-btn-export" style="padding:10px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font-weight:600;color:#64748b;">⬇️ Exporter config</button>
      <button id="cms-btn-save" style="padding:10px 16px;background:#009E60;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">💾 Sauvegarder tous les changements</button>
    </div>
    `;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // COLLECTE & CHARGEMENT THÈME
  // ────────────────────────────────────────────────────────────────────────────

  function collectTheme() {
    var theme = {};
    // Couleurs
    theme.colorPrimary = document.getElementById('cms-hex-primary')?.value || '#009E60';
    theme.colorAccent = document.getElementById('cms-hex-accent')?.value || '#FFD700';
    theme.colorNavy = document.getElementById('cms-hex-navy')?.value || '#0A1628';
    theme.colorDanger = document.getElementById('cms-hex-danger')?.value || '#ef4444';
    theme.colorBg = document.getElementById('cms-hex-bg')?.value || '#F0F2F5';
    theme.radiusLight = (document.getElementById('cms-radius-light')?.value || 8) + 'px';
    theme.radiusNormal = (document.getElementById('cms-radius-normal')?.value || 10) + 'px';
    theme.radiusStrong = (document.getElementById('cms-radius-strong')?.value || 12) + 'px';
    // Typographies
    theme.fontHeading = document.getElementById('cms-font-heading')?.value || "'Inter', system-ui, sans-serif";
    theme.fontBody = document.getElementById('cms-font-body')?.value || "'Inter', system-ui, sans-serif";
    theme.fontButtons = document.getElementById('cms-font-buttons')?.value || "'Inter', system-ui, sans-serif";
    theme.fontMono = document.getElementById('cms-font-mono')?.value || "'Space Mono', monospace";
    theme.sizeH1 = (document.getElementById('cms-size-h1')?.value || 40) + 'px';
    theme.sizeH2 = (document.getElementById('cms-size-h2')?.value || 28) + 'px';
    theme.sizeBody = (document.getElementById('cms-size-body')?.value || 16) + 'px';
    theme.sizeSmall = (document.getElementById('cms-size-small')?.value || 12) + 'px';
    // Zones textes
    theme.zones = {};
    document.querySelectorAll('.cms-zone-input').forEach(function(inp) {
      var zoneId = inp.getAttribute('data-zone');
      if (zoneId) theme.zones[zoneId] = inp.value;
    });
    // Images
    theme.images = {};
    document.querySelectorAll('.image-upload-input').forEach(function(inp) {
      var imageId = inp.getAttribute('data-image');
      if (imageId) {
        theme.images[imageId] = {
          src: inp.getAttribute('data-src') || '',
          size: (document.querySelector(`.image-size-slider[data-image="${imageId}"]`)?.value || 40) + '%',
          opacity: (document.querySelector(`.image-opacity-slider[data-image="${imageId}"]`)?.value || 100) + '%',
          radius: (document.querySelector(`.image-radius-slider[data-image="${imageId}"]`)?.value || 0) + 'px',
          shadow: document.querySelector(`.image-shadow-select[data-image="${imageId}"]`)?.value || 'none',
          position: document.querySelector(`.image-position-select[data-image="${imageId}"]`)?.value || 'default',
          shape: document.querySelector(`.image-shape-select[data-image="${imageId}"]`)?.value || 'rounded',
          hidden: (document.querySelector(`.image-card[data-image-card="${imageId}"]`)?.classList.contains('is-hidden') || false)
        };
      }
    });
    return theme;
  }

  function populateInputs(theme) {
    if (!theme) theme = {};
    // Couleurs
    if (theme.colorPrimary) {
      var primEl = document.getElementById('cms-color-primary');
      var primHex = document.getElementById('cms-hex-primary');
      if (primEl) primEl.value = theme.colorPrimary;
      if (primHex) primHex.value = theme.colorPrimary;
    }
    if (theme.colorAccent) {
      var accentEl = document.getElementById('cms-color-accent');
      var accentHex = document.getElementById('cms-hex-accent');
      if (accentEl) accentEl.value = theme.colorAccent;
      if (accentHex) accentHex.value = theme.colorAccent;
    }
    if (theme.colorNavy) {
      var navyEl = document.getElementById('cms-color-navy');
      var navyHex = document.getElementById('cms-hex-navy');
      if (navyEl) navyEl.value = theme.colorNavy;
      if (navyHex) navyHex.value = theme.colorNavy;
    }
    if (theme.colorDanger) {
      var dangerEl = document.getElementById('cms-color-danger');
      var dangerHex = document.getElementById('cms-hex-danger');
      if (dangerEl) dangerEl.value = theme.colorDanger;
      if (dangerHex) dangerHex.value = theme.colorDanger;
    }
    if (theme.colorBg) {
      var bgEl = document.getElementById('cms-color-bg');
      var bgHex = document.getElementById('cms-hex-bg');
      if (bgEl) bgEl.value = theme.colorBg;
      if (bgHex) bgHex.value = theme.colorBg;
    }
    // Radius
    if (theme.radiusLight) {
      var rl = document.getElementById('cms-radius-light');
      if (rl) rl.value = parseInt(theme.radiusLight) || 8;
    }
    if (theme.radiusNormal) {
      var rn = document.getElementById('cms-radius-normal');
      if (rn) rn.value = parseInt(theme.radiusNormal) || 10;
    }
    if (theme.radiusStrong) {
      var rs = document.getElementById('cms-radius-strong');
      if (rs) rs.value = parseInt(theme.radiusStrong) || 12;
    }
    // Polices
    if (theme.fontHeading) {
      var fh = document.getElementById('cms-font-heading');
      if (fh) fh.value = theme.fontHeading;
    }
    if (theme.fontBody) {
      var fb = document.getElementById('cms-font-body');
      if (fb) fb.value = theme.fontBody;
    }
    if (theme.fontButtons) {
      var fbtn = document.getElementById('cms-font-buttons');
      if (fbtn) fbtn.value = theme.fontButtons;
    }
    if (theme.fontMono) {
      var fm = document.getElementById('cms-font-mono');
      if (fm) fm.value = theme.fontMono;
    }
    // Tailles
    if (theme.sizeH1) {
      var sh1 = document.getElementById('cms-size-h1');
      if (sh1) sh1.value = parseInt(theme.sizeH1) || 40;
    }
    if (theme.sizeH2) {
      var sh2 = document.getElementById('cms-size-h2');
      if (sh2) sh2.value = parseInt(theme.sizeH2) || 28;
    }
    if (theme.sizeBody) {
      var sb = document.getElementById('cms-size-body');
      if (sb) sb.value = parseInt(theme.sizeBody) || 16;
    }
    if (theme.sizeSmall) {
      var ss = document.getElementById('cms-size-small');
      if (ss) ss.value = parseInt(theme.sizeSmall) || 12;
    }
    // Zones
    if (theme.zones) {
      Object.keys(theme.zones).forEach(function(zoneId) {
        var inp = document.querySelector(`.cms-zone-input[data-zone="${zoneId}"]`);
        if (inp) inp.value = theme.zones[zoneId];
      });
    }
    // Images
    if (theme.images) {
      Object.keys(theme.images).forEach(function(imageId) {
        var imgData = theme.images[imageId];
        var sizeSlider = document.querySelector(`.image-size-slider[data-image="${imageId}"]`);
        var opacitySlider = document.querySelector(`.image-opacity-slider[data-image="${imageId}"]`);
        var radiusSlider = document.querySelector(`.image-radius-slider[data-image="${imageId}"]`);
        var shadowSel = document.querySelector(`.image-shadow-select[data-image="${imageId}"]`);
        var posSel = document.querySelector(`.image-position-select[data-image="${imageId}"]`);
        var shapeSel = document.querySelector(`.image-shape-select[data-image="${imageId}"]`);
        if (sizeSlider) sizeSlider.value = parseInt(imgData.size) || 40;
        if (opacitySlider) opacitySlider.value = parseInt(imgData.opacity) || 100;
        if (radiusSlider) radiusSlider.value = parseInt(imgData.radius) || 0;
        if (shadowSel) shadowSel.value = imgData.shadow || 'none';
        if (posSel) posSel.value = imgData.position || 'default';
        if (shapeSel) shapeSel.value = imgData.shape || 'rounded';
        if (imgData.hidden) setImageHidden(imageId, true);
      });
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // INTERFACE CONSTRUCTION
  // ────────────────────────────────────────────────────────────────────────────

  function buildZonesUI() {
    var container = document.getElementById('cms-zones-container');
    if (!container) return;
    container.innerHTML = '';
    ZONES_CONFIG.texts.forEach(function(zone) {
      var card = document.createElement('div');
      card.className = 'dash-card cms-zone-card';
      card.innerHTML = `
        <div class="dash-card-title" style="margin-bottom:8px;"><span>${zone.label}</span></div>
        <div style="display:flex;gap:8px;">
          <input type="text" class="cms-zone-input" data-zone="${zone.id}" placeholder="Entrez le texte…" style="flex:1;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
          <button class="cms-zone-reset-btn" data-zone="${zone.id}" style="padding:8px 12px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;color:#64748b;">↺</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function buildImagesUI() {
    var container = document.getElementById('cms-images-container');
    if (!container) return;
    container.innerHTML = '';
    ZONES_CONFIG.images.forEach(function(img) {
      var card = document.createElement('div');
      card.className = 'dash-card image-card';
      card.setAttribute('data-image-card', img.id);
      card.innerHTML = `
        <div class="dash-card-title" style="margin-bottom:12px;"><span>${img.label}</span></div>
        <div style="background:#f8f9fa;padding:12px;border-radius:8px;margin-bottom:12px;text-align:center;min-height:100px;display:flex;align-items:center;justify-content:center;">
          <img class="image-preview-thumb" data-image="${img.id}" src="" alt="${img.label}" style="max-width:100%;max-height:100%;display:none;">
          <span class="image-no-preview" data-image="${img.id}">📷 Aucune image</span>
        </div>
        <input type="file" class="image-upload-input" data-image="${img.id}" accept="image/*" style="width:100%;margin-bottom:8px;">
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button class="image-confirm-btn" data-image="${img.id}" style="flex:1;padding:8px 12px;background:#009E60;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">✓ Confirmer</button>
          <button class="image-hide-btn" data-image="${img.id}" style="flex:1;padding:8px 12px;background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">🙈 Masquer</button>
          <button class="image-reset-btn" data-image="${img.id}" style="flex:1;padding:8px 12px;background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">↺ Réinit</button>
        </div>
        <div style="font-size:11px;color:#64748b;margin-bottom:8px;font-weight:600;">Taille:</div>
        <input type="range" class="image-size-slider" data-image="${img.id}" min="10" max="100" value="40" style="width:100%;margin-bottom:4px;">
        <span class="cms-value-label" style="font-size:11px;">40%</span>
        <div style="font-size:11px;color:#64748b;margin:12px 0 8px 0;font-weight:600;">Opacité:</div>
        <input type="range" class="image-opacity-slider" data-image="${img.id}" min="0" max="100" value="100" style="width:100%;margin-bottom:4px;">
        <span class="cms-value-label" style="font-size:11px;">100%</span>
        <div style="font-size:11px;color:#64748b;margin:12px 0 8px 0;font-weight:600;">Arrondi:</div>
        <input type="range" class="image-radius-slider" data-image="${img.id}" min="0" max="50" value="0" style="width:100%;margin-bottom:4px;">
        <span class="cms-value-label" style="font-size:11px;">0px</span>
        <div style="font-size:11px;color:#64748b;margin:12px 0 8px 0;font-weight:600;">Ombre:</div>
        <select class="image-shadow-select" data-image="${img.id}" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;">
          <option value="none">Aucune</option>
          <option value="sm">Légère</option>
          <option value="md">Normale</option>
          <option value="lg">Forte</option>
        </select>
        <div style="font-size:11px;color:#64748b;margin:12px 0 8px 0;font-weight:600;">Position:</div>
        <select class="image-position-select" data-image="${img.id}" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;">
          ${POSITIONS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
        </select>
        <div style="font-size:11px;color:#64748b;margin:12px 0 8px 0;font-weight:600;">Forme:</div>
        <select class="image-shape-select" data-image="${img.id}" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;">
          ${SHAPES.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
        </select>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;">
          <span class="cms-status-badge" id="image-status-${img.id}" style="display:inline-block;padding:4px 8px;background:#f1f5f9;border-radius:4px;font-size:11px;color:#64748b;font-weight:600;">⏳ En attente</span>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GESTION IMAGES
  // ────────────────────────────────────────────────────────────────────────────

  function setImageHidden(imageId, hidden) {
    var card = document.querySelector(`.image-card[data-image-card="${imageId}"]`);
    if (!card) return;
    if (hidden) {
      card.classList.add('is-hidden');
      card.style.opacity = '0.5';
    } else {
      card.classList.remove('is-hidden');
      card.style.opacity = '1';
    }
  }

  function wireEvents() {
    buildZonesUI();
    buildImagesUI();

    // Couleurs - sync color input <-> hex input
    ['primary', 'accent', 'navy', 'danger', 'bg'].forEach(function(c) {
      var colorEl = document.getElementById('cms-color-' + c);
      var hexEl = document.getElementById('cms-hex-' + c);
      if (colorEl) {
        colorEl.addEventListener('input', function() {
          if (hexEl) hexEl.value = this.value;
          livePreview();
        });
      }
      if (hexEl) {
        hexEl.addEventListener('input', function() {
          if (colorEl) colorEl.value = this.value;
          livePreview();
        });
      }
    });

    // Radius sliders
    ['light', 'normal', 'strong'].forEach(function(r) {
      var slider = document.getElementById('cms-radius-' + r);
      if (slider) {
        slider.addEventListener('input', function() {
          var valEl = document.getElementById('cms-radius-' + r + '-val');
          if (valEl) valEl.textContent = this.value + 'px';
          livePreview();
        });
      }
    });

    // Font selects
    ['heading', 'body', 'buttons', 'mono'].forEach(function(f) {
      var sel = document.getElementById('cms-font-' + f);
      if (sel) {
        sel.addEventListener('change', function() {
          if (window.gscThemeLoader) window.gscThemeLoader.ensureFontLoaded(this.options[this.selectedIndex].text);
          livePreview();
        });
      }
    });

    // Size sliders
    ['h1', 'h2', 'body', 'small'].forEach(function(s) {
      var slider = document.getElementById('cms-size-' + s);
      if (slider) {
        slider.addEventListener('input', function() {
          var valEl = document.getElementById('cms-size-' + s + '-val');
          if (valEl) valEl.textContent = this.value + 'px';
          livePreview();
        });
      }
    });

    // Zones de texte
    document.querySelectorAll('.cms-zone-input').forEach(function(inp) {
      inp.addEventListener('input', livePreview);
    });

    document.querySelectorAll('.cms-zone-reset-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var zoneId = this.getAttribute('data-zone');
        var inp = document.querySelector(`.cms-zone-input[data-zone="${zoneId}"]`);
        if (inp) inp.value = '';
        livePreview();
      });
    });

    // Onglets
    document.querySelectorAll('.cms-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        var activeTab = this.getAttribute('data-tab');
        document.querySelectorAll('.cms-tab').forEach(function(t){ t.classList.remove('active'); });
        document.querySelectorAll('.cms-tab-content').forEach(function(c){ c.classList.remove('active'); });
        this.classList.add('active');
        document.querySelector(`.cms-tab-content[data-tab="${activeTab}"]`)?.classList.add('active');
        // Update active tab indicator
        document.querySelectorAll('.cms-tab').forEach(function(t) {
          var isActive = t === tab;
          t.style.borderBottomColor = isActive ? 'var(--green)' : 'transparent';
          t.style.color = isActive ? 'var(--navy)' : '#64748b';
        });
      });
    });

    // Images: Upload
    document.querySelectorAll('.image-upload-input').forEach(function(inp) {
      inp.addEventListener('change', function() {
        var imageId = this.getAttribute('data-image');
        var file = this.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
          var src = e.target.result;
          var inp = document.querySelector(`.image-upload-input[data-image="${imageId}"]`);
          if (inp) inp.setAttribute('data-src', src);
          var thumb = document.querySelector(`.image-preview-thumb[data-image="${imageId}"]`);
          var noPreview = document.querySelector(`.image-no-preview[data-image="${imageId}"]`);
          if (thumb) {
            thumb.src = src;
            thumb.style.display = 'block';
          }
          if (noPreview) noPreview.style.display = 'none';
          var badge = document.getElementById('image-status-' + imageId);
          if (badge) {
            badge.textContent = '⏳ En attente';
            badge.className = 'cms-status-badge cms-status-pending';
          }
        };
        reader.readAsDataURL(file);
      });
    });

    // Images: Slider events
    document.querySelectorAll('.image-size-slider').forEach(function(slider) {
      slider.addEventListener('input', function() {
        var imageId = this.getAttribute('data-image');
        var label = this.parentElement.querySelector('.cms-value-label');
        if (label) label.textContent = this.value + '%';
        livePreview();
      });
    });

    document.querySelectorAll('.image-opacity-slider').forEach(function(slider) {
      slider.addEventListener('input', function() {
        var imageId = this.getAttribute('data-image');
        var label = this.parentElement.querySelector('.cms-value-label');
        if (label) label.textContent = this.value + '%';
        livePreview();
      });
    });

    document.querySelectorAll('.image-radius-slider').forEach(function(slider) {
      slider.addEventListener('input', function() {
        var imageId = this.getAttribute('data-image');
        var label = this.parentElement.querySelector('.cms-value-label');
        if (label) label.textContent = this.value + 'px';
        livePreview();
      });
    });

    // Images: Select events
    document.querySelectorAll('.image-shadow-select, .image-position-select, .image-shape-select').forEach(function(sel) {
      sel.addEventListener('change', livePreview);
    });

    // Images: Confirm
    document.querySelectorAll('.image-confirm-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var imageId = this.getAttribute('data-image');
        var badge = document.getElementById('image-status-' + imageId);
        if (badge && !document.querySelector(`.image-card[data-image-card="${imageId}"]`).classList.contains('is-hidden')) {
          badge.textContent = '✅ Confirmé';
          badge.className = 'cms-status-badge cms-status-confirmed';
        }
        livePreview();
        showToast('✅ Image « ' + imageLabelOf(imageId) + ' » confirmée.', 'success');
      });
    });

    document.querySelectorAll('.image-hide-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var imageId = this.getAttribute('data-image');
        var card = document.querySelector(`.image-card[data-image-card="${imageId}"]`);
        var nowHidden = card ? !card.classList.contains('is-hidden') : true;
        setImageHidden(imageId, nowHidden);
        this.textContent = nowHidden ? '👁️ Afficher' : '🙈 Masquer';
        livePreview();
      });
    });

    document.querySelectorAll('.image-reset-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var imageId = this.getAttribute('data-image');
        var sizeEl = document.querySelector(`.image-size-slider[data-image="${imageId}"]`);
        if (sizeEl) { sizeEl.value = 40; sizeEl.dispatchEvent(new Event('input')); }
        var opacityEl = document.querySelector(`.image-opacity-slider[data-image="${imageId}"]`);
        if (opacityEl) { opacityEl.value = 100; opacityEl.dispatchEvent(new Event('input')); }
        var radiusEl = document.querySelector(`.image-radius-slider[data-image="${imageId}"]`);
        if (radiusEl) { radiusEl.value = 0; radiusEl.dispatchEvent(new Event('input')); }
        var shadowEl = document.querySelector(`.image-shadow-select[data-image="${imageId}"]`);
        if (shadowEl) shadowEl.value = 'none';
        var posEl = document.querySelector(`.image-position-select[data-image="${imageId}"]`);
        if (posEl) posEl.value = 'default';
        var shapeEl = document.querySelector(`.image-shape-select[data-image="${imageId}"]`);
        if (shapeEl) shapeEl.value = 'rounded';
        setImageHidden(imageId, false);
        var hideBtn = document.querySelector(`.image-hide-btn[data-image="${imageId}"]`);
        if (hideBtn) hideBtn.textContent = '🙈 Masquer';
        livePreview();
      });
    });

    // Recherche dans la liste des images/icônes
    var imagesSearch = document.getElementById('images-search');
    if (imagesSearch) {
      imagesSearch.addEventListener('input', function() {
        var q = this.value.trim().toLowerCase();
        document.querySelectorAll('.image-card').forEach(function(card) {
          var title = (card.querySelector('.dash-card-title span')?.textContent || '').toLowerCase();
          card.style.display = title.includes(q) ? '' : 'none';
        });
      });
    }

    // Ajouter un emplacement image personnalisé (simple invite — peut être affinée ensuite)
    var addImageBtn = document.getElementById('cms-btn-add-image');
    if (addImageBtn) {
      addImageBtn.addEventListener('click', function() {
        var label = prompt('Nom du nouvel emplacement image/icône (ex. "Bannière promo") :');
        if (label && label.trim()) {
          showToast('ℹ️ Pour cibler précisément un élément personnalisé, indiquez son sélecteur CSS au développeur. Emplacement "' + label.trim() + '" noté — utilisez "Exporter config" pour le transmettre.', 'info');
        }
      });
    }

    // Boutons globaux
    var saveBtn = document.getElementById('cms-btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        var theme = collectTheme();
        if (window.gscThemeLoader) window.gscThemeLoader.applyTheme(theme);
        saveToFirestore(theme);
      });
    }

    var resetBtn = document.getElementById('cms-btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        var def = (window.gscThemeLoader && window.gscThemeLoader.DEFAULT_THEME) || {};
        populateInputs(def);
        if (window.gscThemeLoader) window.gscThemeLoader.applyTheme(def);
      });
    }

    var exportBtn = document.getElementById('cms-btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        var theme = collectTheme();
        var json = JSON.stringify(theme, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'theme-config-' + new Date().getTime() + '.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  }

  function zoneLabelOf(zoneId) {
    var z = ZONES_CONFIG.texts.find(function(x){ return x.id === zoneId; });
    return z ? z.label : zoneId;
  }

  function imageLabelOf(imageId) {
    var z = ZONES_CONFIG.images.find(function(x){ return x.id === imageId; });
    return z ? z.label : imageId;
  }

  // Petite notification toast (réutilise showToast si déjà fourni par admin.html, sinon fallback minimal)
  function showToast(msg, type) {
    if (typeof window.showToast === 'function' && window.showToast !== showToast) {
      window.showToast(msg, type);
      return;
    }
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' +
      (type === 'error' ? '#ef4444' : type === 'info' ? '#3b82f6' : '#009E60') +
      ';color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.2);max-width:90vw;text-align:center;';
    document.body.appendChild(el);
    setTimeout(function(){ el.remove(); }, 3200);
  }

  function livePreview() {
    var theme = collectTheme();
    if (window.gscThemeLoader) window.gscThemeLoader.applyTheme(theme);
  }

  function showCmsSection() {
    document.querySelectorAll('.section').forEach(function(s){ s.classList.remove('active'); });
    var target = document.getElementById('cms');
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(function(b){ b.classList.remove('active'); });
    var navBtn = document.getElementById('nav-cms');
    if (navBtn) navBtn.classList.add('active');

    var topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle && topbarTitle.firstChild) topbarTitle.firstChild.textContent = 'CMS & Apparence';

    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    loadFromFirestore();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FIRESTORE (CORRECTED BUG 1)
  // ────────────────────────────────────────────────────────────────────────────

  function loadFromFirestore() {
    // Guard : vérifie que firebase et firestore sont disponibles avant d'appeler
    if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') {
      console.warn('[GSC CMS] loadFromFirestore — Firebase non prêt, nouvelle tentative dans 1 s.');
      setTimeout(loadFromFirestore, 1000);
      return;
    }
    withAuth(function() {
      var database = firebase.firestore();
      if (!database) return Promise.reject(new Error('Firestore non disponible.'));
      return database.collection('app_config').doc('theme').get();
    }).then(function(snap) {
      var theme = snap.exists ? snap.data() : {};
      populateInputs(theme);
    }).catch(function(e) {
      console.warn('[GSC CMS] Erreur Firestore :', e);
      showToast('❌ Chargement impossible : ' + (e && e.message ? e.message : e), 'error');
    });
  }

  function saveToFirestore(theme) {
    if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') {
      showToast('❌ Firebase non disponible — sauvegarde impossible.', 'error');
      return;
    }
    var btn = document.getElementById('cms-btn-save');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enregistrement…'; }

    withAuth(function() {
      var database = firebase.firestore();
      if (!database) return Promise.reject(new Error('Firestore non disponible.'));
      return database.collection('app_config').doc('theme').set(theme, { merge: true });
    }).then(function() {
      showToast('✅ Configuration sauvegardée et appliquée !', 'success');
      if (btn) { btn.disabled = false; btn.innerHTML = '💾 Sauvegarder tous les changements'; }
    }).catch(function(e) {
      console.error('[GSC CMS] Erreur :', e);
      // On affiche le vrai message (ex: permission-denied, token expiré, etc.)
      // au lieu d'un message muet, pour pouvoir diagnostiquer en un coup d'œil.
      var detail = e && e.code ? (e.code + ' — ' + e.message) : (e && e.message ? e.message : String(e));
      showToast('❌ Erreur lors de la sauvegarde : ' + detail, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '💾 Sauvegarder tous les changements'; }
    });
  }

  function init() {
    injectCmsUI();
    wireEvents();
    // Brancher les deux boutons de navigation (desktop + mobile) sur showCmsSection.
    // admin-controller.wireNav() ne doit PAS inclure 'cms' pour éviter le double conflit.
    var navBtn = document.getElementById('nav-cms');
    if (navBtn) navBtn.addEventListener('click', showCmsSection);
    var mnavBtn = document.getElementById('mnav-cms');
    if (mnavBtn) mnavBtn.addEventListener('click', showCmsSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
