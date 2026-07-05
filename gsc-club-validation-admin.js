/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC CLUB VALIDATION (ADMIN) — File d'attente des rattachements
 *  Gabon Sport Connect · 2026
 *
 *  Monkey-patch non-invasif d'admin.html, même convention que
 *  admin-actors-accounts.js :
 *   - Injecte un item de navigation "🏟️ Validations clubs"
 *   - Liste tous les acteurs avec `clubValidation.status === 'pending'`
 *     (sous contrat ou poste de direction déclaré à l'inscription),
 *     avec le compte à rebours des 72h.
 *   - Permet à l'administrateur de la plateforme de valider/refuser en
 *     lieu et place du club, s'il ne s'est pas prononcé à temps — sans
 *     jamais bloquer l'accès de l'acteur, qui reste actif entre-temps.
 *   - En cas de refus : l'acteur repasse automatiquement en statut
 *     "libre" / sans club (membre simple), avec un message l'invitant
 *     à se rapprocher de la direction de son club.
 *
 *  ⚠️ Ce module lit `users` via window.realtimeSync (déjà utilisé
 *  ailleurs dans admin.html) et écrit avec l'API Firebase compat
 *  (`firebase.firestore()` / `window.db.collection(...)`), identique au
 *  reste d'admin.html.
 *
 *  ℹ️ La liste des structures réelles (fédérations + 14 clubs du
 *  National Foot 1 saison 2025-2026) vit dans gsc-gabon-sports-data.js.
 *  Si une collection Firestore `structuresSportives` existe déjà et
 *  fait référence (vu dans admin.html), il est recommandé de la
 *  synchroniser avec ce référentiel plutôt que de le dupliquer — se
 *  reporter à structures-manager.js pour le schéma exact des documents.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const SECTION_ID = 'club-validations';
  const NAV_ID = 'nav-club-validations';
  const MNAV_ID = 'mnav-club-validations';
  const DEADLINE_MS = 72 * 3600 * 1000;

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fdb() { return (window.firebase && firebase.firestore) ? firebase.firestore() : (window.db || null); }

  function injectNav() {
    if (!document.getElementById(NAV_ID)) {
      const anchor = document.getElementById('nav-comptes-acteurs') || document.getElementById('nav-joueurs');
      if (anchor) {
        anchor.insertAdjacentHTML('afterend',
          `<button class="nav-item" id="${NAV_ID}"><span class="nav-icon">🏟️</span><span>Validations clubs</span></button>`);
      }
    }
    if (!document.getElementById(MNAV_ID)) {
      const mnav = document.querySelector('.mobile-nav');
      if (mnav) mnav.insertAdjacentHTML('beforeend', `<button class="mn-btn" id="${MNAV_ID}"><span class="mn-icon">🏟️</span><span>Clubs</span></button>`);
    }
    [document.getElementById(NAV_ID), document.getElementById(MNAV_ID)].forEach(btn => {
      if (btn && !btn._gscBound) { btn._gscBound = true; btn.addEventListener('click', showSection); }
    });
  }

  function injectSection() {
    if (document.getElementById(SECTION_ID)) return;
    const main = document.querySelector('.main-content');
    if (!main) return;
    main.insertAdjacentHTML('beforeend', `
      <div id="${SECTION_ID}" class="section">
        <div class="dash-card mb-16">
          <div class="dash-card-title">🏟️ Validations de rattachement club / structure</div>
          <p style="font-size:12px;color:var(--gray-txt);">
            Acteurs ayant déclaré un statut "Sous contrat" ou "Poste de direction" auprès d'un club/fédération.
            La structure concernée dispose normalement de <strong>72 heures</strong> pour valider ou refuser depuis son propre
            compte ; vous pouvez trancher ici si elle ne s'est pas prononcée, ou en cas de besoin. Ceci ne bloque jamais
            l'accès de l'acteur à la plateforme.
          </p>
          <div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <button type="button" class="btn-sm" onclick="GSCClubValidationAdmin.runSeed()">📥 Importer/actualiser les 14 clubs D1 + fédérations (saison 2025-2026)</button>
            <span id="cv-seed-status" style="font-size:11.5px;color:var(--gray-txt);"></span>
          </div>
        </div>
        <div class="dash-card">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">
            <select id="cv-filter" onchange="GSCClubValidationAdmin.render()">
              <option value="pending">⏳ En attente</option>
              <option value="overdue">⚠️ Délai dépassé (&gt;72h)</option>
              <option value="approved">✅ Validées</option>
              <option value="rejected">❌ Refusées</option>
              <option value="all">Toutes</option>
            </select>
            <span id="cv-count" style="font-size:12px;color:var(--gray-txt);"></span>
          </div>
          <div id="cv-table"></div>
        </div>
      </div>
    `);
  }

  function showSection() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(SECTION_ID)?.classList.add('active');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mn-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(NAV_ID)?.classList.add('active');
    document.getElementById(MNAV_ID)?.classList.add('active');
    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle && topbarTitle.firstChild) topbarTitle.firstChild.textContent = 'Validations clubs';
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
    render();
  }

  function getUsers() {
    return (window.realtimeSync && window.realtimeSync.getCache && window.realtimeSync.getCache('users')) || [];
  }

  function actorName(u) {
    return [u.prenom, u.nom].filter(Boolean).join(' ') || u.nomOrganisation || u.email || 'Sans nom';
  }

  function classify(u) {
    const cv = u.clubValidation;
    if (!cv || !cv.status) return null;
    if (cv.status === 'pending') {
      const overdue = cv.deadline && new Date(cv.deadline).getTime() < Date.now();
      return overdue ? 'overdue' : 'pending';
    }
    return cv.status; // 'approved' | 'rejected'
  }

  function render() {
    const table = document.getElementById('cv-table');
    const countEl = document.getElementById('cv-count');
    if (!table) return;
    const filter = document.getElementById('cv-filter')?.value || 'pending';
    const rows = getUsers()
      .map(u => ({ u, cat: classify(u) }))
      .filter(r => r.cat && (filter === 'all' || r.cat === filter));

    if (countEl) countEl.textContent = `${rows.length} résultat(s)`;
    if (!rows.length) { table.innerHTML = `<p style="font-size:12.5px;color:var(--gray-txt);">Aucune demande dans cette catégorie.</p>`; return; }

    table.innerHTML = rows.map(({ u, cat }) => {
      const uid = u.uid || u.id;
      const cv = u.clubValidation;
      const deadline = cv.deadline ? new Date(cv.deadline) : null;
      const remainingMs = deadline ? deadline.getTime() - Date.now() : null;
      const remainingLabel = cat === 'pending' && remainingMs != null
        ? `⏱️ ${Math.max(0, Math.round(remainingMs / 3600000))}h restantes`
        : (cat === 'overdue' ? '⚠️ délai dépassé' : '');
      const statutLabel = cv.requestedStatut === 'direction' ? 'Poste de direction' : (cv.requestedStatut === 'sous_contrat' ? 'Sous contrat' : (cv.requestedStatut || ''));
      const actions = (cat === 'pending' || cat === 'overdue')
        ? `<button class="btn-sm" style="background:#10b981;color:#fff;" onclick="GSCClubValidationAdmin.approve('${uid}')">✅ Valider</button>
           <button class="btn-sm" style="background:#ef4444;color:#fff;" onclick="GSCClubValidationAdmin.reject('${uid}')">❌ Refuser</button>`
        : `<span style="font-size:11.5px;color:var(--gray-txt);">${cv.status === 'approved' ? '✅ Validée' : '❌ Refusée'}${cv.decidedAt ? ' le ' + new Date(cv.decidedAt).toLocaleDateString('fr-FR') : ''}</span>`;

      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-bd,#eee);flex-wrap:wrap;">
          <div>
            <div style="font-weight:700;font-size:13px;">${esc(actorName(u))} <span style="font-weight:400;color:var(--gray-txt);font-size:11.5px;">(${esc(u.email || '')})</span></div>
            <div style="font-size:11.5px;color:var(--gray-txt);">${esc(cv.structureName || '')} · ${esc(statutLabel)} · ${remainingLabel}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">${actions}</div>
        </div>`;
    }).join('');
  }

  async function writeDecision(uid, fields) {
    const db = fdb();
    if (!db) { alert('Firestore indisponible.'); return; }
    try {
      await db.collection('users').doc(uid).update(fields);
      render();
    } catch (err) {
      console.error('[GSCClubValidationAdmin] erreur écriture :', err);
      alert('Erreur : ' + (err.message || err));
    }
  }

  function approve(uid) {
    writeDecision(uid, {
      'clubValidation.status': 'approved',
      'clubValidation.decidedAt': new Date().toISOString(),
      'clubValidation.decidedBy': 'admin_plateforme',
    });
  }

  function reject(uid) {
    const reason = prompt('Motif du refus (optionnel — sera visible par l\'acteur) :', '') || '';
    writeDecision(uid, {
      'clubValidation.status': 'rejected',
      'clubValidation.decidedAt': new Date().toISOString(),
      'clubValidation.decidedBy': 'admin_plateforme',
      'clubValidation.rejectionMessage': reason || "Rapprochez-vous de la direction de votre club pour connaître les motifs du refus.",
      statut: 'libre',
      employeur: '',
    });
  }

  async function runSeed() {
    const statusEl = document.getElementById('cv-seed-status');
    if (!window.GSCStructuresSeed) { alert('gsc-structures-seed.js non chargé.'); return; }
    if (!confirm("Importer/actualiser les fédérations et les 14 clubs réels du National Foot 1 (saison 2025-2026) dans la base des structures ?\n\nAucun doublon ne sera créé pour les structures déjà existantes.")) return;
    if (statusEl) statusEl.textContent = '⏳ Import en cours…';
    try {
      const report = await window.GSCStructuresSeed.run((done, total) => {
        if (statusEl) statusEl.textContent = `⏳ ${done}/${total}…`;
      });
      if (statusEl) statusEl.textContent = `✅ ${report.created.length} créée(s), ${report.refreshed.length} actualisée(s)${report.errors.length ? `, ⚠️ ${report.errors.length} erreur(s)` : ''}.`;
    } catch (err) {
      console.error('[GSCClubValidationAdmin] runSeed erreur :', err);
      if (statusEl) statusEl.textContent = '❌ ' + (err.message || err);
    }
  }

  function boot() {
    injectNav();
    injectSection();
    if (window.realtimeSync && typeof window.realtimeSync.onUpdate === 'function') {
      window.realtimeSync.onUpdate('users', () => {
        if (document.getElementById(SECTION_ID)?.classList.contains('active')) render();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GSCClubValidationAdmin = { showSection, render, approve, reject, runSeed };

})(window);
