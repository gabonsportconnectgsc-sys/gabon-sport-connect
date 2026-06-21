/* ═══════════════════════════════════════════════════════════════
   ADMIN-CMS.JS — Moteur CMS centralisé pour GSC Admin
   v3 — Synchronisation Firestore (cloud)
   • Chaque save() écrit dans Firestore → propagation sur tous les
     appareils en < 1 seconde via onSnapshot dans app-config-loader
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Attente de l'API GSC_CMS (chargée par app-config-loader.js) ── */
  function waitForCMS(cb, attempt = 0) {
    if (window.GSC_CMS) { cb(); return; }
    if (attempt > 40) { console.error('[admin-cms] GSC_CMS non disponible'); return; }
    setTimeout(() => waitForCMS(cb, attempt + 1), 100);
  }

  /* ── Helper : save async avec feedback cloud ── */
  async function cmsave(partial, successMsg, btn) {
    const origLabel = btn ? btn.textContent : null;
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Envoi cloud…'; }
    try {
      const result = await window.GSC_CMS.save(partial);
      const cloud  = result && result.cloud;
      const suffix = cloud ? ' ☁️' : ' (local)';
      showToastCMS(successMsg + suffix, cloud ? 'success' : 'warn');
      updateCloudBadge();
      updateLastUpdate();
    } catch (e) {
      showToastCMS('❌ ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = origLabel; }
    }
  }

  /* ══════════════════════════════════════════════════════════════
     INJECTION DE L'ONGLET CMS DANS LE SIDEBAR D'ADMIN.HTML
  ══════════════════════════════════════════════════════════════ */
  function injectCMSSidebar() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav || document.getElementById('nav-cms')) return;

    const divider = document.createElement('div');
    divider.className = 'nav-label';
    divider.style.marginTop = '8px';
    divider.textContent = 'Personnalisation';
    nav.appendChild(divider);

    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.id = 'nav-cms';
    btn.innerHTML = '<span class="nav-icon">🎨</span><span>CMS & Apparence</span>';
    btn.addEventListener('click', () => {
      // Réutilise le système de navigation existant d'admin-controller.js
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById('cms')?.classList.add('active');
      document.querySelectorAll('.nav-item, .mn-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const titleEl = document.getElementById('topbar-title');
      if (titleEl?.firstChild) titleEl.firstChild.textContent = 'CMS & Apparence';
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebar-overlay')?.classList.remove('open');
    });
    nav.appendChild(btn);

    // Bouton mobile-nav
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav && !document.getElementById('mnav-cms')) {
      const mbtn = document.createElement('button');
      mbtn.className = 'mn-btn';
      mbtn.id = 'mnav-cms';
      mbtn.innerHTML = '<span class="mn-icon">🎨</span><span>CMS</span>';
      mbtn.addEventListener('click', () => btn.click());
      mobileNav.appendChild(mbtn);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     CRÉATION DE LA SECTION CMS HTML
  ══════════════════════════════════════════════════════════════ */
  function buildCMSHTML() {
    const cfg = window.GSC_CMS.read();

    return `
<div id="cms" class="section">

  <!-- EN-TÊTE ─────────────────────────────────────────────── -->
  <div class="admin-header" style="background:linear-gradient(135deg,#0A1628,#1a4a2e);">
    <div class="admin-header-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <span>🎨 CMS &amp; Apparence</span>
      <button type="button" onclick="window.open('index.html', '_blank')" onmouseover="this.style.background='rgba(0,158,96,.32)'" onmouseout="this.style.background='rgba(0,158,96,.18)'" style="font-size:12px;font-weight:700;padding:7px 14px;border-radius:20px;background:rgba(0,158,96,.18);color:#fff;border:1px solid rgba(0,158,96,.5);cursor:pointer;white-space:nowrap;transition:background .2s;">🌐 Ouvrir l'application — vérifier en direct</button>
    </div>
    <div class="admin-header-sub" style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;">
      <span>Contrôlez index.html en temps réel — aucun code à modifier</span>
      <span id="cms-cloud-badge" style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:rgba(245,158,11,.15);color:#92400e;border:1px solid rgba(245,158,11,.3);">☁️ Vérification…</span>
      <span id="cms-last-update" style="font-size:11px;opacity:.6;"></span>
    </div>
  </div>

  <!-- ONGLETS INTERNES ────────────────────────────────────── -->
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;">
    <button class="cms-tab-btn active" data-tab="theme">🎨 Thème &amp; Couleurs</button>
    <button class="cms-tab-btn" data-tab="app">⚙️ Paramètres App</button>
    <button class="cms-tab-btn" data-tab="interface">👁️ Interface</button>
    <button class="cms-tab-btn" data-tab="maintenance">🔧 Maintenance</button>
    <button class="cms-tab-btn" data-tab="export">💾 Sauvegarde</button>
  </div>

  <!-- ═══ ONGLET THÈME ══════════════════════════════════════ -->
  <div class="cms-tab active" id="cms-tab-theme">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

      <!-- Couleurs principales -->
      <div class="dash-card">
        <div class="dash-card-title">🎨 Couleurs principales</div>
        <div style="display:flex;flex-direction:column;gap:14px;">

          <div class="cms-color-row">
            <label class="cms-label">Couleur primaire <span class="cms-hint">Navigation, boutons principaux</span></label>
            <div class="cms-color-input-wrap">
              <input type="color" id="cms-color-primary" value="${cfg.colorPrimary}" class="cms-color-picker">
              <input type="text" id="cms-color-primary-hex" value="${cfg.colorPrimary}" class="cms-hex-input" maxlength="7">
              <div id="cms-preview-primary" class="cms-color-preview" style="background:${cfg.colorPrimary}"></div>
            </div>
          </div>

          <div class="cms-color-row">
            <label class="cms-label">Couleur primaire sombre <span class="cms-hint">Hover, dégradés</span></label>
            <div class="cms-color-input-wrap">
              <input type="color" id="cms-color-primary-dk" value="${cfg.colorPrimaryDk}" class="cms-color-picker">
              <input type="text" id="cms-color-primary-dk-hex" value="${cfg.colorPrimaryDk}" class="cms-hex-input" maxlength="7">
              <div id="cms-preview-primary-dk" class="cms-color-preview" style="background:${cfg.colorPrimaryDk}"></div>
            </div>
          </div>

          <div class="cms-color-row">
            <label class="cms-label">Couleur primaire claire <span class="cms-hint">Fonds, badges</span></label>
            <div class="cms-color-input-wrap">
              <input type="color" id="cms-color-primary-lt" value="${cfg.colorPrimaryLt}" class="cms-color-picker">
              <input type="text" id="cms-color-primary-lt-hex" value="${cfg.colorPrimaryLt}" class="cms-hex-input" maxlength="7">
              <div id="cms-preview-primary-lt" class="cms-color-preview" style="background:${cfg.colorPrimaryLt}"></div>
            </div>
          </div>

          <div class="cms-color-row">
            <label class="cms-label">Accent jaune <span class="cms-hint">Logo, highlights</span></label>
            <div class="cms-color-input-wrap">
              <input type="color" id="cms-color-yellow" value="${cfg.colorYellow}" class="cms-color-picker">
              <input type="text" id="cms-color-yellow-hex" value="${cfg.colorYellow}" class="cms-hex-input" maxlength="7">
              <div id="cms-preview-yellow" class="cms-color-preview" style="background:${cfg.colorYellow}"></div>
            </div>
          </div>

          <div class="cms-color-row">
            <label class="cms-label">Marine (fond topnav) <span class="cms-hint">Header, sidebar</span></label>
            <div class="cms-color-input-wrap">
              <input type="color" id="cms-color-navy" value="${cfg.colorNavy}" class="cms-color-picker">
              <input type="text" id="cms-color-navy-hex" value="${cfg.colorNavy}" class="cms-hex-input" maxlength="7">
              <div id="cms-preview-navy" class="cms-color-preview" style="background:${cfg.colorNavy}"></div>
            </div>
          </div>

        </div>
      </div>

      <!-- Couleurs secondaires + Typographie + Bordures -->
      <div style="display:flex;flex-direction:column;gap:16px;">

        <div class="dash-card">
          <div class="dash-card-title">🔴 Couleurs d'état</div>
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div class="cms-color-row">
              <label class="cms-label">Danger / Erreur</label>
              <div class="cms-color-input-wrap">
                <input type="color" id="cms-color-danger" value="${cfg.colorDanger}" class="cms-color-picker">
                <input type="text" id="cms-color-danger-hex" value="${cfg.colorDanger}" class="cms-hex-input" maxlength="7">
                <div class="cms-color-preview" style="background:${cfg.colorDanger}"></div>
              </div>
            </div>
            <div class="cms-color-row">
              <label class="cms-label">Avertissement</label>
              <div class="cms-color-input-wrap">
                <input type="color" id="cms-color-warn" value="${cfg.colorWarn}" class="cms-color-picker">
                <input type="text" id="cms-color-warn-hex" value="${cfg.colorWarn}" class="cms-hex-input" maxlength="7">
                <div class="cms-color-preview" style="background:${cfg.colorWarn}"></div>
              </div>
            </div>
            <div class="cms-color-row">
              <label class="cms-label">Info / Bleu</label>
              <div class="cms-color-input-wrap">
                <input type="color" id="cms-color-blue" value="${cfg.colorBlue}" class="cms-color-picker">
                <input type="text" id="cms-color-blue-hex" value="${cfg.colorBlue}" class="cms-hex-input" maxlength="7">
                <div class="cms-color-preview" style="background:${cfg.colorBlue}"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-title">🔤 Typographie</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div class="field">
              <label>Police d'affichage (titres)</label>
              <select id="cms-font-display" class="cms-select">
                ${['Syne','Oswald','Bebas Neue','Montserrat','Raleway','Poppins','Playfair Display','Lato'].map(f =>
                  `<option value="${f}" ${cfg.fontDisplay===f?'selected':''}>${f}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>Police de corps (texte)</label>
              <select id="cms-font-body" class="cms-select">
                ${['Inter','Roboto','Open Sans','Nunito','Source Sans Pro','DM Sans','Outfit'].map(f =>
                  `<option value="${f}" ${cfg.fontBody===f?'selected':''}>${f}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-title">⬛ Bordures arrondies</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div class="field">
              <label>Petit rayon — <span id="lbl-radius-sm">${cfg.radiusSm}px</span></label>
              <input type="range" id="cms-radius-sm" min="0" max="24" value="${cfg.radiusSm}" class="cms-slider">
            </div>
            <div class="field">
              <label>Rayon moyen — <span id="lbl-radius-md">${cfg.radiusMd}px</span></label>
              <input type="range" id="cms-radius-md" min="0" max="32" value="${cfg.radiusMd}" class="cms-slider">
            </div>
            <div class="field">
              <label>Grand rayon — <span id="lbl-radius-lg">${cfg.radiusLg}px</span></label>
              <input type="range" id="cms-radius-lg" min="0" max="48" value="${cfg.radiusLg}" class="cms-slider">
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Prévisualisation du thème ─────────────────────────── -->
    <div class="dash-card" style="margin-top:16px;">
      <div class="dash-card-title">👁️ Prévisualisation du thème</div>
      <div id="cms-theme-preview" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 0;">
        <div id="prev-btn-primary" style="padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px;color:#fff;background:#009E60;cursor:default;">Bouton primaire</div>
        <div id="prev-btn-secondary" style="padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px;border:1.5px solid #e2e8f0;background:#fff;cursor:default;">Secondaire</div>
        <div id="prev-badge" style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#e6f7ef;color:#007a47;">Badge actif</div>
        <div id="prev-topnav" style="padding:10px 20px;border-radius:8px;font-weight:800;font-size:13px;color:#fff;background:#0A1628;cursor:default;">Topnav</div>
        <div id="prev-accent" style="padding:10px 20px;border-radius:8px;font-weight:800;font-size:13px;color:#0A1628;background:#FFD700;cursor:default;">Accent</div>
        <div id="prev-danger" style="padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px;color:#fff;background:#ef4444;cursor:default;">Danger</div>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
      <button class="btn-action green" id="cms-save-theme">💾 Appliquer le thème à index.html</button>
      <button class="btn-action outline" id="cms-reset-theme">↺ Réinitialiser couleurs par défaut</button>
    </div>
  </div>

  <!-- ═══ ONGLET PARAMÈTRES APP ═════════════════════════════ -->
  <div class="cms-tab" id="cms-tab-app">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

      <div class="dash-card">
        <div class="dash-card-title">📱 Identité de l'application</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="field">
            <label>Nom de l'application</label>
            <input type="text" id="cms-app-name" value="${cfg.appName}" class="cms-input" placeholder="Ex: Gabon Sport Connect">
          </div>
          <div class="field">
            <label>Sous-titre</label>
            <input type="text" id="cms-app-subtitle" value="${cfg.appSubtitle}" class="cms-input" placeholder="Ex: Plateforme Nationale du Sport">
          </div>
          <div class="field">
            <label>Emoji / Icône du logo</label>
            <input type="text" id="cms-app-emoji" value="${cfg.appEmoji}" class="cms-input" maxlength="4" style="font-size:22px;width:80px;">
          </div>
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-title">🌍 Région &amp; Langue</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="field">
            <label>Fuseau horaire</label>
            <select id="cms-timezone" class="cms-select">
              ${[
                ['Africa/Libreville','Libreville (UTC+1)'],
                ['Africa/Douala','Douala (UTC+1)'],
                ['Africa/Lagos','Lagos (UTC+1)'],
                ['Africa/Dakar','Dakar (UTC+0)'],
                ['Europe/Paris','Paris (UTC+1/2)'],
                ['UTC','UTC'],
              ].map(([v,l]) => `<option value="${v}" ${cfg.timezone===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Langue de l'interface</label>
            <select id="cms-language" class="cms-select">
              <option value="fr" ${cfg.language==='fr'?'selected':''}>🇫🇷 Français</option>
              <option value="en" ${cfg.language==='en'?'selected':''}>🇬🇧 English</option>
              <option value="pt" ${cfg.language==='pt'?'selected':''}>🇵🇹 Português</option>
            </select>
          </div>
        </div>
      </div>

    </div>

    <div style="margin-top:16px;">
      <button class="btn-action green" id="cms-save-app">💾 Enregistrer les paramètres</button>
    </div>
  </div>

  <!-- ═══ ONGLET INTERFACE ══════════════════════════════════ -->
  <div class="cms-tab" id="cms-tab-interface">
    <div class="dash-card">
      <div class="dash-card-title">👁️ Éléments visibles sur index.html</div>
      <p style="font-size:12px;color:var(--gray-txt);margin-bottom:16px;">
        Activez ou désactivez des sections entières. Les changements s'appliquent immédiatement sans redéploiement.
      </p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;">

        ${[
          ['showSearchBar',  '🔍', 'Barre de recherche',    'Panneau de recherche de membres'],
          ['showNotifBell',  '🔔', 'Cloche de notifications','Badge et bouton notifications'],
          ['showBottomNav',  '📋', 'Navigation du bas',      'Barre de navigation mobile'],
          ['showWeather',    '🌤️', 'Météo',                  'Widget météo en temps réel'],
          ['showTaxi',       '🚕', 'Service Taxi',           'Section réservation de taxi'],
          ['showNews',       '📰', 'Actualités',             'Section des dernières nouvelles'],
          ['showMap',        '🗺️', 'Carte interactive',      'Carte des sites sportifs'],
        ].map(([key, emoji, name, desc]) => `
          <div class="cms-toggle-card ${cfg[key] ? 'active' : ''}">
            <div class="cms-toggle-emoji">${emoji}</div>
            <div class="cms-toggle-info">
              <div class="cms-toggle-name">${name}</div>
              <div class="cms-toggle-desc">${desc}</div>
            </div>
            <label class="cms-switch">
              <input type="checkbox" id="cms-toggle-${key}" ${cfg[key] ? 'checked' : ''} data-key="${key}">
              <span class="cms-switch-slider"></span>
            </label>
          </div>
        `).join('')}

      </div>
    </div>

    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn-action green" id="cms-save-interface">💾 Enregistrer la configuration</button>
      <button class="btn-action outline" id="cms-show-all">✅ Tout afficher</button>
      <button class="btn-action outline" id="cms-hide-all">🚫 Tout masquer</button>
    </div>
  </div>

  <!-- ═══ ONGLET MAINTENANCE ════════════════════════════════ -->
  <div class="cms-tab" id="cms-tab-maintenance">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

      <div class="dash-card">
        <div class="dash-card-title">🔧 Mode maintenance</div>

        <div class="cms-maintenance-toggle ${cfg.maintenanceMode ? 'on' : ''}" id="cms-maint-card">
          <div style="font-size:32px;margin-bottom:8px;">${cfg.maintenanceMode ? '🔴' : '🟢'}</div>
          <div style="font-weight:800;font-size:16px;" id="cms-maint-status-label">
            ${cfg.maintenanceMode ? 'MAINTENANCE ACTIVE' : 'APPLICATION EN LIGNE'}
          </div>
          <div style="font-size:12px;opacity:.7;margin-top:4px;" id="cms-maint-status-desc">
            ${cfg.maintenanceMode ? 'Les utilisateurs voient l\'écran de maintenance' : 'index.html est accessible normalement'}
          </div>
        </div>

        <label class="cms-switch" style="margin-top:16px;display:flex;align-items:center;gap:10px;">
          <input type="checkbox" id="cms-maint-toggle" ${cfg.maintenanceMode ? 'checked' : ''}>
          <span class="cms-switch-slider"></span>
          <span style="font-size:13px;font-weight:700;">Activer le mode maintenance</span>
        </label>

        <div class="field" style="margin-top:14px;">
          <label>Message affiché aux utilisateurs</label>
          <textarea id="cms-maint-msg" rows="3" class="cms-input" style="resize:vertical;">${cfg.maintenanceMsg}</textarea>
        </div>

        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-action green" id="cms-save-maintenance">💾 Enregistrer</button>
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-title">⚠️ Informations importantes</div>
        <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;">
          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;border-radius:8px;">
            <strong>🔒 admin.html reste toujours accessible</strong><br>
            <span style="color:#78350f;font-size:12px;">Le mode maintenance ne bloque que index.html, jamais le panneau admin.</span>
          </div>
          <div style="background:#dcfce7;border-left:4px solid #009E60;padding:12px;border-radius:8px;">
            <strong>⚡ Changement instantané</strong><br>
            <span style="color:#166534;font-size:12px;">Dès que vous activez/désactivez, les onglets index.html déjà ouverts se mettent à jour automatiquement.</span>
          </div>
          <div style="background:#dbeafe;border-left:4px solid #3b82f6;padding:12px;border-radius:8px;">
            <strong>📡 Technologie</strong><br>
            <span style="color:#1e40af;font-size:12px;">Synchronisation via localStorage + StorageEvent. Fonctionne sans serveur, sans Firebase pour le CMS.</span>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ═══ ONGLET EXPORT/SAUVEGARDE ════════════════════════ -->
  <div class="cms-tab" id="cms-tab-export">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

      <div class="dash-card">
        <div class="dash-card-title">💾 Sauvegarde de la configuration</div>
        <p style="font-size:12px;color:var(--gray-txt);margin-bottom:14px;">
          Exportez votre configuration actuelle en JSON pour la sauvegarder ou la transférer sur un autre appareil.
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
          <button class="btn-action green" id="cms-export-btn">⬇️ Exporter la config</button>
          <button class="btn-action outline" id="cms-import-trigger">⬆️ Importer une config</button>
          <input type="file" id="cms-import-file" accept=".json" style="display:none;">
        </div>
        <div style="background:var(--gray-bg);border-radius:10px;padding:12px;font-size:11px;font-family:monospace;max-height:200px;overflow:auto;" id="cms-config-preview">
          Cliquez sur "Exporter" pour voir la configuration actuelle.
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-title">🔄 Réinitialisation</div>
        <p style="font-size:12px;color:var(--gray-txt);margin-bottom:14px;">
          Restaurez les valeurs par défaut de l'application. Cette action est irréversible sauf si vous avez exporté votre config.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;margin-bottom:14px;">
          <div style="font-weight:700;color:#991b1b;margin-bottom:6px;">⚠️ Attention</div>
          <div style="font-size:12px;color:#7f1d1d;">Cette action réinitialisera : toutes les couleurs, le nom de l'app, les paramètres d'interface et le mode maintenance.</div>
        </div>
        <button class="btn-action outline" id="cms-reset-all" style="border-color:#ef4444;color:#ef4444;">
          🗑️ Tout réinitialiser aux valeurs par défaut
        </button>

        <div style="margin-top:20px;">
          <div class="dash-card-title" style="margin-bottom:8px;">📊 État du stockage</div>
          <div id="cms-storage-info" style="font-size:12px;color:var(--gray-txt);"></div>
        </div>
      </div>

    </div>
  </div>

</div><!-- /cms section -->`;
  }

  /* ══════════════════════════════════════════════════════════════
     STYLES CSS INJECTÉS POUR LE CMS
  ══════════════════════════════════════════════════════════════ */
  function injectCMSStyles() {
    if (document.getElementById('cms-styles')) return;
    const style = document.createElement('style');
    style.id = 'cms-styles';
    style.textContent = `
/* ── Onglets internes du CMS ── */
.cms-tab-btn {
  padding: 9px 18px;
  border: 1.5px solid var(--gray-bd);
  background: #fff;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: .2s;
  color: var(--navy);
}
.cms-tab-btn:hover { background: var(--green-lt); border-color: var(--green); color: var(--green-dk); }
.cms-tab-btn.active { background: var(--green); border-color: var(--green); color: #fff; }

.cms-tab { display: none; }
.cms-tab.active { display: block; animation: fadeUp .3s ease both; }

/* ── Lignes couleur ── */
.cms-color-row { display: flex; flex-direction: column; gap: 6px; }
.cms-label { font-size: 12px; font-weight: 700; color: var(--navy); display: flex; flex-direction: column; gap: 2px; }
.cms-hint { font-size: 10px; color: var(--gray-txt); font-weight: 400; }

.cms-color-input-wrap { display: flex; align-items: center; gap: 8px; }
.cms-color-picker {
  width: 40px; height: 36px; border: 1.5px solid var(--gray-bd);
  border-radius: 8px; cursor: pointer; padding: 2px; background: #fff;
}
.cms-hex-input {
  width: 90px; padding: 7px 10px; border: 1.5px solid var(--gray-bd);
  border-radius: 8px; font-family: monospace; font-size: 13px; font-weight: 700;
  color: var(--navy); background: #fff; outline: none; transition: .15s;
}
.cms-hex-input:focus { border-color: var(--green); }
.cms-color-preview { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid rgba(0,0,0,.1); flex-shrink: 0; }

/* ── Sliders ── */
.cms-slider {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 6px; background: var(--gray-bd);
  border-radius: 6px; outline: none; cursor: pointer;
}
.cms-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 18px; height: 18px;
  border-radius: 50%; background: var(--green); cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,158,96,.3);
}

/* ── Inputs & Selects ── */
.cms-input, .cms-select {
  width: 100%; padding: 9px 12px; border: 1.5px solid var(--gray-bd);
  border-radius: 9px; font-size: 13px; font-family: var(--font); color: var(--navy);
  background: #fff; outline: none; transition: .15s;
}
.cms-input:focus, .cms-select:focus { border-color: var(--green); }

/* ── Toggles interface ── */
.cms-toggle-card {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border: 1.5px solid var(--gray-bd); border-radius: 12px; background: #fff;
  transition: .2s;
}
.cms-toggle-card.active { border-color: var(--green); background: var(--green-lt); }
.cms-toggle-emoji { font-size: 22px; flex-shrink: 0; }
.cms-toggle-info { flex: 1; min-width: 0; }
.cms-toggle-name { font-size: 13px; font-weight: 700; color: var(--navy); }
.cms-toggle-desc { font-size: 11px; color: var(--gray-txt); margin-top: 2px; }

/* ── Switch toggle ── */
.cms-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.cms-switch input { opacity: 0; width: 0; height: 0; }
.cms-switch-slider {
  position: absolute; cursor: pointer; inset: 0;
  background: var(--gray-bd); border-radius: 24px; transition: .25s;
}
.cms-switch-slider::before {
  content: ""; position: absolute; width: 18px; height: 18px;
  left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: .25s;
}
.cms-switch input:checked + .cms-switch-slider { background: var(--green); }
.cms-switch input:checked + .cms-switch-slider::before { transform: translateX(20px); }

/* ── Maintenance card ── */
.cms-maintenance-toggle {
  padding: 20px; border-radius: 14px; text-align: center;
  background: var(--green-lt); border: 2px solid var(--green);
  color: var(--green-dk); transition: .3s;
}
.cms-maintenance-toggle.on {
  background: #fef2f2; border-color: #ef4444; color: #991b1b;
}
    `;
    document.head.appendChild(style);
  }

  /* ══════════════════════════════════════════════════════════════
     INJECTION DANS LE DOM
  ══════════════════════════════════════════════════════════════ */
  function injectCMSSection() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent || document.getElementById('cms')) return;

    const div = document.createElement('div');
    div.innerHTML = buildCMSHTML();
    const section = div.firstElementChild;
    mainContent.appendChild(section);
  }

  /* ══════════════════════════════════════════════════════════════
     LOGIQUE DES CONTRÔLES
  ══════════════════════════════════════════════════════════════ */

  /* Mise à jour de la prévisualisation du thème */
  function updateThemePreview(color, key) {
    const previewMap = {
      'colorPrimary':   ['prev-btn-primary'],
      'colorNavy':      ['prev-topnav'],
      'colorYellow':    ['prev-accent'],
      'colorDanger':    ['prev-danger'],
      'colorPrimaryLt': [],
    };
    if (key === 'colorPrimary') {
      document.getElementById('prev-btn-primary')?.style && (document.getElementById('prev-btn-primary').style.background = color);
      document.getElementById('prev-badge')?.style && (document.getElementById('prev-badge').style.color = color);
    }
    if (key === 'colorNavy')   document.getElementById('prev-topnav') && (document.getElementById('prev-topnav').style.background = color);
    if (key === 'colorYellow') document.getElementById('prev-accent') && (document.getElementById('prev-accent').style.background = color);
    if (key === 'colorDanger') document.getElementById('prev-danger') && (document.getElementById('prev-danger').style.background = color);
  }

  /* Lie un picker couleur avec son champ texte et la preview */
  function bindColorPair(pickerId, hexId, cmsKey, previewId) {
    const picker = document.getElementById(pickerId);
    const hex    = document.getElementById(hexId);
    const prev   = previewId ? document.getElementById(previewId) : null;
    if (!picker || !hex) return;

    const onColor = (val) => {
      if (!/^#[0-9a-fA-F]{6}$/.test(val)) return;
      picker.value = val;
      hex.value    = val;
      if (prev) prev.style.background = val;
      updateThemePreview(val, cmsKey);
    };

    picker.addEventListener('input', () => onColor(picker.value));
    hex.addEventListener('input', () => { if (hex.value.length === 7) onColor(hex.value); });
    hex.addEventListener('blur', () => { if (!/^#[0-9a-fA-F]{6}$/.test(hex.value)) hex.value = picker.value; });
  }

  function wireControls() {
    /* ── Onglets internes ── */
    document.querySelectorAll('.cms-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cms-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.cms-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        const tab = document.getElementById('cms-tab-' + btn.dataset.tab);
        if (tab) tab.classList.add('active');
        if (btn.dataset.tab === 'export') refreshExportPreview();
      });
    });

    /* ── Couleurs ── */
    bindColorPair('cms-color-primary',    'cms-color-primary-hex',    'colorPrimary',   'cms-preview-primary');
    bindColorPair('cms-color-primary-dk', 'cms-color-primary-dk-hex', 'colorPrimaryDk', 'cms-preview-primary-dk');
    bindColorPair('cms-color-primary-lt', 'cms-color-primary-lt-hex', 'colorPrimaryLt', 'cms-preview-primary-lt');
    bindColorPair('cms-color-yellow',     'cms-color-yellow-hex',     'colorYellow',    'cms-preview-yellow');
    bindColorPair('cms-color-navy',       'cms-color-navy-hex',       'colorNavy',      'cms-preview-navy');
    bindColorPair('cms-color-danger',     'cms-color-danger-hex',     'colorDanger',    null);
    bindColorPair('cms-color-warn',       'cms-color-warn-hex',       'colorWarn',      null);
    bindColorPair('cms-color-blue',       'cms-color-blue-hex',       'colorBlue',      null);

    /* ── Sliders border-radius ── */
    ['sm','md','lg'].forEach(sz => {
      const slider = document.getElementById('cms-radius-' + sz);
      const label  = document.getElementById('lbl-radius-' + sz);
      if (slider && label) {
        slider.addEventListener('input', () => { label.textContent = slider.value + 'px'; });
      }
    });

    /* ── Sauvegarde thème ── */
    document.getElementById('cms-save-theme')?.addEventListener('click', async function() {
      const cfg = collectThemeValues();
      await cmsave(cfg, '🎨 Thème appliqué à index.html !', this);
    });

    /* ── Reset couleurs ── */
    document.getElementById('cms-reset-theme')?.addEventListener('click', async () => {
      if (!confirm('Réinitialiser toutes les couleurs aux valeurs par défaut ?')) return;
      const d = window.GSC_CMS.defaults;
      const fields = ['colorPrimary','colorPrimaryDk','colorPrimaryLt','colorYellow','colorNavy','colorDanger','colorWarn','colorBlue'];
      const idMap = {
        colorPrimary: ['cms-color-primary','cms-color-primary-hex','cms-preview-primary'],
        colorPrimaryDk: ['cms-color-primary-dk','cms-color-primary-dk-hex','cms-preview-primary-dk'],
        colorPrimaryLt: ['cms-color-primary-lt','cms-color-primary-lt-hex','cms-preview-primary-lt'],
        colorYellow: ['cms-color-yellow','cms-color-yellow-hex','cms-preview-yellow'],
        colorNavy: ['cms-color-navy','cms-color-navy-hex','cms-preview-navy'],
        colorDanger: ['cms-color-danger','cms-color-danger-hex',null],
        colorWarn: ['cms-color-warn','cms-color-warn-hex',null],
        colorBlue: ['cms-color-blue','cms-color-blue-hex',null],
      };
      fields.forEach(key => {
        const [pid, hid, prid] = idMap[key];
        const val = d[key];
        if (document.getElementById(pid)) document.getElementById(pid).value = val;
        if (document.getElementById(hid)) document.getElementById(hid).value = val;
        if (prid && document.getElementById(prid)) document.getElementById(prid).style.background = val;
      });
      await cmsave(Object.fromEntries(fields.map(k => [k, d[k]])), '↺ Couleurs réinitialisées');
    });

    /* ── Paramètres app ── */
    document.getElementById('cms-save-app')?.addEventListener('click', async function() {
      const name     = document.getElementById('cms-app-name')?.value.trim();
      const subtitle = document.getElementById('cms-app-subtitle')?.value.trim();
      const emoji    = document.getElementById('cms-app-emoji')?.value.trim();
      const timezone = document.getElementById('cms-timezone')?.value;
      const language = document.getElementById('cms-language')?.value;
      if (!name) { showToastCMS('Le nom de l\'app est requis', 'error'); return; }
      await cmsave({ appName: name, appSubtitle: subtitle, appEmoji: emoji, timezone, language }, '⚙️ Paramètres enregistrés !', this);
    });

    /* ── Toggles interface ── */
    document.querySelectorAll('[data-key]').forEach(input => {
      input.addEventListener('change', async () => {
        const key = input.dataset.key;
        const val = input.checked;
        const card = input.closest('.cms-toggle-card');
        if (card) card.classList.toggle('active', val);
        await cmsave({ [key]: val }, val ? `✅ Activé` : `🚫 Masqué`);
      });
    });

    document.getElementById('cms-save-interface')?.addEventListener('click', async function() {
      const toggleKeys = ['showSearchBar','showNotifBell','showBottomNav','showWeather','showTaxi','showNews','showMap'];
      const vals = {};
      toggleKeys.forEach(k => {
        const el = document.getElementById('cms-toggle-' + k);
        if (el) vals[k] = el.checked;
      });
      await cmsave(vals, '👁️ Configuration interface enregistrée !', this);
    });

    document.getElementById('cms-show-all')?.addEventListener('click', async () => {
      document.querySelectorAll('[data-key]').forEach(cb => { cb.checked = true; cb.closest('.cms-toggle-card')?.classList.add('active'); });
      const all = { showSearchBar: true, showNotifBell: true, showBottomNav: true, showWeather: true, showTaxi: true, showNews: true, showMap: true };
      await cmsave(all, '✅ Tous les éléments affichés');
    });

    document.getElementById('cms-hide-all')?.addEventListener('click', async () => {
      if (!confirm('Masquer tous les éléments de l\'interface ?')) return;
      document.querySelectorAll('[data-key]').forEach(cb => { cb.checked = false; cb.closest('.cms-toggle-card')?.classList.remove('active'); });
      const none = { showSearchBar: false, showNotifBell: false, showBottomNav: false, showWeather: false, showTaxi: false, showNews: false, showMap: false };
      await cmsave(none, '🚫 Tous les éléments masqués');
    });

    /* ── Maintenance ── */
    const maintToggle = document.getElementById('cms-maint-toggle');
    maintToggle?.addEventListener('change', () => {
      updateMaintenanceCard(maintToggle.checked);
    });

    document.getElementById('cms-save-maintenance')?.addEventListener('click', async function() {
      const active = document.getElementById('cms-maint-toggle')?.checked;
      const msg    = document.getElementById('cms-maint-msg')?.value.trim();
      const label = active ? '🔧 Mode maintenance ACTIVÉ' : '🟢 Application remise en ligne';
      await cmsave({ maintenanceMode: !!active, maintenanceMsg: msg || window.GSC_CMS.defaults.maintenanceMsg }, label, this);
    });

    /* ── Export / Import ── */
    document.getElementById('cms-export-btn')?.addEventListener('click', exportConfig);
    document.getElementById('cms-import-trigger')?.addEventListener('click', () => {
      document.getElementById('cms-import-file')?.click();
    });
    document.getElementById('cms-import-file')?.addEventListener('change', importConfig);

    /* ── Reset tout ── */
    document.getElementById('cms-reset-all')?.addEventListener('click', async () => {
      if (!confirm('Réinitialiser TOUTE la configuration aux valeurs par défaut ? Cette action est irréversible.')) return;
      await window.GSC_CMS.reset();
      showToastCMS('↺ Configuration réinitialisée ☁️', 'info');
      updateCloudBadge();
      // Recharge la section pour mettre à jour les inputs
      setTimeout(() => window.location.hash = '#cms', 300);
    });

    refreshStorageInfo();
  }

  /* ── Collecte des valeurs thème actuelles ── */
  function collectThemeValues() {
    return {
      colorPrimary:   document.getElementById('cms-color-primary')?.value       || '',
      colorPrimaryDk: document.getElementById('cms-color-primary-dk')?.value    || '',
      colorPrimaryLt: document.getElementById('cms-color-primary-lt')?.value    || '',
      colorYellow:    document.getElementById('cms-color-yellow')?.value        || '',
      colorNavy:      document.getElementById('cms-color-navy')?.value          || '',
      colorDanger:    document.getElementById('cms-color-danger')?.value        || '',
      colorWarn:      document.getElementById('cms-color-warn')?.value          || '',
      colorBlue:      document.getElementById('cms-color-blue')?.value          || '',
      fontDisplay:    document.getElementById('cms-font-display')?.value        || '',
      fontBody:       document.getElementById('cms-font-body')?.value           || '',
      radiusSm:       document.getElementById('cms-radius-sm')?.value           || '',
      radiusMd:       document.getElementById('cms-radius-md')?.value           || '',
      radiusLg:       document.getElementById('cms-radius-lg')?.value           || '',
    };
  }

  /* ── Mise à jour de la carte maintenance ── */
  function updateMaintenanceCard(isOn) {
    const card  = document.getElementById('cms-maint-card');
    const label = document.getElementById('cms-maint-status-label');
    const desc  = document.getElementById('cms-maint-status-desc');
    if (!card) return;
    card.classList.toggle('on', isOn);
    const emoji = card.querySelector('div:first-child');
    if (emoji) emoji.textContent = isOn ? '🔴' : '🟢';
    if (label) label.textContent = isOn ? 'MAINTENANCE ACTIVE' : 'APPLICATION EN LIGNE';
    if (desc)  desc.textContent  = isOn ? 'Les utilisateurs voient l\'écran de maintenance' : 'index.html est accessible normalement';
  }

  /* ── Export JSON ── */
  function exportConfig() {
    const cfg = window.GSC_CMS.read();
    const json = JSON.stringify(cfg, null, 2);
    document.getElementById('cms-config-preview').textContent = json;
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'gsc-cms-config-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToastCMS('⬇️ Configuration exportée', 'success');
  }

  /* ── Import JSON ── */
  function importConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        window.GSC_CMS.save(parsed);
        showToastCMS('⬆️ Configuration importée et appliquée !', 'success');
        document.getElementById('cms-config-preview').textContent = JSON.stringify(parsed, null, 2);
      } catch {
        showToastCMS('❌ Fichier JSON invalide', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  /* ── Refresh preview export ── */
  function refreshExportPreview() {
    const cfg = window.GSC_CMS.read();
    const prev = document.getElementById('cms-config-preview');
    if (prev) prev.textContent = JSON.stringify(cfg, null, 2);
    refreshStorageInfo();
  }

  /* ── Infos stockage ── */
  function refreshStorageInfo() {
    const el = document.getElementById('cms-storage-info');
    if (!el) return;
    try {
      const raw = localStorage.getItem(window.GSC_CMS.STORAGE_KEY) || '';
      const kb  = (new Blob([raw]).size / 1024).toFixed(1);
      const cfg = JSON.parse(raw || '{}');
      const connected = window.GSC_CMS && window.GSC_CMS.isCloudConnected();
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <span style="width:8px;height:8px;border-radius:50%;background:${connected ? '#009E60' : '#f59e0b'};display:inline-block;"></span>
          <strong>${connected ? '☁️ Firestore connecté' : '💾 Local uniquement (Firebase indisponible)'}</strong>
        </div>
        <div>Document Firestore : <code style="font-size:11px;background:#f1f5f9;padding:1px 6px;border-radius:4px;">${window.GSC_CMS.FIRESTORE_DOC || 'appConfig/main'}</code></div>
        <div style="margin-top:6px;">Cache local : <strong>${kb} Ko</strong></div>
        <div>Dernière sync : <strong>${cfg.updatedAt ? new Date(cfg.updatedAt).toLocaleString('fr-FR') : 'Jamais'}</strong></div>
        <div>Par : <strong>${cfg.updatedBy || '—'}</strong></div>
        <div style="margin-top:4px;">Version config : <strong>v${cfg.version || 1}</strong></div>
      `;
    } catch {
      el.textContent = 'Erreur lecture stockage';
    }
  }

  /* ── Dernière mise à jour dans le header ── */
  function updateLastUpdate() {
    const el = document.getElementById('cms-last-update');
    if (el) el.textContent = 'Mis à jour : ' + new Date().toLocaleTimeString('fr-FR');
  }

  /* ── Statut connexion cloud ── */
  function updateCloudBadge() {
    const badge = document.getElementById('cms-cloud-badge');
    if (!badge) return;
    const connected = window.GSC_CMS && window.GSC_CMS.isCloudConnected();
    badge.textContent = connected ? '☁️ Cloud connecté' : '💾 Local uniquement';
    badge.style.background = connected ? 'rgba(0,158,96,.15)' : 'rgba(245,158,11,.15)';
    badge.style.color       = connected ? '#007a47' : '#92400e';
    badge.style.border      = connected ? '1px solid rgba(0,158,96,.3)' : '1px solid rgba(245,158,11,.3)';
  }

  /* ── Toast CMS (utilise le système existant ou crée le sien) ── */
  function showToastCMS(msg, type = 'success') {
    // Réutilise la fonction toast globale si disponible
    if (typeof window.toast === 'function') { window.toast(msg, type); return; }
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:80px;right:16px;z-index:10001;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:700;color:#fff;animation:slideIn .3s ease;box-shadow:0 4px 16px rgba(0,0,0,.2);`;
    t.style.background = { success: '#009E60', error: '#ef4444', warn: '#f59e0b', info: '#3b82f6' }[type] || '#009E60';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ══════════════════════════════════════════════════════════════
     INITIALISATION
  ══════════════════════════════════════════════════════════════ */
  function init() {
    injectCMSStyles();
    injectCMSSidebar();

    const doInject = () => {
      injectCMSSection();
      wireControls();
      updateLastUpdate();
      updateCloudBadge();
      // Re-check badge when Firebase connects
      document.addEventListener('firebase-ready', () => setTimeout(updateCloudBadge, 1000));
      document.addEventListener('gsc-cms-updated', updateCloudBadge);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', doInject);
    } else {
      doInject();
    }
  }

  // Démarre dès que GSC_CMS est prêt
  waitForCMS(init);
})();
