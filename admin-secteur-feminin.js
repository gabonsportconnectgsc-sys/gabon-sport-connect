/**
 * ══════════════════════════════════════════════════════════════════════
 *  ADMIN-SECTEUR-FEMININ.JS — Dashboard Secteur Sport Féminin (admin)
 *  Gabon Sport Connect · 2026
 *
 *  Monkey-patch non-invasif (n'édite pas admin.html) :
 *   - Injecte un item de navigation "🚺 Secteur Féminin" (sidebar + mobile)
 *   - Injecte une section dédiée avec stats + tableau des structures
 *     ayant des effectifs féminins, agrégées par discipline et par ville.
 *   - Source de données : window.structuresManager (structures-manager.js)
 *     et window.realtimeSync.getCache('users') (acteurs, champ `sexe`).
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const SECTION_ID = 'secteur-feminin';
  const NAV_ID = 'nav-secteur-feminin';
  const MNAV_ID = 'mnav-secteur-feminin';

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* Libellés + regroupement des rôles d'acteur (voir inscription.html,
     pickRole()). Distinction volontaire :
     - "practicantes" : rattachées à un roster de joueuses/athlètes
     - "encadrement/officielles" : arbitres, entraîneures, formatrices,
       organisatrices — rôles qui NE dépendent PAS d'un effectif féminin
       de structure et qui peuvent s'exercer en secteur masculin.
     - "structures/organisations" : représentantes de club/fédération/association.
  */
  const ROLE_LABELS = {
    joueur: 'Joueuse', athlete: 'Athlète', entraineur: 'Entraîneure',
    arbitre: 'Arbitre', club: 'Club (représentante)', federation: 'Fédération (représentante)',
    independant: 'Indépendante', association: 'Association (représentante)',
    eleve_etudiant: 'Élève / Étudiante', handisport: 'Sportive handisport',
    organisateur: 'Organisatrice', supporter: 'Supportrice',
    sportif_etranger: 'Sportive étrangère', ancien_sportif: 'Ancienne sportive',
    formateur: 'Formatrice'
  };
  const ROLES_ENCADREMENT = ['entraineur', 'arbitre', 'formateur', 'organisateur'];
  function roleLabel(role) { return ROLE_LABELS[role] || (role || 'Non renseigné'); }

  /* ══════════════════════════════════════════════════════════════════
   * 1. STYLES
   * ══════════════════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('gsc-fem-admin-styles')) return;
    const s = document.createElement('style');
    s.id = 'gsc-fem-admin-styles';
    s.textContent = `
.fem-stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px; margin-bottom:18px; }
.fem-stat-card { background:#fdf2f8; border:1.5px solid #f9a8d4; border-radius:14px; padding:16px; text-align:center; }
.fem-stat-card .fem-stat-num { font-size:26px; font-weight:800; color:#be185d; font-family:var(--font-display,inherit); }
.fem-stat-card .fem-stat-label { font-size:11.5px; color:var(--gray-txt); font-weight:600; margin-top:2px; }
.fem-bar-wrap { display:flex; align-items:center; gap:8px; }
.fem-bar-track { flex:1; height:8px; background:#fce7f3; border-radius:4px; overflow:hidden; }
.fem-bar-fill { height:100%; background:#ec4899; }
`;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. INJECTION NAVIGATION (sidebar + mobile)
   * ══════════════════════════════════════════════════════════════════ */
  function injectNav() {
    if (!document.getElementById(NAV_ID)) {
      const archBtn = document.getElementById('nav-archivage');
      if (archBtn) {
        archBtn.insertAdjacentHTML('afterend',
          `<button class="nav-item" id="${NAV_ID}">
            <span class="nav-icon">🚺</span><span>Secteur Féminin</span>
          </button>`
        );
      }
    }
    if (!document.getElementById(MNAV_ID)) {
      const mnav = document.querySelector('.mobile-nav');
      if (mnav) {
        mnav.insertAdjacentHTML('beforeend',
          `<button class="mn-btn" id="${MNAV_ID}"><span class="mn-icon">🚺</span><span>Féminin</span></button>`
        );
      }
    }
    const navBtn = document.getElementById(NAV_ID);
    if (navBtn && !navBtn._gscBound) { navBtn._gscBound = true; navBtn.addEventListener('click', showSection); }
    const mNavBtn = document.getElementById(MNAV_ID);
    if (mNavBtn && !mNavBtn._gscBound) { mNavBtn._gscBound = true; mNavBtn.addEventListener('click', showSection); }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. INJECTION DE LA SECTION
   * ══════════════════════════════════════════════════════════════════ */
  function injectSection() {
    if (document.getElementById(SECTION_ID)) return;
    const main = document.querySelector('.main-content');
    if (!main) return;
    main.insertAdjacentHTML('beforeend', `
      <div id="${SECTION_ID}" class="section">
        <div class="dash-card mb-16">
          <div class="dash-card-title">🚺 Secteur Sport Féminin</div>
          <p style="font-size:12px;color:var(--gray-txt);margin-bottom:4px;">
            Vue consolidée des actrices et des structures ayant des effectifs féminins, saison en cours.
          </p>
        </div>
        <div class="fem-stats-grid" id="fem-stats-grid"></div>
        <div class="dash-card mb-16">
          <div class="dash-card-title">Répartition des actrices par rôle</div>
          <p style="font-size:12px;color:var(--gray-txt);margin-bottom:10px;">
            ⚠️ Une actrice n'est pas forcément une joueuse : une arbitre, une entraîneure ou une formatrice
            peut exercer au sein d'une structure ou d'une compétition du <strong>secteur masculin</strong>
            (ex. arbitrage de matchs de football masculin). Ce tableau les comptabilise indépendamment
            des effectifs de joueuses par structure ci-dessous.
          </p>
          <div id="fem-roles-table"></div>
        </div>
        <div class="dash-card mb-16">
          <div class="dash-card-title">Répartition par discipline</div>
          <div id="fem-discipline-table"></div>
        </div>
        <div class="dash-card mb-16">
          <div class="dash-card-title">Documents &amp; organismes spécifiques au secteur féminin</div>
          <p style="font-size:12px;color:var(--gray-txt);margin-bottom:10px;">
            Référentiel par discipline (affiliations, championnats dames, organismes dédiés).
            Une discipline non listée ici n'a pas encore de couche féminine configurée.
          </p>
          <div id="fem-config-table"></div>
        </div>
        <div class="dash-card">
          <div class="dash-card-title">Structures avec roster de joueuses féminin</div>
          <p style="font-size:12px;color:var(--gray-txt);margin-bottom:8px;">
            Structures ayant déclaré des effectifs de joueuses pour la saison en cours
            (hors arbitres/officielles — voir « Répartition des actrices par rôle » ci-dessus).
          </p>
          <div style="margin:8px 0;">
            <input type="text" id="fem-structures-search" class="search-input" placeholder="🔍 Nom, ville, discipline…" style="max-width:280px;">
          </div>
          <div id="fem-structures-table"></div>
        </div>
      </div>
    `);
    const search = document.getElementById('fem-structures-search');
    if (search) search.addEventListener('input', () => renderStructuresTable(search.value));
  }

  function showSection() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(SECTION_ID);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mn-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.getElementById(NAV_ID);
    if (navBtn) navBtn.classList.add('active');
    const mNavBtn = document.getElementById(MNAV_ID);
    if (mNavBtn) mNavBtn.classList.add('active');

    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle && topbarTitle.firstChild) topbarTitle.firstChild.textContent = 'Secteur Féminin';

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');

    render();
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. DONNÉES
   * ══════════════════════════════════════════════════════════════════ */
  function getUsers() {
    return (window.realtimeSync && window.realtimeSync.getCache && window.realtimeSync.getCache('users')) || [];
  }

  function getStructures() {
    return (window.structuresManager && window.structuresManager.list && window.structuresManager.list()) || [];
  }

  function currentSeasonLabel(structure) {
    return structure.saisonCourante
      || (window.GSCStructureProfile && window.GSCStructureProfile.getCurrentSeasonLabel && window.GSCStructureProfile.getCurrentSeasonLabel())
      || '2025-2026';
  }

  function feminineEffectifForStructure(s) {
    const saison = currentSeasonLabel(s);
    const saisonData = (s.saisons && s.saisons[saison]) || {};
    const eff = saisonData.effectifs || {};
    return { femmes: eff.femmes || 0, hommes: eff.hommes || 0, total: (eff.femmes || 0) + (eff.hommes || 0) };
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. RENDU — STATS GLOBALES
   * ══════════════════════════════════════════════════════════════════ */
  function renderStatsCards() {
    const el = document.getElementById('fem-stats-grid');
    if (!el) return;

    const users = getUsers();
    const actricesTotal = users.filter(u => u.sexe === 'F').length;
    const actricesActives = users.filter(u => u.sexe === 'F' && u.statut !== 'suspendu' && u.statut !== 'inactif').length;

    const structures = getStructures();
    let effFemmes = 0, effTotal = 0, structuresConcernees = 0;
    structures.forEach(s => {
      const e = feminineEffectifForStructure(s);
      if (e.femmes > 0) structuresConcernees++;
      effFemmes += e.femmes;
      effTotal += e.total;
    });
    const pctEffectifs = effTotal > 0 ? Math.round((effFemmes / effTotal) * 100) : 0;

    el.innerHTML = `
      <div class="fem-stat-card"><div class="fem-stat-num">${actricesTotal}</div><div class="fem-stat-label">Actrices inscrites</div></div>
      <div class="fem-stat-card"><div class="fem-stat-num">${actricesActives}</div><div class="fem-stat-label">Actives</div></div>
      <div class="fem-stat-card"><div class="fem-stat-num">${structuresConcernees}</div><div class="fem-stat-label">Structures concernées</div></div>
      <div class="fem-stat-card"><div class="fem-stat-num">${effFemmes}</div><div class="fem-stat-label">Licenciées (roster saison)</div></div>
      <div class="fem-stat-card"><div class="fem-stat-num">${pctEffectifs}%</div><div class="fem-stat-label">Part féminine des effectifs</div></div>
    `;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5bis. RENDU — RÉPARTITION PAR RÔLE (indépendant des structures)
   * ══════════════════════════════════════════════════════════════════ */
  function renderRolesTable() {
    const el = document.getElementById('fem-roles-table');
    if (!el) return;

    const actrices = getUsers().filter(u => u.sexe === 'F');
    if (!actrices.length) {
      el.innerHTML = '<p style="text-align:center;color:var(--gray-txt);padding:16px;">Aucune actrice inscrite pour le moment.</p>';
      return;
    }

    const byRole = {};
    actrices.forEach(u => {
      const role = u.role || 'non_renseigne';
      byRole[role] = (byRole[role] || 0) + 1;
    });

    const roles = Object.keys(byRole).sort((a, b) => byRole[b] - byRole[a]);
    const total = actrices.length;

    const rows = roles.map(role => {
      const count = byRole[role];
      const pct = Math.round((count / total) * 100);
      const isEncadrement = ROLES_ENCADREMENT.includes(role);
      return `
        <tr>
          <td>${esc(roleLabel(role))} ${isEncadrement ? '<span title="Rôle pouvant s\'exercer en secteur masculin" style="font-size:11px;">⚖️</span>' : ''}</td>
          <td>${count}</td>
          <td>
            <div class="fem-bar-wrap">
              <div class="fem-bar-track"><div class="fem-bar-fill" style="width:${pct}%;"></div></div>
              <span style="font-size:11px;font-weight:700;color:#be185d;">${pct}%</span>
            </div>
          </td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="users-table-wrap">
        <table class="users-table">
          <thead><tr><th>Rôle</th><th>Actrices</th><th>Part</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p style="font-size:11px;color:var(--gray-txt);margin-top:8px;">⚖️ = rôle d'encadrement/officiel, non rattaché à un effectif de structure.</p>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 6. RENDU — RÉPARTITION PAR DISCIPLINE
   * ══════════════════════════════════════════════════════════════════ */
  function renderDisciplineTable() {
    const el = document.getElementById('fem-discipline-table');
    if (!el) return;

    const structures = getStructures();
    const byDiscipline = {};
    structures.forEach(s => {
      const e = feminineEffectifForStructure(s);
      if (!e.femmes && !e.total) return;
      const disc = s.discipline || 'Non renseigné';
      byDiscipline[disc] = byDiscipline[disc] || { femmes: 0, total: 0, structures: 0 };
      byDiscipline[disc].femmes += e.femmes;
      byDiscipline[disc].total += e.total;
      if (e.femmes > 0) byDiscipline[disc].structures++;
    });

    const disciplines = Object.keys(byDiscipline).sort((a, b) => byDiscipline[b].femmes - byDiscipline[a].femmes);
    if (!disciplines.length) {
      el.innerHTML = '<p style="text-align:center;color:var(--gray-txt);padding:16px;">Aucune donnée d\'effectif disponible pour la saison en cours.</p>';
      return;
    }

    const D = window.GSCDisciplines;
    const rows = disciplines.map(disc => {
      const d = byDiscipline[disc];
      const pct = d.total > 0 ? Math.round((d.femmes / d.total) * 100) : 0;
      const icon = D && D.getIcon ? D.getIcon(disc) : '🏅';
      return `
        <tr>
          <td>${icon} ${esc(disc)}</td>
          <td>${d.structures}</td>
          <td>${d.femmes}</td>
          <td>
            <div class="fem-bar-wrap">
              <div class="fem-bar-track"><div class="fem-bar-fill" style="width:${pct}%;"></div></div>
              <span style="font-size:11px;font-weight:700;color:#be185d;">${pct}%</span>
            </div>
          </td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="users-table-wrap">
        <table class="users-table">
          <thead><tr><th>Discipline</th><th>Structures</th><th>Licenciées</th><th>Part féminine</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 6bis. RENDU — DOCUMENTS & ORGANISMES SPÉCIFIQUES PAR DISCIPLINE
   *  Source : disciplines-config-feminin.js (couche additive greffée
   *  sur window.GSCDisciplines). Si ce module n'est pas chargé, la
   *  section affiche un message explicite au lieu d'échouer.
   * ══════════════════════════════════════════════════════════════════ */
  function renderConfigTable() {
    const el = document.getElementById('fem-config-table');
    if (!el) return;

    const D = window.GSCDisciplines;
    if (!D || typeof D.listFeminineConfiguredDisciplines !== 'function') {
      el.innerHTML = '<p style="text-align:center;color:var(--gray-txt);padding:16px;">' +
        'Module disciplines-config-feminin.js non chargé — aucune donnée disponible.</p>';
      return;
    }

    // On part de toutes les disciplines connues (pour montrer aussi les non-configurées),
    // sinon on retombe sur celles qui ont au moins une couche féminine renseignée.
    const allDisciplines = (typeof D.getDisciplines === 'function') ? D.getDisciplines() : D.listFeminineConfiguredDisciplines();
    if (!allDisciplines.length) {
      el.innerHTML = '<p style="text-align:center;color:var(--gray-txt);padding:16px;">Aucune discipline référencée.</p>';
      return;
    }

    const rows = allDisciplines.map(disc => {
      const icon = D.getIcon ? D.getIcon(disc) : '🏅';
      const configured = D.isFeminineConfigured(disc);
      const orgs = D.getFeminineOrganismes(disc);
      const docs = D.getFeminineDocuments(disc);
      const cats = D.getFeminineCategories(disc);

      const orgsTxt = orgs.length ? orgs.map(o => esc(o.sigle ? `${o.sigle} — ${o.nom}` : o.nom)).join('<br>') : '—';
      const catsTxt = cats.length ? cats.map(esc).join(', ') : '—';
      const docsTxt = docs.length ? docs.map(d => esc(d.label) + (d.obligatoire ? ' <span style="color:var(--danger);font-weight:700;">*</span>' : '')).join('<br>') : '—';

      return `
        <tr>
          <td>${icon} ${esc(disc)}</td>
          <td>${configured
            ? '<span style="color:#10b981;font-weight:700;">✅ Configuré</span>'
            : '<span style="color:var(--gray-txt);">— Non configuré</span>'}</td>
          <td>${orgsTxt}</td>
          <td>${catsTxt}</td>
          <td>${docsTxt}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="users-table-wrap">
        <table class="users-table">
          <thead><tr><th>Discipline</th><th>Statut</th><th>Organismes féminins</th><th>Catégories</th><th>Documents spécifiques</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 7. RENDU — TABLEAU DES STRUCTURES
   * ══════════════════════════════════════════════════════════════════ */
  let _lastStructuresRows = [];

  function computeStructuresRows() {
    const D = window.GSCDisciplines;
    return getStructures()
      .map(s => {
        const e = feminineEffectifForStructure(s);
        return { s, e };
      })
      .filter(({ e }) => e.femmes > 0)
      .map(({ s, e }) => {
        const pct = e.total > 0 ? Math.round((e.femmes / e.total) * 100) : 0;
        const icon = D && D.getIcon ? D.getIcon(s.discipline) : '🏅';
        return { s, e, pct, icon };
      })
      .sort((a, b) => b.e.femmes - a.e.femmes);
  }

  function renderStructuresTable(filterTerm) {
    const el = document.getElementById('fem-structures-table');
    if (!el) return;

    const q = (filterTerm || '').toLowerCase().trim();
    let rows = _lastStructuresRows;
    if (q) {
      rows = rows.filter(({ s }) =>
        (s.nom || '').toLowerCase().includes(q) ||
        (s.ville || '').toLowerCase().includes(q) ||
        (s.discipline || '').toLowerCase().includes(q)
      );
    }

    if (!rows.length) {
      el.innerHTML = '<p style="text-align:center;color:var(--gray-txt);padding:16px;">Aucune structure avec effectif féminin trouvée.</p>';
      return;
    }

    const trs = rows.map(({ s, e, pct, icon }) => `
      <tr onclick="window.gscOpenStructure && window.gscOpenStructure('${esc(s.id)}')" style="cursor:pointer;">
        <td>${esc(s.nom)}</td>
        <td>${icon} ${esc(s.discipline || '—')}</td>
        <td>${esc(s.ville || '—')}</td>
        <td>${e.femmes}</td>
        <td>
          <div class="fem-bar-wrap">
            <div class="fem-bar-track"><div class="fem-bar-fill" style="width:${pct}%;"></div></div>
            <span style="font-size:11px;font-weight:700;color:#be185d;">${pct}%</span>
          </div>
        </td>
      </tr>`).join('');

    el.innerHTML = `
      <div class="users-table-wrap">
        <table class="users-table">
          <thead><tr><th>Structure</th><th>Discipline</th><th>Ville</th><th>Licenciées</th><th>Part féminine</th></tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 8. RENDU GLOBAL
   * ══════════════════════════════════════════════════════════════════ */
  function render() {
    renderStatsCards();
    renderRolesTable();
    renderDisciplineTable();
    renderConfigTable();
    _lastStructuresRows = computeStructuresRows();
    const search = document.getElementById('fem-structures-search');
    renderStructuresTable(search ? search.value : '');
  }

  /* ══════════════════════════════════════════════════════════════════
   * 9. BOOT
   * ══════════════════════════════════════════════════════════════════ */
  function boot() {
    injectStyles();
    injectNav();
    injectSection();

    if (window.structuresManager && typeof window.structuresManager.onUpdate === 'function') {
      window.structuresManager.onUpdate(() => {
        if (document.getElementById(SECTION_ID)?.classList.contains('active')) render();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GSCAdminFeminin = { showSection, render };

})(window);
