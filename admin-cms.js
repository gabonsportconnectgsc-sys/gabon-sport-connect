/**
 * admin-cms.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Module CMS & Apparence pour GSC Admin.
 * Sauvegarde le thème dans Firestore (collection "app_config", doc "theme")
 * → Les modifications s'appliquent en temps réel sur index.html partout dans le monde.
 *
 * Dépendances : firebase-init.js (déjà chargé), app-config-loader.js (déjà chargé).
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════════
  //  1.  INJECTION DU HTML DU MODULE CMS DANS admin.html
  // ══════════════════════════════════════════════════════════════════════════
  function injectCmsUI() {
    // ── 1a. Bouton dans la sidebar ──────────────────────────────────────
    var navLabel = document.querySelector('.sidebar-nav .nav-label:last-of-type');
    if (!document.getElementById('nav-cms')) {
      var navBtn = document.createElement('button');
      navBtn.className = 'nav-item';
      navBtn.id = 'nav-cms';
      navBtn.innerHTML = '<span class="nav-icon">🎨</span><span>CMS &amp; Apparence</span>';
      // Insérer avant "Ouvrir l'application"
      var openAppBtn = document.getElementById('nav-open-app');
      if (openAppBtn && openAppBtn.parentNode) {
        openAppBtn.parentNode.insertBefore(navBtn, openAppBtn);
      } else if (navLabel && navLabel.parentNode) {
        navLabel.parentNode.appendChild(navBtn);
      }
    }

    // ── 1b. Bouton dans la barre de navigation mobile ───────────────────
    if (!document.getElementById('mnav-cms')) {
      var mobileNav = document.querySelector('.mobile-nav');
      if (mobileNav) {
        var mBtn = document.createElement('button');
        mBtn.className = 'mn-btn';
        mBtn.id = 'mnav-cms';
        mBtn.innerHTML = '<span class="mn-icon">🎨</span><span>CMS</span>';
        mobileNav.appendChild(mBtn);
      }
    }

    // ── 1c. Section principale ──────────────────────────────────────────
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

  // ══════════════════════════════════════════════════════════════════════════
  //  2.  CONSTRUCTION DU HTML DU CMS
  // ══════════════════════════════════════════════════════════════════════════
  function buildCmsHTML() {
    return `
    <div class="admin-header" style="background:linear-gradient(135deg,#0A1628,#1a2d4a 55%,#0d3a1f);">
      <div class="admin-header-title">🎨 CMS &amp; Apparence</div>
      <div class="admin-header-sub">Personnalisez les couleurs et le style de l'application — modifications en temps réel dans le monde entier</div>
    </div>

    <div id="cms-realtime-bar" style="display:none;align-items:center;gap:8px;background:#e6f7ef;border:1px solid #009E60;border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:12px;font-weight:700;color:#007a47;">
      <div style="width:8px;height:8px;background:#009E60;border-radius:50%;animation:pulse 1.5s infinite;"></div>
      <span>Firestore connecté — les modifications sont appliquées en temps réel sur index.html partout dans le monde</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;" class="cms-grid">

      <!-- Couleurs -->
      <div class="dash-card">
        <div class="dash-card-title">🎨 Couleurs de l'application</div>

        <div class="cms-row">
          <label class="cms-label">Couleur principale (boutons, icônes)</label>
          <div class="cms-color-row">
            <input type="color" id="cms-color-primary" value="#009E60" class="cms-color-input">
            <input type="text" id="cms-hex-primary" value="#009E60" class="cms-hex-input" maxlength="7" placeholder="#009E60">
          </div>
        </div>

        <div class="cms-row">
          <label class="cms-label">Accent (badge actif, jaune)</label>
          <div class="cms-color-row">
            <input type="color" id="cms-color-accent" value="#FFD700" class="cms-color-input">
            <input type="text" id="cms-hex-accent" value="#FFD700" class="cms-hex-input" maxlength="7" placeholder="#FFD700">
          </div>
        </div>

        <div class="cms-row">
          <label class="cms-label">Marine (fond topnav)</label>
          <div style="font-size:10px;color:#64748b;margin-bottom:4px;">Header, sidebar</div>
          <div class="cms-color-row">
            <input type="color" id="cms-color-navy" value="#0A1628" class="cms-color-input">
            <input type="text" id="cms-hex-navy" value="#0A1628" class="cms-hex-input" maxlength="7" placeholder="#0A1628">
          </div>
        </div>

        <div class="cms-row">
          <label class="cms-label">Danger (bouton supprimer)</label>
          <div class="cms-color-row">
            <input type="color" id="cms-color-danger" value="#ef4444" class="cms-color-input">
            <input type="text" id="cms-hex-danger" value="#ef4444" class="cms-hex-input" maxlength="7" placeholder="#ef4444">
          </div>
        </div>

        <div class="cms-row">
          <label class="cms-label">Fond général (arrière-plan)</label>
          <div class="cms-color-row">
            <input type="color" id="cms-color-bg" value="#F0F2F5" class="cms-color-input">
            <input type="text" id="cms-hex-bg" value="#F0F2F5" class="cms-hex-input" maxlength="7" placeholder="#F0F2F5">
          </div>
        </div>
      </div>

      <!-- Bordures & Rayons -->
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

        <!-- Prévisualisation du thème -->
        <div style="margin-top:20px;">
          <div class="dash-card-title">👁️ Prévisualisation du thème</div>
          <div id="cms-preview" style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button id="prev-primary" style="padding:9px 18px;border:none;border-radius:var(--radius);font-weight:700;font-size:13px;cursor:default;background:var(--green);color:#fff;">Bouton primaire</button>
              <button id="prev-secondary" style="padding:9px 18px;border:1.5px solid #e2e8f0;border-radius:var(--radius);font-weight:700;font-size:13px;cursor:default;background:#fff;color:var(--navy);">Secondaire</button>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <span id="prev-badge" style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;border:1.5px solid;background:var(--green-lt);color:var(--green);border-color:var(--green);">Badge actif</span>
              <span id="prev-navy" style="padding:8px 16px;border-radius:var(--radius);font-size:13px;font-weight:700;background:var(--navy);color:#fff;">Topnav</span>
              <span id="prev-accent" style="padding:8px 16px;border-radius:var(--radius);font-size:13px;font-weight:700;background:var(--yellow);color:var(--navy);">Accent</span>
            </div>
            <div>
              <span id="prev-danger" style="padding:8px 16px;border-radius:var(--radius);font-size:13px;font-weight:700;background:var(--danger);color:#fff;">Danger</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <button id="cms-btn-save" style="flex:1;padding:14px;background:linear-gradient(135deg,var(--green),var(--green-dk));color:#fff;border:none;border-radius:var(--radius);font-weight:800;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;min-width:200px;">
        💾 Appliquer le thème à index.html
      </button>
      <button id="cms-btn-reset" style="padding:14px 20px;background:#fff;border:1.5px solid #e2e8f0;color:var(--navy);border-radius:var(--radius);font-weight:700;font-size:13px;cursor:pointer;">
        ↩️ Réinitialiser
      </button>
    </div>

    <style>
      .cms-grid { }
      @media(max-width:640px){ .cms-grid { grid-template-columns:1fr !important; } }
      .cms-row { margin-bottom:14px; }
      .cms-label { display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#64748b;margin-bottom:6px; }
      .cms-color-row { display:flex;align-items:center;gap:10px; }
      .cms-color-input { width:40px;height:36px;padding:2px;border:1.5px solid #e2e8f0;border-radius:8px;cursor:pointer;background:#fff; }
      .cms-hex-input { flex:1;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:monospace;color:#0A1628;outline:none; }
      .cms-hex-input:focus { border-color:var(--green); }
      .cms-slider { width:100%;accent-color:var(--green);height:6px; }
    </style>
    `;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  3.  LOGIQUE CMS : LECTURE / ÉCRITURE FIRESTORE
  // ══════════════════════════════════════════════════════════════════════════
  var db;

  function getDb() {
    if (!db) {
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        db = firebase.firestore();
      }
    }
    return db;
  }

  function showToast(msg, type) {
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'success');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 3500);
  }

  // Lit les valeurs actuelles des inputs et retourne l'objet thème
  function collectTheme() {
    return {
      colorPrimary: val('cms-color-primary') || '#009E60',
      colorAccent:  val('cms-color-accent')  || '#FFD700',
      colorNavy:    val('cms-color-navy')     || '#0A1628',
      colorDanger:  val('cms-color-danger')   || '#ef4444',
      colorBg:      val('cms-color-bg')       || '#F0F2F5',
      radiusSm:     parseInt(val('cms-radius-sm') || '8', 10),
      radiusMd:     parseInt(val('cms-radius-md') || '14', 10),
      radiusLg:     parseInt(val('cms-radius-lg') || '22', 10),
      savedAt:      new Date().toISOString(),
      savedBy:      'admin',
    };
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  // Remplit les inputs depuis un objet thème
  function populateInputs(theme) {
    var t = Object.assign({}, (window.gscThemeLoader && window.gscThemeLoader.DEFAULT_THEME) || {}, theme);
    setVal('cms-color-primary', t.colorPrimary);
    setVal('cms-hex-primary',   t.colorPrimary);
    setVal('cms-color-accent',  t.colorAccent);
    setVal('cms-hex-accent',    t.colorAccent);
    setVal('cms-color-navy',    t.colorNavy);
    setVal('cms-hex-navy',      t.colorNavy);
    setVal('cms-color-danger',  t.colorDanger);
    setVal('cms-hex-danger',    t.colorDanger);
    setVal('cms-color-bg',      t.colorBg);
    setVal('cms-hex-bg',        t.colorBg);
    setVal('cms-radius-sm',     t.radiusSm);
    setVal('cms-radius-md',     t.radiusMd);
    setVal('cms-radius-lg',     t.radiusLg);
    setText('cms-val-sm',       t.radiusSm);
    setText('cms-val-md',       t.radiusMd);
    setText('cms-val-lg',       t.radiusLg);
  }

  function setVal(id, v) { var el = document.getElementById(id); if (el && v !== undefined) el.value = v; }
  function setText(id, v) { var el = document.getElementById(id); if (el && v !== undefined) el.textContent = v; }

  // Charge le thème depuis Firestore et remplit les inputs
  function loadFromFirestore() {
    var database = getDb();
    if (!database) return;
    database.collection('app_config').doc('theme').get().then(function(snap) {
      var theme = snap.exists ? snap.data() : {};
      populateInputs(theme);

      // Affiche la barre "Firestore connecté"
      var bar = document.getElementById('cms-realtime-bar');
      if (bar) bar.style.display = 'flex';
    }).catch(function(e) {
      console.warn('[GSC CMS] Erreur lecture Firestore :', e);
    });
  }

  // Sauvegarde dans Firestore
  function saveToFirestore(theme) {
    var database = getDb();
    if (!database) {
      showToast('❌ Firestore non disponible.', 'error');
      return;
    }
    var btn = document.getElementById('cms-btn-save');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enregistrement…'; }

    database.collection('app_config').doc('theme').set(theme, { merge: true }).then(function() {
      showToast('✅ Thème appliqué à index.html — visible partout dans le monde !', 'success');
      if (btn) { btn.disabled = false; btn.innerHTML = '💾 Appliquer le thème à index.html'; }
      // app-config-loader.js va détecter le changement via onSnapshot et appliquer immédiatement
    }).catch(function(e) {
      console.error('[GSC CMS] Erreur écriture Firestore :', e);
      showToast('❌ Erreur : ' + (e.message || e), 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '💾 Appliquer le thème à index.html'; }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  4.  ÉVÉNEMENTS & PRÉVISUALISATION EN DIRECT
  // ══════════════════════════════════════════════════════════════════════════
  function wireEvents() {
    // Couleurs : synchronise color picker ↔ input texte + prévisualisation
    var colorPairs = [
      ['cms-color-primary', 'cms-hex-primary'],
      ['cms-color-accent',  'cms-hex-accent'],
      ['cms-color-navy',    'cms-hex-navy'],
      ['cms-color-danger',  'cms-hex-danger'],
      ['cms-color-bg',      'cms-hex-bg'],
    ];

    colorPairs.forEach(function(pair) {
      var picker = document.getElementById(pair[0]);
      var hex    = document.getElementById(pair[1]);
      if (!picker || !hex) return;

      picker.addEventListener('input', function() {
        hex.value = picker.value;
        livePreview();
      });
      hex.addEventListener('input', function() {
        var v = hex.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
          picker.value = v;
          livePreview();
        }
      });
    });

    // Sliders
    ['sm','md','lg'].forEach(function(size) {
      var slider = document.getElementById('cms-radius-' + size);
      var label  = document.getElementById('cms-val-' + size);
      if (!slider || !label) return;
      slider.addEventListener('input', function() {
        label.textContent = slider.value;
        livePreview();
      });
    });

    // Bouton Sauvegarder
    var saveBtn = document.getElementById('cms-btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        var theme = collectTheme();
        // Applique localement immédiatement
        if (window.gscThemeLoader) window.gscThemeLoader.applyTheme(theme);
        // Sauvegarde cloud
        saveToFirestore(theme);
      });
    }

    // Bouton Réinitialiser
    var resetBtn = document.getElementById('cms-btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        var def = (window.gscThemeLoader && window.gscThemeLoader.DEFAULT_THEME) || {};
        populateInputs(def);
        if (window.gscThemeLoader) window.gscThemeLoader.applyTheme(def);
      });
    }
  }

  // Applique la prévisualisation en direct dans la page sans sauvegarder
  function livePreview() {
    var theme = collectTheme();
    if (window.gscThemeLoader) window.gscThemeLoader.applyTheme(theme);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  5.  NAVIGATION VERS L'ONGLET CMS
  // ══════════════════════════════════════════════════════════════════════════
  function showCmsSection() {
    document.querySelectorAll('.section').forEach(function(s){ s.classList.remove('active'); });
    var target = document.getElementById('cms');
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(function(b){ b.classList.remove('active'); });
    document.querySelectorAll('.mn-btn').forEach(function(b){ b.classList.remove('active'); });
    var navBtn = document.getElementById('nav-cms');
    if (navBtn) navBtn.classList.add('active');
    var mNavBtn = document.getElementById('mnav-cms');
    if (mNavBtn) mNavBtn.classList.add('active');

    var topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle && topbarTitle.firstChild) topbarTitle.firstChild.textContent = 'CMS & Apparence';

    // Ferme la sidebar mobile si ouverte
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    // Charge les valeurs depuis Firestore à chaque visite
    loadFromFirestore();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  6.  INITIALISATION
  // ══════════════════════════════════════════════════════════════════════════
  function init() {
    // Injecte le HTML
    injectCmsUI();

    // Branche les événements
    wireEvents();

    // Branche les boutons de navigation
    var navBtn  = document.getElementById('nav-cms');
    var mNavBtn = document.getElementById('mnav-cms');
    if (navBtn)  navBtn.addEventListener('click', showCmsSection);
    if (mNavBtn) mNavBtn.addEventListener('click', showCmsSection);

    // Stoppe la caméra QR si on revient sur CMS
    var allNavItems = document.querySelectorAll('.nav-item:not(#nav-cms)');
    allNavItems.forEach(function(btn) {
      btn.addEventListener('click', function() {
        // rien à faire ici, juste s'assurer que le nav CMS se désactive
      });
    });
  }

  // Démarre quand le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
