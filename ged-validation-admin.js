/**
 * ══════════════════════════════════════════════════════════════════════
 *  GED-VALIDATION-ADMIN.JS — Validation, Classement &amp; Tableau de bord
 *  Gabon Sport Connect · Module Admin 2/4 · 2026
 *
 *  Tableau d'administration filtrable (sport, ville/province, type de
 *  structure, catégorie, statut) des documents déposés par les structures.
 *  Actions : prévisualiser, télécharger, valider, refuser, demander une
 *  correction, commenter, consulter l'historique.
 *
 *  Calcule automatiquement le taux de conformité GED (documents
 *  obligatoires validés ÷ documents obligatoires exigés du catalogue),
 *  attribue le badge Bronze/Argent/Or et affiche le classement dynamique.
 *
 *  Écrit directement dans la collection `notifications` (même schéma que
 *  gsc-notifications.js) pour prévenir la structure d'une validation,
 *  d'un refus ou d'une demande de correction — sans dépendance directe
 *  au module (non chargé dans admin.html).
 *
 *  Dépendances : window.db (firebase-init.js), window.structuresManager,
 *  window.GSCDisciplines, window.GEDCatalogue (ged-catalogue-manager.js).
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const D = () => window.GSCDisciplines;
  const SM = () => window.structuresManager;
  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmtDate(d) { try { return d ? new Date(d.toDate ? d.toDate() : d).toLocaleDateString('fr-FR') : '—'; } catch (e) { return '—'; } }
  function uid() { return (window.firebase && firebase.auth().currentUser) ? firebase.auth().currentUser.uid : 'admin'; }

  const STATUT_LABELS = {
    en_attente: '🕓 En attente', valide: '✅ Validé', refuse: '❌ Refusé', correction: '✏️ Correction demandée'
  };

  let _rows = [];
  let _structures = [];

  /* ══════════════════════════════════════════════════════════════════
   * 1. CONSTRUCTION DES LIGNES (structure × document catalogue déposé)
   * ══════════════════════════════════════════════════════════════════ */
  async function buildRows() {
    await window.GEDCatalogue.loadCatalogue();
    _structures = (SM() && SM().list()) || [];
    const rows = [];

    _structures.forEach(s => {
      const saison = s.saisonCourante || '2025-2026';
      const catalogue = window.GEDCatalogue.getCatalogueForStructure(s, saison);
      const gedDocs = ((s.saisons || {})[saison] || {}).gedDocuments || {};

      catalogue.forEach(c => {
        const dep = gedDocs[c.id];
        if (!dep) return; // seuls les documents effectivement déposés apparaissent dans la file de validation
        rows.push({
          structureId: s.id, structureNom: s.nom, discipline: s.discipline, ville: s.ville,
          type: s.type, saison, catalogueId: c.id, docNom: c.nom, categorie: c.categorie,
          obligatoire: c.obligatoire, statut: dep.statut || 'en_attente', url: dep.url,
          fileName: dep.fileName, uploadedAt: dep.uploadedAt, observation: dep.observation || '',
          historique: dep.historique || []
        });
      });
    });

    _rows = rows;
    return rows;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. FILTRES
   * ══════════════════════════════════════════════════════════════════ */
  function renderFilters() {
    const disciplines = D().list();
    const villes = [...new Set(_structures.map(s => s.ville).filter(Boolean))].sort();
    const types = [...new Set(_structures.map(s => s.type).filter(Boolean))].sort();

    return `
      <div class="ged-filters">
        <select id="gedv-f-sport"><option value="">Tous sports</option>${disciplines.map(name => `<option value="${esc(name)}">${D().getIcon(name) || ''} ${esc(name)}</option>`).join('')}</select>
        <select id="gedv-f-ville"><option value="">Toutes villes/provinces</option>${villes.map(v => `<option>${esc(v)}</option>`).join('')}</select>
        <select id="gedv-f-type"><option value="">Tous types</option>${types.map(t => `<option>${esc(t)}</option>`).join('')}</select>
        <select id="gedv-f-cat"><option value="">Toutes catégories</option><option value="administratif">Administratif</option><option value="juridique">Juridique</option><option value="financier">Financier</option><option value="sportif">Sportif</option></select>
        <select id="gedv-f-statut"><option value="">Tous statuts</option><option value="en_attente">En attente</option><option value="valide">Validé</option><option value="refuse">Refusé</option><option value="correction">Correction demandée</option></select>
        <button class="btn btn-secondary" onclick="GEDValidation.applyFilters()">🔍 Filtrer</button>
      </div>
    `;
  }

  function applyFilters() {
    const sport = document.getElementById('gedv-f-sport').value;
    const ville = document.getElementById('gedv-f-ville').value;
    const type = document.getElementById('gedv-f-type').value;
    const cat = document.getElementById('gedv-f-cat').value;
    const statut = document.getElementById('gedv-f-statut').value;

    const filtered = _rows.filter(r =>
      (!sport || r.discipline === sport) &&
      (!ville || r.ville === ville) &&
      (!type || r.type === type) &&
      (!cat || r.categorie === cat) &&
      (!statut || r.statut === statut)
    );
    document.getElementById('gedv-table').innerHTML = renderTable(filtered);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. TABLEAU
   * ══════════════════════════════════════════════════════════════════ */
  function renderTable(rows) {
    if (!rows.length) return '<p class="ged-empty-msg">Aucun document ne correspond aux filtres.</p>';
    const trs = rows.map((r, i) => `
      <tr>
        <td>${esc(r.structureNom)}</td>
        <td>${D().getIcon(r.discipline)} ${esc(r.ville || '—')}</td>
        <td>${esc(r.docNom)}${r.obligatoire ? ' <span class="ged-req">*</span>' : ''}</td>
        <td><span class="ged-status ged-status-${esc(r.statut)}">${STATUT_LABELS[r.statut] || r.statut}</span></td>
        <td>${fmtDate(r.uploadedAt)}</td>
        <td class="ged-row-actions">
          <a class="btn-sm" href="${esc(r.url)}" target="_blank">👁️</a>
          <a class="btn-sm" href="${esc(r.url)}" download>⬇️</a>
          <button class="btn-sm" onclick="GEDValidation.decide('${esc(r.structureId)}','${esc(r.saison)}','${esc(r.catalogueId)}','valide')">✅</button>
          <button class="btn-sm" onclick="GEDValidation.decide('${esc(r.structureId)}','${esc(r.saison)}','${esc(r.catalogueId)}','refuse')">❌</button>
          <button class="btn-sm" onclick="GEDValidation.decide('${esc(r.structureId)}','${esc(r.saison)}','${esc(r.catalogueId)}','correction')">✏️</button>
          <button class="btn-sm" onclick="GEDValidation.showHistory('${esc(r.structureId)}','${esc(r.saison)}','${esc(r.catalogueId)}')">📜</button>
        </td>
      </tr>
    `).join('');
    return `
      <div class="users-table-wrap">
        <table class="users-table">
          <thead><tr><th>Structure</th><th>Ville</th><th>Document</th><th>Statut</th><th>Déposé le</th><th>Actions</th></tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. DÉCISION (valider / refuser / correction) + commentaire + notif
   * ══════════════════════════════════════════════════════════════════ */
  function decide(structureId, saison, catalogueId, decision) {
    const needsComment = decision !== 'valide';
    const html = `
      <div class="modal-overlay open" id="ged-decide-modal" onclick="this.classList.remove('open');this.remove()">
        <div class="modal" style="max-width:440px;" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">${decision === 'valide' ? '✅ Valider' : decision === 'refuse' ? '❌ Refuser' : '✏️ Demander une correction'}</div>
            <button class="modal-close" onclick="document.getElementById('ged-decide-modal').remove()">✕</button>
          </div>
          <div class="modal-content">
            <div class="ged-form-field">
              <label>Observation ${needsComment ? '(obligatoire)' : '(optionnelle)'}</label>
              <textarea id="ged-decide-comment" rows="3" placeholder="Motif, précisions à l'attention de la structure…"></textarea>
            </div>
            <div class="modal-actions">
              <button class="btn btn-primary" onclick="GEDValidation.confirmDecision('${esc(structureId)}','${esc(saison)}','${esc(catalogueId)}','${decision}')">Confirmer</button>
              <button class="btn btn-secondary" onclick="document.getElementById('ged-decide-modal').remove()">Annuler</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  async function confirmDecision(structureId, saison, catalogueId, decision) {
    const comment = (document.getElementById('ged-decide-comment')?.value || '').trim();
    if (decision !== 'valide' && !comment) { alert('Merci de préciser une observation.'); return; }

    try {
      const structRef = window.db.collection('structuresSportives').doc(structureId);
      const snap = await structRef.get();
      const structure = snap.data();
      const gedDocs = ((structure.saisons || {})[saison] || {}).gedDocuments || {};
      const current = gedDocs[catalogueId] || {};
      const historique = (current.historique || []).concat([{
        action: decision, date: new Date(), parUid: uid(), commentaire: comment || null
      }]);

      const path = `saisons.${saison}.gedDocuments.${catalogueId}`;
      await structRef.update({
        [path]: {
          ...current,
          statut: decision,
          observation: comment || (decision === 'valide' ? '' : current.observation || ''),
          valideParUid: uid(),
          dateValidation: new Date(),
          historique
        }
      });

      await notifyStructure(structureId, catalogueId, decision, comment);

      document.getElementById('ged-decide-modal')?.remove();
      alert('✅ Décision enregistrée');
      await refreshAll();
    } catch (err) {
      alert('❌ Erreur : ' + (err.message || err));
    }
  }

  async function notifyStructure(structureId, catalogueId, decision, comment) {
    try {
      const usersSnap = await window.db.collection('users').where('structureId', '==', structureId).get();
      const catEntry = window.GEDCatalogue.getCatalogueSync().find(c => c.id === catalogueId);
      const docNom = catEntry ? catEntry.nom : 'Document';
      const titles = {
        valide: `✅ Document validé — ${docNom}`,
        refuse: `❌ Document refusé — ${docNom}`,
        correction: `✏️ Correction demandée — ${docNom}`
      };
      const bodies = {
        valide: `Votre document "${docNom}" a été validé par l'administration.`,
        refuse: `Votre document "${docNom}" a été refusé. ${comment ? 'Motif : ' + comment : ''}`,
        correction: `Une correction est demandée pour "${docNom}". ${comment ? 'Détail : ' + comment : ''}`
      };
      const batchWrites = usersSnap.docs.map(u => window.db.collection('notifications').add({
        type: 'conformite_ged', title: titles[decision], body: bodies[decision],
        recipientId: u.id, read: false, createdAt: new Date(),
        link: { section: 'conformite' }, senderId: 'admin'
      }));
      await Promise.all(batchWrites);
    } catch (err) {
      console.warn('[GEDValidation] notification non envoyée :', err);
    }
  }

  async function showHistory(structureId, saison, catalogueId) {
    const snap = await window.db.collection('structuresSportives').doc(structureId).get();
    const structure = snap.data() || {};
    const gedDocs = ((structure.saisons || {})[saison] || {}).gedDocuments || {};
    const dep = gedDocs[catalogueId] || {};
    const hist = dep.historique || [];
    const rows = hist.map(h => `<tr><td>${esc(h.action)}</td><td>${fmtDate(h.date)}</td><td>${esc(h.commentaire || '—')}</td></tr>`).join('')
      || '<tr><td colspan="3">Aucun historique.</td></tr>';
    const html = `
      <div class="modal-overlay open" id="ged-hist-modal" onclick="this.classList.remove('open');this.remove()">
        <div class="modal" style="max-width:520px;" onclick="event.stopPropagation()">
          <div class="modal-header"><div class="modal-title">📜 Historique du document</div><button class="modal-close" onclick="document.getElementById('ged-hist-modal').remove()">✕</button></div>
          <div class="modal-content">
            <table class="users-table"><thead><tr><th>Action</th><th>Date</th><th>Commentaire</th></tr></thead><tbody>${rows}</tbody></table>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. CLASSEMENT DYNAMIQUE (Or > Argent > Bronze)
   * ══════════════════════════════════════════════════════════════════ */
  function renderRanking() {
    const ranked = _structures.map(s => {
      const saison = s.saisonCourante || '2025-2026';
      const badge = window.GEDCatalogue.computeGedBadge(s, saison);
      return badge ? { nom: s.nom, discipline: s.discipline, ...badge } : null;
    }).filter(Boolean);

    const order = { or: 0, argent: 1, bronze: 2 };
    ranked.sort((a, b) => (order[a.level] - order[b.level]) || (b.pct - a.pct));

    if (!ranked.length) return '<p class="ged-empty-msg">Aucune structure évaluable pour le moment (catalogue non configuré pour leur discipline).</p>';

    const rows = ranked.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${D().getIcon(r.discipline)} ${esc(r.nom)}</td>
        <td><span class="ged-badge-chip" style="background:${r.color}22;color:${r.color};border-color:${r.color};">${r.label === 'Or' ? '🥇' : r.label === 'Argent' ? '🥈' : '🥉'} ${r.label}</span></td>
        <td>${r.pct}%</td>
      </tr>
    `).join('');

    return `<div class="users-table-wrap"><table class="users-table"><thead><tr><th>#</th><th>Structure</th><th>Badge</th><th>Taux</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 6. TABLEAU DE BORD
   * ══════════════════════════════════════════════════════════════════ */
  function renderDashboard() {
    const clubs = _structures.filter(s => s.type === 'Club').length;
    const valides = _rows.filter(r => r.statut === 'valide').length;
    const refuses = _rows.filter(r => r.statut === 'refuse').length;
    const attente = _rows.filter(r => r.statut === 'en_attente' || r.statut === 'correction').length;

    const badges = _structures.map(s => window.GEDCatalogue.computeGedBadge(s, s.saisonCourante || '2025-2026')).filter(Boolean);
    const or = badges.filter(b => b.level === 'or').length;
    const argent = badges.filter(b => b.level === 'argent').length;
    const bronze = badges.filter(b => b.level === 'bronze').length;

    return `
      <div class="stats-grid ged-stats-grid">
        <div class="stat-card c1"><div class="stat-icon">🏟️</div><div class="stat-data"><div class="stat-value">${clubs}</div><div class="stat-label">Clubs</div></div></div>
        <div class="stat-card c2"><div class="stat-icon">🏢</div><div class="stat-data"><div class="stat-value">${_structures.length}</div><div class="stat-label">Structures</div></div></div>
        <div class="stat-card c3"><div class="stat-icon">✅</div><div class="stat-data"><div class="stat-value">${valides}</div><div class="stat-label">Documents validés</div></div></div>
        <div class="stat-card c4"><div class="stat-icon">❌</div><div class="stat-data"><div class="stat-value">${refuses}</div><div class="stat-label">Documents refusés</div></div></div>
        <div class="stat-card c1"><div class="stat-icon">🕓</div><div class="stat-data"><div class="stat-value">${attente}</div><div class="stat-label">En attente</div></div></div>
        <div class="stat-card c2"><div class="stat-icon">🥇</div><div class="stat-data"><div class="stat-value">${or}</div><div class="stat-label">Structures Or</div></div></div>
        <div class="stat-card c3"><div class="stat-icon">🥈</div><div class="stat-data"><div class="stat-value">${argent}</div><div class="stat-label">Structures Argent</div></div></div>
        <div class="stat-card c4"><div class="stat-icon">🥉</div><div class="stat-data"><div class="stat-value">${bronze}</div><div class="stat-label">Structures Bronze</div></div></div>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 7. INJECTION UI + RAFRAÎCHISSEMENT
   * ══════════════════════════════════════════════════════════════════ */
  async function refreshAll() {
    await buildRows();
    const tableEl = document.getElementById('gedv-table');
    if (tableEl) tableEl.innerHTML = renderTable(_rows);
    const rankEl = document.getElementById('gedv-ranking');
    if (rankEl) rankEl.innerHTML = renderRanking();
    const dashEl = document.getElementById('gedv-dashboard');
    if (dashEl) dashEl.innerHTML = renderDashboard();
  }

  function injectPanel() {
    if (document.getElementById('ged-validation-panel')) return;
    const host = document.getElementById('conformite');
    if (!host) return;

    const panel = document.createElement('div');
    panel.id = 'ged-validation-panel';
    panel.className = 'dash-card ged-panel';
    panel.innerHTML = `
      <div class="dash-card-title">📊 Tableau de bord GED</div>
      <div id="gedv-dashboard"></div>
      <div class="dash-card-title" style="margin-top:18px;">✅ Validation des documents déposés</div>
      ${renderFilters()}
      <div id="gedv-table"></div>
      <div class="dash-card-title" style="margin-top:18px;">🏆 Classement dynamique</div>
      <div id="gedv-ranking"></div>
    `;
    host.appendChild(panel);

    if (SM() && typeof SM().onUpdate === 'function') {
      SM().onUpdate(() => refreshAll());
    } else {
      refreshAll();
    }
  }

  function boot() {
    const target = document.getElementById('conformite');
    if (target) { injectPanel(); return; }
    const obs = new MutationObserver(() => {
      if (document.getElementById('conformite')) injectPanel();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GEDValidation = {
    applyFilters, decide, confirmDecision, showHistory, refreshAll,
    getRows: () => _rows, getStructures: () => _structures
  };

})(window);
