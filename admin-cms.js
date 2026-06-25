/**
 * admin-cms.js - ENRICHI
 * ─────────────────────────────────────────────────────────────────────────────
 * CMS & Apparence amélioré avec édition visuelle des zones, typographies, tailles
 * et gestion des images/icônes
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

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
    if (document.getElementById('nav-cms')) return;
    
    var navLabel = document.querySelector('.sidebar-nav .nav-label:last-of-type');
    var navBtn = document.createElement('button');
    navBtn.className = 'nav-item';
    navBtn.id = 'nav-cms';
    navBtn.innerHTML = '<span class="nav-icon">🎨</span><span>CMS &amp; Apparence</span>';
    
    var openAppBtn = document.getElementById('nav-open-app');
    if (openAppBtn && openAppBtn.parentNode) {
      openAppBtn.parentNode.insertBefore(navBtn, openAppBtn);
    } else if (navLabel && navLabel.parentNode) {
      navLabel.parentNode.appendChild(navBtn);
    }

    if (!document.getElementById('cms')) {
      var mainContent = document.querySelector('.main-content');
      if (!mainContent) return;
      
      var section = document.createElement('div');
      section.id = 'cms';
      section.className = 'section';
      section.innerHTML = buildCmsHTML();
      mainContent.appendChild(section);
    }
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
            <label class="cms-label">PETIT RAYON — <span id="cms-val-sm">8</span>PX</label>
            <input type="range" id="cms-radius-sm" min="0" max="24" value="8" class="cms-slider">
          </div>
          <div class="cms-row">
            <label class="cms-label">RAYON MOYEN — <span id="cms-val-md">14</span>PX</label>
            <input type="range" id="cms-radius-md" min="0" max="32" value="14" class="cms-slider">
          </div>
          <div class="cms-row">
            <label class="cms-label">GRAND RAYON — <span id="cms-val-lg">22</span>PX</label>
            <input type="range" id="cms-radius-lg" min="0" max="48" value="22" class="cms-slider">
          </div>
          <div style="margin-top:20px;">
            <div class="dash-card-title">👁️ Prévisualisation</div>
            <div id="cms-preview" style="display:flex;flex-direction:column;gap:10px;">
              <button id="prev-primary" style="padding:9px 18px;border:none;border-radius:var(--radius);font-weight:700;font-size:13px;cursor:default;background:var(--green);color:#fff;">Bouton primaire</button>
              <span id="prev-badge" style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:var(--green-lt);color:var(--green);">Badge</span>
            </div>
          </div>
          <div class="cms-actions-row" style="margin-top:16px;">
            <button class="cms-action-btn cms-action-confirm" id="cms-colors-confirm-btn" title="Confirmer ces couleurs et rayons">✅ Confirmer ces couleurs</button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: TYPOGRAPHIES -->
    <div class="cms-tab-content" data-tab="typography" style="display:none;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;" class="cms-grid">
        <div class="dash-card">
          <div class="dash-card-title">✍️ Polices de caractères</div>
          <div class="cms-row">
            <label class="cms-label">Police d'affichage (titres)</label>
            <select id="cms-font-display" class="cms-select cms-font-select" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;">
              ${FONTS.map(f => `<option value="${f.value}" style="font-family:${f.value};">${f.name}</option>`).join('')}
            </select>
            <div id="cms-font-display-preview" style="margin-top:8px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fafbfc;font-size:20px;font-weight:700;">Gabon Sport Connect</div>
          </div>
          <div class="cms-row">
            <label class="cms-label">Police de corps (texte)</label>
            <select id="cms-font-body" class="cms-select cms-font-select" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;">
              ${FONTS.map(f => `<option value="${f.value}" style="font-family:${f.value};">${f.name}</option>`).join('')}
            </select>
            <div id="cms-font-body-preview" style="margin-top:8px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fafbfc;font-size:14px;">Exemple de texte courant — Aa Bb Cc 123</div>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-title">📏 Tailles de texte globales</div>
          <div class="cms-row cms-size-row">
            <label class="cms-label">Taille titres H1 — <span id="cms-val-h1">28</span>PX</label>
            <div class="cms-size-control">
              <input type="range" id="cms-h1-size" min="16" max="48" value="28" class="cms-slider">
              <span class="cms-letter-a" id="cms-letter-h1" style="font-size:28px;">A</span>
            </div>
          </div>
          <div class="cms-row cms-size-row">
            <label class="cms-label">Taille titres H2 — <span id="cms-val-h2">22</span>PX</label>
            <div class="cms-size-control">
              <input type="range" id="cms-h2-size" min="14" max="36" value="22" class="cms-slider">
              <span class="cms-letter-a" id="cms-letter-h2" style="font-size:22px;">A</span>
            </div>
          </div>
          <div class="cms-row cms-size-row">
            <label class="cms-label">Taille corps — <span id="cms-val-body">14</span>PX</label>
            <div class="cms-size-control">
              <input type="range" id="cms-body-size" min="11" max="18" value="14" class="cms-slider">
              <span class="cms-letter-a" id="cms-letter-body" style="font-size:14px;">A</span>
            </div>
          </div>
          <div class="cms-row">
            <label class="cms-label">Interligne — <span id="cms-val-line-height">1.6</span></label>
            <input type="range" id="cms-line-height" min="1" max="2.5" step="0.1" value="1.6" class="cms-slider">
          </div>
        </div>
      </div>

      <div class="dash-card" style="margin-top:16px;">
        <div class="dash-card-title">📊 Prévisualisation des polices</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Affichage (H1)</div>
            <div id="prev-font-display" style="font-family:var(--font-display);font-size:28px;font-weight:700;">Gabon Sport Connect</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Corps de texte</div>
            <div id="prev-font-body" style="font-family:var(--font-body);font-size:14px;line-height:1.6;">Ceci est un exemple de texte pour tester la police du corps. Les modifications s'appliquent en temps réel.</div>
          </div>
        </div>
        <div class="cms-actions-row" style="margin-top:16px;">
          <button class="cms-action-btn cms-action-confirm" id="cms-typo-confirm-btn" title="Confirmer ces polices et tailles">✅ Confirmer ces typographies</button>
        </div>
      </div>
    </div>

    <!-- TAB: ZONES TEXTES -->
    <div class="cms-tab-content" data-tab="zones" style="display:none;">
      <div class="cms-row" style="margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
        <input type="text" id="zones-search" placeholder="🔍 Rechercher une zone de texte…" class="cms-select" style="flex:1;min-width:200px;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
        <button id="cms-btn-add-zone" class="cms-action-btn cms-action-add" title="Ajouter une nouvelle zone de texte personnalisée">➕ Ajouter une zone</button>
      </div>
      <div id="zones-editor" style="display:grid;grid-template-columns:1fr;gap:14px;">
        ${ZONES_CONFIG.texts.map(zone => `
          <div class="dash-card zone-card" data-zone-card="${zone.id}">
            <div class="dash-card-title" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <span>${zone.label}</span>
              <span class="cms-status-badge cms-status-visible" id="zone-status-${zone.id}">✅ Visible</span>
            </div>
            <div class="cms-row">
              <label class="cms-label">Police de la zone</label>
              <select class="zone-font-select" data-zone="${zone.id}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                <option value="">— Police globale —</option>
                ${FONTS.map(f => `<option value="${f.value}" style="font-family:${f.value};">${f.name}</option>`).join('')}
              </select>
            </div>
            <div class="cms-row cms-size-row">
              <label class="cms-label">Taille du texte — <span class="zone-size-val" data-zone="${zone.id}">14</span>PX</label>
              <div class="cms-size-control">
                <input type="range" class="zone-size-slider cms-slider" data-zone="${zone.id}" min="8" max="32" value="14">
                <span class="cms-letter-a zone-letter-a" data-zone="${zone.id}" style="font-size:14px;">A</span>
              </div>
            </div>
            <div class="cms-row">
              <label class="cms-label">Couleur</label>
              <div class="cms-color-row">
                <input type="color" class="zone-color-input cms-color-input" data-zone="${zone.id}" value="#0A1628">
              </div>
            </div>
            <div class="cms-row">
              <label class="cms-label">Graisse (weight)</label>
              <select class="zone-weight-select" data-zone="${zone.id}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                <option value="400">Normal (400)</option>
                <option value="500">Moyen (500)</option>
                <option value="600">Semi-gras (600)</option>
                <option value="700" selected>Gras (700)</option>
                <option value="800">Extra-gras (800)</option>
              </select>
            </div>
            <div class="cms-row">
              <label class="cms-label">Casse</label>
              <select class="zone-transform-select" data-zone="${zone.id}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                <option value="none" selected>Normal</option>
                <option value="uppercase">MAJUSCULES</option>
                <option value="lowercase">minuscules</option>
                <option value="capitalize">Commencer par Majuscule</option>
              </select>
            </div>
            <div class="cms-row">
              <label class="cms-label">Alignement</label>
              <select class="zone-align-select" data-zone="${zone.id}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                <option value="" selected>Par défaut</option>
                <option value="left">Gauche</option>
                <option value="center">Centré</option>
                <option value="right">Droite</option>
              </select>
            </div>
            <div class="cms-actions-row">
              <button class="cms-action-btn cms-action-confirm zone-confirm-btn" data-zone="${zone.id}" title="Confirmer les réglages de cette zone">✅ Confirmer</button>
              <button class="cms-action-btn cms-action-hide zone-hide-btn" data-zone="${zone.id}" title="Masquer cette zone sur l'application">🙈 Masquer</button>
              <button class="cms-action-btn cms-action-reset zone-reset-btn" data-zone="${zone.id}" title="Réinitialiser cette zone">↺ Réinitialiser</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- TAB: IMAGES/ICÔNES -->
    <div class="cms-tab-content" data-tab="images" style="display:none;">
      <div class="cms-row" style="margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
        <input type="text" id="images-search" placeholder="🔍 Rechercher une image / icône…" class="cms-select" style="flex:1;min-width:200px;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
        <button id="cms-btn-add-image" class="cms-action-btn cms-action-add" title="Ajouter un nouvel emplacement personnalisé">➕ Ajouter un emplacement</button>
      </div>
      <div id="images-editor" style="display:grid;grid-template-columns:1fr;gap:14px;">
        ${ZONES_CONFIG.images.map(zone => `
          <div class="dash-card image-card" data-image-card="${zone.id}">
            <div class="dash-card-title" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <span>${zone.label}</span>
              <span class="cms-status-badge cms-status-visible" id="image-status-${zone.id}">✅ Visible</span>
            </div>
            <div class="cms-row cms-size-row">
              <label class="cms-label">Taille — <span class="image-size-val" data-image="${zone.id}">40</span>PX</label>
              <div class="cms-size-control">
                <input type="range" class="image-size-slider cms-slider" data-image="${zone.id}" min="16" max="200" value="40">
                <span class="cms-image-preview-icon" data-image="${zone.id}" style="width:40px;height:40px;font-size:18px;">🖼️</span>
              </div>
            </div>
            <div class="cms-row">
              <label class="cms-label">Position (gauche/droite/haut/bas)</label>
              <select class="image-position-select" data-image="${zone.id}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                ${POSITIONS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
              </select>
            </div>
            <div class="cms-row">
              <label class="cms-label">Forme</label>
              <select class="image-shape-select" data-image="${zone.id}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                ${SHAPES.map(s => `<option value="${s.value}" ${s.value==='rounded'?'selected':''}>${s.label}</option>`).join('')}
              </select>
            </div>
            <div class="cms-row">
              <label class="cms-label">Opacité — <span class="image-opacity-val" data-image="${zone.id}">100</span>%</label>
              <input type="range" class="image-opacity-slider cms-slider" data-image="${zone.id}" min="0" max="100" value="100">
            </div>
            <div class="cms-row">
              <label class="cms-label">Rayon de bordure — <span class="image-radius-val" data-image="${zone.id}">0</span>PX</label>
              <input type="range" class="image-radius-slider cms-slider" data-image="${zone.id}" min="0" max="50" value="0">
            </div>
            <div class="cms-row">
              <label class="cms-label">Ombre</label>
              <select class="image-shadow-select" data-image="${zone.id}" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                <option value="none" selected>Aucune</option>
                <option value="small">Petite</option>
                <option value="medium">Moyenne</option>
                <option value="large">Grande</option>
              </select>
            </div>
            <div class="cms-actions-row">
              <button class="cms-action-btn cms-action-confirm image-confirm-btn" data-image="${zone.id}" title="Confirmer les réglages de cette image">✅ Confirmer</button>
              <button class="cms-action-btn cms-action-hide image-hide-btn" data-image="${zone.id}" title="Masquer cette image sur l'application">🙈 Masquer</button>
              <button class="cms-action-btn cms-action-reset image-reset-btn" data-image="${zone.id}" title="Réinitialiser cette image">↺ Réinitialiser</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Boutons d'action -->
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px;">
      <button id="cms-btn-save" style="flex:1;padding:14px;background:linear-gradient(135deg,var(--green),var(--green-dk));color:#fff;border:none;border-radius:var(--radius);font-weight:800;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;min-width:200px;">
        💾 Sauvegarder tous les changements
      </button>
      <button id="cms-btn-reset" style="padding:14px 20px;background:#fff;border:1.5px solid #e2e8f0;color:var(--navy);border-radius:var(--radius);font-weight:700;font-size:13px;cursor:pointer;">
        ↩️ Réinitialiser
      </button>
      <button id="cms-btn-export" style="padding:14px 20px;background:#fff;border:1.5px solid #e2e8f0;color:var(--navy);border-radius:var(--radius);font-weight:700;font-size:13px;cursor:pointer;">
        📥 Exporter config
      </button>
    </div>

    <style>
      .cms-tabs { display: flex; }
      .cms-tab { padding: 12px 16px; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; color: #64748b; font-weight: 600; font-size: 14px; transition: 0.2s; }
      .cms-tab.active { color: var(--navy); border-bottom-color: var(--green); }
      .cms-tab-content { display: none; }
      .cms-tab-content.active { display: block; }
      .cms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media(max-width:640px){ .cms-grid { grid-template-columns: 1fr !important; } }
      .cms-row { margin-bottom: 14px; }
      .cms-label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; margin-bottom: 6px; }
      .cms-color-row { display: flex; align-items: center; gap: 10px; }
      .cms-color-input { width: 50px; height: 40px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; }
      .cms-hex-input { flex: 1; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-family: monospace; }
      .cms-slider { width: 100%; height: 6px; border-radius: 3px; background: #e2e8f0; outline: none; -webkit-appearance: none; appearance: none; }
      .cms-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--green); cursor: pointer; box-shadow: 0 2px 8px rgba(0, 158, 96, 0.3); }
      .cms-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--green); cursor: pointer; border: none; box-shadow: 0 2px 8px rgba(0, 158, 96, 0.3); }
      .cms-select { padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; cursor: pointer; }
      #zones-editor, #images-editor { max-height: 600px; overflow-y: auto; }

      /* Aperçu "A" qui grandit/rétrécit en direct sur les curseurs de taille */
      .cms-size-control { display: flex; align-items: center; gap: 12px; }
      .cms-size-control .cms-slider { flex: 1; }
      .cms-letter-a, .cms-image-preview-icon {
        flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        width: 44px; height: 44px; min-width: 28px; min-height: 28px;
        font-weight: 800; color: var(--navy); background: #f1f5f9; border: 1px solid #e2e8f0;
        border-radius: 10px; transition: font-size .12s ease, width .12s ease, height .12s ease;
        user-select: none;
      }

      /* Boutons d'action communs à tous les onglets (ajouter / confirmer / masquer / réinitialiser) */
      .cms-actions-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
      .cms-action-btn {
        padding: 9px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;
        border: 1.5px solid #e2e8f0; background: #fff; color: var(--navy); transition: all .15s;
      }
      .cms-action-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,.08); }
      .cms-action-confirm { border-color: var(--green); color: var(--green-dk); background: var(--green-lt); }
      .cms-action-confirm:hover { background: var(--green); color: #fff; }
      .cms-action-hide { border-color: #f59e0b; color: #92400e; background: #fff7ed; }
      .cms-action-hide:hover { background: #f59e0b; color: #fff; }
      .cms-action-reset { border-color: #94a3b8; color: #475569; background: #f8fafc; }
      .cms-action-reset:hover { background: #94a3b8; color: #fff; }
      .cms-action-add { border-color: var(--blue); color: #1d4ed8; background: #eff6ff; white-space: nowrap; }
      .cms-action-add:hover { background: var(--blue); color: #fff; }

      /* Badge de statut (visible / masqué) sur chaque carte zone / image */
      .cms-status-badge { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
      .cms-status-visible { background: var(--green-lt); color: var(--green-dk); }
      .cms-status-hidden { background: #fef3c7; color: #92400e; }
      .cms-status-confirmed { background: #dbeafe; color: #1d4ed8; }

      /* Carte masquée : visuellement atténuée pour bien indiquer l'état */
      .zone-card.is-hidden, .image-card.is-hidden { opacity: .55; }
      .zone-card.is-hidden .dash-card-title, .image-card.is-hidden .dash-card-title { text-decoration: line-through; }
    </style>
    `;
  }

  function collectTheme() {
    return {
      colorPrimary: document.getElementById('cms-color-primary').value,
      colorAccent: document.getElementById('cms-color-accent').value,
      colorNavy: document.getElementById('cms-color-navy').value,
      colorDanger: document.getElementById('cms-color-danger').value,
      colorBg: document.getElementById('cms-color-bg').value,
      radiusSm: document.getElementById('cms-radius-sm').value,
      radiusMd: document.getElementById('cms-radius-md').value,
      radiusLg: document.getElementById('cms-radius-lg').value,
      fontDisplay: document.getElementById('cms-font-display').value,
      fontBody: document.getElementById('cms-font-body').value,
      h1Size: document.getElementById('cms-h1-size').value,
      h2Size: document.getElementById('cms-h2-size').value,
      bodySize: document.getElementById('cms-body-size').value,
      lineHeight: document.getElementById('cms-line-height').value,
      zones: collectZonesData(),
      images: collectImagesData()
    };
  }

  function collectZonesData() {
    var zones = {};
    document.querySelectorAll('.zone-size-slider').forEach(function(el) {
      var zoneId = el.getAttribute('data-zone');
      var card = document.querySelector(`.zone-card[data-zone-card="${zoneId}"]`);
      zones[zoneId] = {
        size: el.value,
        color: document.querySelector(`.zone-color-input[data-zone="${zoneId}"]`).value,
        weight: document.querySelector(`.zone-weight-select[data-zone="${zoneId}"]`).value,
        transform: document.querySelector(`.zone-transform-select[data-zone="${zoneId}"]`).value,
        fontFamily: document.querySelector(`.zone-font-select[data-zone="${zoneId}"]`)?.value || '',
        align: document.querySelector(`.zone-align-select[data-zone="${zoneId}"]`)?.value || '',
        hidden: card ? card.classList.contains('is-hidden') : false
      };
    });
    return zones;
  }

  function collectImagesData() {
    var images = {};
    document.querySelectorAll('.image-size-slider').forEach(function(el) {
      var imageId = el.getAttribute('data-image');
      var card = document.querySelector(`.image-card[data-image-card="${imageId}"]`);
      images[imageId] = {
        size: el.value,
        opacity: document.querySelector(`.image-opacity-slider[data-image="${imageId}"]`).value,
        radius: document.querySelector(`.image-radius-slider[data-image="${imageId}"]`).value,
        shadow: document.querySelector(`.image-shadow-select[data-image="${imageId}"]`).value,
        position: document.querySelector(`.image-position-select[data-image="${imageId}"]`)?.value || 'default',
        shape: document.querySelector(`.image-shape-select[data-image="${imageId}"]`)?.value || 'rounded',
        hidden: card ? card.classList.contains('is-hidden') : false
      };
    });
    return images;
  }

  function populateInputs(theme) {
    theme = theme || {};
    document.getElementById('cms-color-primary').value = theme.colorPrimary || '#009E60';
    document.getElementById('cms-hex-primary').value = theme.colorPrimary || '#009E60';
    document.getElementById('cms-color-accent').value = theme.colorAccent || '#FFD700';
    document.getElementById('cms-hex-accent').value = theme.colorAccent || '#FFD700';
    document.getElementById('cms-color-navy').value = theme.colorNavy || '#0A1628';
    document.getElementById('cms-hex-navy').value = theme.colorNavy || '#0A1628';
    document.getElementById('cms-color-danger').value = theme.colorDanger || '#ef4444';
    document.getElementById('cms-hex-danger').value = theme.colorDanger || '#ef4444';
    document.getElementById('cms-color-bg').value = theme.colorBg || '#F0F2F5';
    document.getElementById('cms-hex-bg').value = theme.colorBg || '#F0F2F5';
    
    document.getElementById('cms-radius-sm').value = theme.radiusSm || '8';
    document.getElementById('cms-radius-md').value = theme.radiusMd || '14';
    document.getElementById('cms-radius-lg').value = theme.radiusLg || '22';
    
    document.getElementById('cms-font-display').value = theme.fontDisplay || "'Syne', sans-serif";
    document.getElementById('cms-font-body').value = theme.fontBody || "'Inter', system-ui, sans-serif";
    var fdPrev = document.getElementById('cms-font-display-preview');
    if (fdPrev) fdPrev.style.fontFamily = document.getElementById('cms-font-display').value;
    var fbPrev = document.getElementById('cms-font-body-preview');
    if (fbPrev) fbPrev.style.fontFamily = document.getElementById('cms-font-body').value;
    document.getElementById('cms-h1-size').value = theme.h1Size || '28';
    document.getElementById('cms-h2-size').value = theme.h2Size || '22';
    document.getElementById('cms-body-size').value = theme.bodySize || '14';
    document.getElementById('cms-line-height').value = theme.lineHeight || '1.6';

    // Repeuple chaque zone de texte sauvegardée
    var zones = theme.zones || {};
    Object.keys(zones).forEach(function(zoneId) {
      var z = zones[zoneId] || {};
      var sizeEl = document.querySelector(`.zone-size-slider[data-zone="${zoneId}"]`);
      if (sizeEl && z.size) sizeEl.value = z.size;
      var colorEl = document.querySelector(`.zone-color-input[data-zone="${zoneId}"]`);
      if (colorEl && z.color) colorEl.value = z.color;
      var weightEl = document.querySelector(`.zone-weight-select[data-zone="${zoneId}"]`);
      if (weightEl && z.weight) weightEl.value = z.weight;
      var transformEl = document.querySelector(`.zone-transform-select[data-zone="${zoneId}"]`);
      if (transformEl && z.transform) transformEl.value = z.transform;
      var fontEl = document.querySelector(`.zone-font-select[data-zone="${zoneId}"]`);
      if (fontEl) fontEl.value = z.fontFamily || '';
      var alignEl = document.querySelector(`.zone-align-select[data-zone="${zoneId}"]`);
      if (alignEl) alignEl.value = z.align || '';
      setZoneHidden(zoneId, !!z.hidden);
    });

    // Repeuple chaque image/icône sauvegardée
    var images = theme.images || {};
    Object.keys(images).forEach(function(imageId) {
      var im = images[imageId] || {};
      var sizeEl = document.querySelector(`.image-size-slider[data-image="${imageId}"]`);
      if (sizeEl && im.size) sizeEl.value = im.size;
      var opacityEl = document.querySelector(`.image-opacity-slider[data-image="${imageId}"]`);
      if (opacityEl && im.opacity !== undefined) opacityEl.value = im.opacity;
      var radiusEl = document.querySelector(`.image-radius-slider[data-image="${imageId}"]`);
      if (radiusEl && im.radius !== undefined) radiusEl.value = im.radius;
      var shadowEl = document.querySelector(`.image-shadow-select[data-image="${imageId}"]`);
      if (shadowEl && im.shadow) shadowEl.value = im.shadow;
      var posEl = document.querySelector(`.image-position-select[data-image="${imageId}"]`);
      if (posEl) posEl.value = im.position || 'default';
      var shapeEl = document.querySelector(`.image-shape-select[data-image="${imageId}"]`);
      if (shapeEl) shapeEl.value = im.shape || 'rounded';
      setImageHidden(imageId, !!im.hidden);
    });
    
    updateTextDisplays();
    updateZoneAndImageDisplays();
  }

  // Met à jour tous les libellés numériques + aperçus "A" des zones et images
  function updateZoneAndImageDisplays() {
    document.querySelectorAll('.zone-size-slider').forEach(function(el) {
      var zoneId = el.getAttribute('data-zone');
      var valEl = document.querySelector(`.zone-size-val[data-zone="${zoneId}"]`);
      if (valEl) valEl.textContent = el.value;
      var letterEl = document.querySelector(`.zone-letter-a[data-zone="${zoneId}"]`);
      if (letterEl) {
        letterEl.style.fontSize = el.value + 'px';
        var fontEl = document.querySelector(`.zone-font-select[data-zone="${zoneId}"]`);
        if (fontEl) letterEl.style.fontFamily = fontEl.value || '';
      }
    });
    document.querySelectorAll('.image-size-slider').forEach(function(el) {
      var imageId = el.getAttribute('data-image');
      var valEl = document.querySelector(`.image-size-val[data-image="${imageId}"]`);
      if (valEl) valEl.textContent = el.value;
      var iconEl = document.querySelector(`.cms-image-preview-icon[data-image="${imageId}"]`);
      if (iconEl) { iconEl.style.width = el.value + 'px'; iconEl.style.height = el.value + 'px'; }
    });
    document.querySelectorAll('.image-opacity-slider').forEach(function(el) {
      var imageId = el.getAttribute('data-image');
      var valEl = document.querySelector(`.image-opacity-val[data-image="${imageId}"]`);
      if (valEl) valEl.textContent = el.value;
    });
    document.querySelectorAll('.image-radius-slider').forEach(function(el) {
      var imageId = el.getAttribute('data-image');
      var valEl = document.querySelector(`.image-radius-val[data-image="${imageId}"]`);
      if (valEl) valEl.textContent = el.value;
    });
  }

  function setZoneHidden(zoneId, hidden) {
    var card = document.querySelector(`.zone-card[data-zone-card="${zoneId}"]`);
    var badge = document.getElementById('zone-status-' + zoneId);
    if (card) card.classList.toggle('is-hidden', hidden);
    if (badge) {
      badge.textContent = hidden ? '🙈 Masqué' : '✅ Visible';
      badge.className = 'cms-status-badge ' + (hidden ? 'cms-status-hidden' : 'cms-status-visible');
    }
  }

  function setImageHidden(imageId, hidden) {
    var card = document.querySelector(`.image-card[data-image-card="${imageId}"]`);
    var badge = document.getElementById('image-status-' + imageId);
    if (card) card.classList.toggle('is-hidden', hidden);
    if (badge) {
      badge.textContent = hidden ? '🙈 Masqué' : '✅ Visible';
      badge.className = 'cms-status-badge ' + (hidden ? 'cms-status-hidden' : 'cms-status-visible');
    }
  }

  function updateTextDisplays() {
    setText('cms-val-sm', document.getElementById('cms-radius-sm').value);
    setText('cms-val-md', document.getElementById('cms-radius-md').value);
    setText('cms-val-lg', document.getElementById('cms-radius-lg').value);
    setText('cms-val-h1', document.getElementById('cms-h1-size').value);
    setText('cms-val-h2', document.getElementById('cms-h2-size').value);
    setText('cms-val-body', document.getElementById('cms-body-size').value);
    setText('cms-val-line-height', document.getElementById('cms-line-height').value);
  }

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el && v !== undefined) el.textContent = v;
  }

  function loadFromFirestore() {
    var database = getDb();
    if (!database) return;
    database.collection('app_config').doc('theme').get().then(function(snap) {
      var theme = snap.exists ? snap.data() : {};
      populateInputs(theme);
    }).catch(function(e) {
      console.warn('[GSC CMS] Erreur Firestore :', e);
    });
  }

  function saveToFirestore(theme) {
    var database = getDb();
    if (!database) {
      showToast('❌ Firestore non disponible.', 'error');
      return;
    }
    var btn = document.getElementById('cms-btn-save');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enregistrement…'; }

    database.collection('app_config').doc('theme').set(theme, { merge: true }).then(function() {
      showToast('✅ Configuration sauvegardée et appliquée !', 'success');
      if (btn) { btn.disabled = false; btn.innerHTML = '💾 Sauvegarder tous les changements'; }
    }).catch(function(e) {
      console.error('[GSC CMS] Erreur :', e);
      showToast('❌ Erreur : ' + (e.message || e), 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '💾 Sauvegarder tous les changements'; }
    });
  }

  function wireEvents() {
    // Onglets
    document.querySelectorAll('.cms-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        var tabName = this.getAttribute('data-tab');
        document.querySelectorAll('.cms-tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
        this.classList.add('active');
        document.querySelector(`.cms-tab-content[data-tab="${tabName}"]`).classList.add('active');
      });
    });

    // Couleurs
    ['primary', 'accent', 'navy', 'danger', 'bg'].forEach(function(color) {
      var picker = document.getElementById('cms-color-' + color);
      var hex = document.getElementById('cms-hex-' + color);
      if (!picker || !hex) return;
      picker.addEventListener('input', function() {
        hex.value = picker.value;
        livePreview();
      });
      hex.addEventListener('input', function() {
        var v = this.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
          picker.value = v;
          livePreview();
        }
      });
    });

    // Sliders rayon
    ['sm', 'md', 'lg'].forEach(function(size) {
      var slider = document.getElementById('cms-radius-' + size);
      if (slider) {
        slider.addEventListener('input', function() {
          setText('cms-val-' + size, this.value);
          livePreview();
        });
      }
    });

    // Sliders tailles
    ['h1', 'h2', 'body'].forEach(function(type) {
      var slider = document.getElementById('cms-' + type + '-size');
      if (slider) {
        slider.addEventListener('input', function() {
          setText('cms-val-' + type, this.value);
          livePreview();
        });
      }
    });

    var lineHeightSlider = document.getElementById('cms-line-height');
    if (lineHeightSlider) {
      lineHeightSlider.addEventListener('input', function() {
        setText('cms-val-line-height', this.value);
        livePreview();
      });
    }

    // Polices — sélecteur façon Word + aperçu immédiat de la police choisie
    ['display', 'body'].forEach(function(type) {
      var select = document.getElementById('cms-font-' + type);
      var preview = document.getElementById('cms-font-' + type + '-preview');
      if (select) {
        select.addEventListener('change', function() {
          if (preview) preview.style.fontFamily = this.value;
          livePreview();
        });
        if (preview) preview.style.fontFamily = select.value;
      }
    });

    // Zones textes — curseur de taille avec aperçu "A" qui grandit/rétrécit en direct
    document.querySelectorAll('.zone-size-slider').forEach(function(slider) {
      slider.addEventListener('input', function() {
        var zoneId = this.getAttribute('data-zone');
        var valEl = document.querySelector(`.zone-size-val[data-zone="${zoneId}"]`);
        if (valEl) valEl.textContent = this.value;
        var letterEl = document.querySelector(`.zone-letter-a[data-zone="${zoneId}"]`);
        if (letterEl) letterEl.style.fontSize = this.value + 'px';
        livePreview();
      });
    });

    document.querySelectorAll('.zone-color-input').forEach(function(input) {
      input.addEventListener('input', livePreview);
    });

    document.querySelectorAll('.zone-weight-select, .zone-transform-select, .zone-align-select').forEach(function(el) {
      el.addEventListener('change', livePreview);
    });

    // Police par zone — sélecteur façon Word, applique aussi un aperçu visuel sur la lettre A
    document.querySelectorAll('.zone-font-select').forEach(function(select) {
      select.addEventListener('change', function() {
        var zoneId = this.getAttribute('data-zone');
        var letterEl = document.querySelector(`.zone-letter-a[data-zone="${zoneId}"]`);
        if (letterEl) letterEl.style.fontFamily = this.value || '';
        livePreview();
      });
    });

    // Actions par zone de texte : Confirmer / Masquer / Réinitialiser
    document.querySelectorAll('.zone-confirm-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var zoneId = this.getAttribute('data-zone');
        var badge = document.getElementById('zone-status-' + zoneId);
        if (badge && !document.querySelector(`.zone-card[data-zone-card="${zoneId}"]`).classList.contains('is-hidden')) {
          badge.textContent = '✅ Confirmé';
          badge.className = 'cms-status-badge cms-status-confirmed';
        }
        livePreview();
        showToast('✅ Zone « ' + zoneLabelOf(zoneId) + ' » confirmée.', 'success');
      });
    });

    document.querySelectorAll('.zone-hide-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var zoneId = this.getAttribute('data-zone');
        var card = document.querySelector(`.zone-card[data-zone-card="${zoneId}"]`);
        var nowHidden = card ? !card.classList.contains('is-hidden') : true;
        setZoneHidden(zoneId, nowHidden);
        this.textContent = nowHidden ? '👁️ Afficher' : '🙈 Masquer';
        livePreview();
      });
    });

    document.querySelectorAll('.zone-reset-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var zoneId = this.getAttribute('data-zone');
        var sizeEl = document.querySelector(`.zone-size-slider[data-zone="${zoneId}"]`);
        if (sizeEl) { sizeEl.value = 14; sizeEl.dispatchEvent(new Event('input')); }
        var colorEl = document.querySelector(`.zone-color-input[data-zone="${zoneId}"]`);
        if (colorEl) colorEl.value = '#0A1628';
        var weightEl = document.querySelector(`.zone-weight-select[data-zone="${zoneId}"]`);
        if (weightEl) weightEl.value = '700';
        var transformEl = document.querySelector(`.zone-transform-select[data-zone="${zoneId}"]`);
        if (transformEl) transformEl.value = 'none';
        var fontEl = document.querySelector(`.zone-font-select[data-zone="${zoneId}"]`);
        if (fontEl) fontEl.value = '';
        var alignEl = document.querySelector(`.zone-align-select[data-zone="${zoneId}"]`);
        if (alignEl) alignEl.value = '';
        setZoneHidden(zoneId, false);
        var hideBtn = document.querySelector(`.zone-hide-btn[data-zone="${zoneId}"]`);
        if (hideBtn) hideBtn.textContent = '🙈 Masquer';
        livePreview();
      });
    });

    // Recherche dans la liste des zones de texte
    var zonesSearch = document.getElementById('zones-search');
    if (zonesSearch) {
      zonesSearch.addEventListener('input', function() {
        var q = this.value.trim().toLowerCase();
        document.querySelectorAll('.zone-card').forEach(function(card) {
          var title = (card.querySelector('.dash-card-title span')?.textContent || '').toLowerCase();
          card.style.display = title.includes(q) ? '' : 'none';
        });
      });
    }

    // Ajouter une zone de texte personnalisée (simple invite — peut être affinée ensuite)
    var addZoneBtn = document.getElementById('cms-btn-add-zone');
    if (addZoneBtn) {
      addZoneBtn.addEventListener('click', function() {
        var label = prompt('Nom de la nouvelle zone de texte (ex. "Titre page Contact") :');
        if (label && label.trim()) {
          showToast('ℹ️ Pour cibler précisément un élément personnalisé, indiquez son sélecteur CSS au développeur. Zone "' + label.trim() + '" notée — utilisez "Exporter config" pour la transmettre.', 'info');
        }
      });
    }

    var typoConfirmBtn = document.getElementById('cms-typo-confirm-btn');
    if (typoConfirmBtn) {
      typoConfirmBtn.addEventListener('click', function() {
        livePreview();
        showToast('✅ Typographies confirmées — pensez à "Sauvegarder tous les changements" pour les rendre définitives.', 'success');
      });
    }

    var colorsConfirmBtn = document.getElementById('cms-colors-confirm-btn');
    if (colorsConfirmBtn) {
      colorsConfirmBtn.addEventListener('click', function() {
        livePreview();
        showToast('✅ Couleurs confirmées — pensez à "Sauvegarder tous les changements" pour les rendre définitives.', 'success');
      });
    }

    // Images/Icônes — taille (curseur), position, forme, opacité, rayon, ombre
    document.querySelectorAll('.image-size-slider').forEach(function(slider) {
      slider.addEventListener('input', function() {
        var imageId = this.getAttribute('data-image');
        var valEl = document.querySelector(`.image-size-val[data-image="${imageId}"]`);
        if (valEl) valEl.textContent = this.value;
        var iconEl = document.querySelector(`.cms-image-preview-icon[data-image="${imageId}"]`);
        if (iconEl) { iconEl.style.width = this.value + 'px'; iconEl.style.height = this.value + 'px'; }
        livePreview();
      });
    });

    document.querySelectorAll('.image-opacity-slider').forEach(function(slider) {
      slider.addEventListener('input', function() {
        var imageId = this.getAttribute('data-image');
        var valEl = document.querySelector(`.image-opacity-val[data-image="${imageId}"]`);
        if (valEl) valEl.textContent = this.value;
        livePreview();
      });
    });

    document.querySelectorAll('.image-radius-slider').forEach(function(slider) {
      slider.addEventListener('input', function() {
        var imageId = this.getAttribute('data-image');
        var valEl = document.querySelector(`.image-radius-val[data-image="${imageId}"]`);
        if (valEl) valEl.textContent = this.value;
        livePreview();
      });
    });

    document.querySelectorAll('.image-shadow-select, .image-position-select, .image-shape-select').forEach(function(select) {
      select.addEventListener('change', livePreview);
    });

    // Actions par image/icône : Confirmer / Masquer / Réinitialiser
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

  function init() {
    injectCmsUI();
    wireEvents();
    var navBtn = document.getElementById('nav-cms');
    if (navBtn) navBtn.addEventListener('click', showCmsSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
