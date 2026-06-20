/* ═══════════════════════════════════════════════════════════════
   ADMIN-CONTROLLER.JS — Logique du panneau GSC Admin AMÉLIORÉ
   • Toutes les catégories d'acteurs (écoles/universités ajoutées)
   • Comptage cohérent avec index.html
   • Navigation responsive sans débordement
   • Modes d'affichage (grille/liste/compact)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const ROLE_LABELS = {
    joueur: '⚽ Joueur / Athlète',
    entraineur: '📋 Entraîneur',
    arbitre: '🟨 Arbitre',
    club: '🏟️ Club',
    federation: '🏛️ Fédération',
    association: '🤝 Association',
    organisateur: '🎪 Organisateur',
    independant: '🚴 Indépendant',
    supporter: '💗 Supporter',
    eleve_etudiant: '🎓 Élève / Étudiant',
    sportif_etranger: '🌍 Sportif étranger',
    ecole_universite: '🏫 École/Université'
  };
  const ROLE_COLORS = {
    joueur: '#009E60',
    entraineur: '#f97316',
    arbitre: '#8b5cf6',
    club: '#3b82f6',
    federation: '#f97316',
    association: '#e11d48',
    organisateur: '#0d9488',
    independant: '#64748b',
    supporter: '#ec4899',
    eleve_etudiant: '#6366f1',
    sportif_etranger: '#ca8a04',
    ecole_universite: '#059669'
  };
  const DASH_ROLES = [
    'joueur', 'entraineur', 'arbitre', 'club', 'federation', 'association',
    'organisateur', 'supporter', 'independant', 'eleve_etudiant',
    'sportif_etranger', 'ecole_universite'
  ];
  const GROUP_ORDER = [
    'joueur', 'entraineur', 'arbitre', 'club', 'federation', 'association',
    'organisateur', 'independant', 'supporter', 'eleve_etudiant',
    'sportif_etranger', 'ecole_universite'
  ];

  let users = [], matchs = [];
  let realUsers = [];
  let roleFilter = 'all', searchTerm = '';
  let phFilter = 'all';
  let matchTabFilter = 'all';
  let displayMode = localStorage.getItem('gsc-admin-display-mode') || 'grid';
  let currentPlayerId = null, currentMatchId = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function fullName(u) { return ((u.prenom || '') + ' ' + (u.nom || '')).trim() || u.nomOrganisation || u.nomEtablissement || u.name || 'Sans nom'; }
  function fmtDate(ts) { try { return ts && ts.toDate ? ts.toDate().toLocaleDateString('fr-FR') : '—'; } catch (e) { return '—'; } }

  function mergeWithDemo(realData) {
    const seed = window.GSC_SEED_ACTORS || [];
    const realIds = new Set(realData.map(u => u.uid || u.id));
    const demoOnly = seed.filter(s => !realIds.has(s.uid)).map(s => ({ ...s, id: s.uid }));
    return [...realData, ...demoOnly];
  }

  /* ═══ NAVIGATION ═══ */
  function switchSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(name);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item, .mn-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.getElementById('nav-' + name);
    const mnBtn = document.getElementById('mnav-' + name);
    if (navBtn) navBtn.classList.add('active');
    if (mnBtn) mnBtn.classList.add('active');

    const titleEl = document.getElementById('topbar-title');
    if (titleEl && titleEl.firstChild) {
      const labels = { dashboard: 'Dashboard', joueurs: 'Joueurs', photos: 'Photos & Logos', matchs: 'Matchs', rapports: 'Rapports', documents: 'Documents', verification: 'Vérification', carte: 'Carte des sites' };
      titleEl.firstChild.textContent = labels[name] || name;
    }
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');

    if (name === 'joueurs') renderPlayers();
    if (name === 'photos') renderPhotos();
    if (name === 'matchs') renderMatches();
    if (name === 'documents') renderDocuments();
    if (name === 'dashboard') renderDashboard();
  }

  function wireNav() {
    ['dashboard', 'joueurs', 'photos', 'matchs', 'documents'].forEach(name => {
      document.getElementById('nav-' + name)?.addEventListener('click', () => switchSection(name));
      document.getElementById('mnav-' + name)?.addEventListener('click', () => switchSection(name));
    });
    document.querySelector('.btn-menu')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
      document.getElementById('sidebar-overlay')?.classList.toggle('open');
    });
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebar-overlay')?.classList.remove('open');
    });
  }

  /* ═══ DASHBOARD ═══ */
  function renderDashboard() {
    const visibles = users.filter(u => u.status !== 'deleted');
    const actifs = visibles.filter(u => (u.status || 'active') === 'active');
    const pending = realUsers.filter(u => u.status === 'pending');
    const demoCount = visibles.filter(u => u.isDemo).length;
    const realCount = visibles.filter(u => !u.isDemo).length;

    document.getElementById('stat-total').textContent = visibles.length;
    document.getElementById('stat-verified').textContent = actifs.length;
    document.getElementById('stat-pending').textContent = pending.length;
    document.getElementById('stat-matchs').textContent = matchs.length;

    const totalCard = document.getElementById('stat-total');
    const totalTrendEl = totalCard?.closest('.stat-data')?.querySelector('.stat-trend');
    if (totalTrendEl) totalTrendEl.textContent = demoCount
      ? `${realCount} réel(s) + ${demoCount} démo · ${actifs.length} visible(s) sur l'app`
      : `${actifs.length} visible(s) sur l'app`;

    const total = visibles.length || 1;
    const barsHtml = DASH_ROLES.map(r => {
      const count = visibles.filter(u => u.role === r).length;
      if (count === 0) return '';
      const pct = Math.round((count / total) * 100);
      return `<div class="sb-item"><div class="sb-label"><span>${ROLE_LABELS[r] || r}</span><span style="color:${ROLE_COLORS[r] || '#64748b'}">${count}</span></div><div class="sb-track"><div class="sb-fill" style="width:${pct}%;background:${ROLE_COLORS[r] || '#64748b'}"></div></div></div>`;
    }).join('');
    const barsEl = document.getElementById('role-bars');
    if (barsEl) barsEl.innerHTML = barsHtml;

    const activityEl = document.getElementById('activity-list');
    if (activityEl) {
      activityEl.innerHTML = `
        <div class="act-item"><div class="act-dot" style="background:var(--green)"></div><div class="act-text">${actifs.length} membre(s) actif(s)</div><div class="act-time">—</div></div>
        ${pending.length ? `<div class="act-item"><div class="act-dot" style="background:var(--warn)"></div><div class="act-text">${pending.length} fiche(s) en attente</div><div class="act-time">—</div></div>` : ''}
        ${demoCount ? `<div class="act-item"><div class="act-dot" style="background:#94a3b8"></div><div class="act-text">${demoCount} fiche(s) démo</div><div class="act-time">—</div></div>` : ''}
        <div class="act-item"><div class="act-dot" style="background:var(--green)"></div><div class="act-text">Synchronisé en temps réel</div><div class="act-time">maintenant</div></div>`;
    }

    const upcoming = matchs.filter(m => m.date && new Date(m.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));
    const nextEl = document.getElementById('next-match-preview');
    if (nextEl) {
      if (upcoming.length) {
        const m = upcoming[0];
        const d = new Date(m.date);
        nextEl.innerHTML = `<div style="text-align:center;"><div style="font-weight:800;font-size:14px;">${esc(m.home || 'GSC')} — ${esc(m.away || '?')}</div><div style="font-size:11px;color:var(--gray-txt);margin-top:4px;">${d.toLocaleDateString('fr-FR')} ${m.time ? '· ' + m.time : ''}</div></div>`;
      } else {
        nextEl.innerHTML = `<div style="text-align:center;color:var(--gray-txt);font-size:13px;padding:10px">Aucun match à venir</div>`;
      }
    }
  }

  function wireQuickActions() {
    const btns = document.querySelectorAll('.quick-actions .btn-action');
    const actions = {
      0: () => switchSection('joueurs'),
      1: () => { roleFilter = 'entraineur'; switchSection('joueurs'); },
      2: () => { roleFilter = 'arbitre'; switchSection('joueurs'); },
      3: () => { roleFilter = 'club'; switchSection('joueurs'); },
      4: () => openMatchModal(null),
      5: () => switchSection('matchs'),
      6: () => { roleFilter = 'federation'; switchSection('joueurs'); },
      7: () => { roleFilter = 'eleve_etudiant'; switchSection('joueurs'); },
      8: () => { roleFilter = 'ecole_universite'; switchSection('joueurs'); }
    };
    btns.forEach((btn, i) => {
      if (actions[i]) btn.addEventListener('click', actions[i]);
    });
  }

  /* ═══ JOUEURS / ACTEURS ═══ */
  function matchesRoleFilter(u, filter) {
    if (filter === 'all') return true;
    if (filter === 'supporter') return u.role === 'supporter' || u.isSupporter === true;
    return u.role === filter;
  }

  function renderPlayers() {
    let list = users.filter(u => u.status !== 'deleted');
    if (roleFilter !== 'all') list = list.filter(u => matchesRoleFilter(u, roleFilter));
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(u => (fullName(u) + ' ' + (u.club || u.nomOrganisation || u.nomEtablissement || '') + ' ' + (u.email || '')).toLowerCase().includes(t));
    }

    const tbody = document.getElementById('players-grid');
    const emptyEl = document.getElementById('empty-state');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    const renderRow = (u) => `
      <tr data-id="${u.id}" class="${u.isDemo ? 'is-demo-row' : ''}">
        <td data-label="Membre"><div class="user-name-cell"><div class="user-row-avatar">${u.photoURL ? `<img src="${esc(u.photoURL)}">` : esc(fullName(u).charAt(0).toUpperCase())}</div><span class="user-name-txt">${esc(fullName(u))}</span>${u.isDemo ? '<span class="demo-pill">DÉMO</span>' : ''}</div></td>
        <td data-label="Rôle">${esc(ROLE_LABELS[u.role] || u.titrePersonnalise || u.role || '—')}</td>
        <td data-label="Club/Org">${esc(u.club || u.nomOrganisation || u.nomEtablissement || '—')}</td>
        <td data-label="Statut"><span class="status-badge status-${u.status || 'active'}">${({ active: 'Actif', pending: 'En attente', hidden: 'Masqué', deleted: 'Supprimé' })[u.status || 'active'] || 'Actif'}</span></td>
      </tr>`;

    if (roleFilter === 'all') {
      const buckets = {};
      list.forEach(u => { const r = u.role || 'joueur'; (buckets[r] = buckets[r] || []).push(u); });
      let html = '';
      const seen = new Set();
      GROUP_ORDER.forEach(role => {
        const groupList = buckets[role];
        if (!groupList || !groupList.length) return;
        seen.add(role);
        groupList.sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr'));
        html += `<tr class="group-header-row"><td colspan="4"><span class="group-header-label">${ROLE_LABELS[role] || role}</span><span class="group-header-count">${groupList.length}</span></td></tr>`;
        html += groupList.map(renderRow).join('');
      });
      Object.keys(buckets).forEach(role => {
        if (seen.has(role)) return;
        const groupList = buckets[role];
        html += `<tr class="group-header-row"><td colspan="4"><span class="group-header-label">👤 ${esc(role)}</span><span class="group-header-count">${groupList.length}</span></td></tr>`;
        html += groupList.map(renderRow).join('');
      });
      tbody.innerHTML = html;
    } else {
      list.sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr'));
      tbody.innerHTML = list.map(renderRow).join('');
    }

    tbody.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => openPlayerModal(tr.dataset.id)));
  }

  function wirePlayerFilters() {
    document.querySelectorAll('#joueurs .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#joueurs .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const m = btn.className.match(/role-(\w+)/);
        roleFilter = (m && m[1] !== 'all') ? m[1] : 'all';
        renderPlayers();
      });
    });
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      renderPlayers();
    });
    document.querySelectorAll('.display-mode-btn')?.forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.display-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        displayMode = btn.dataset.mode;
        localStorage.setItem('gsc-admin-display-mode', displayMode);
        renderPlayers();
      });
    });
  }

  function openPlayerModal(id) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    currentPlayerId = id;
    document.getElementById('modal-player-name').textContent = fullName(u) + (u.isDemo ? ' (démo)' : '');
    document.getElementById('modal-player-role').textContent = ROLE_LABELS[u.role] || u.titrePersonnalise || u.role || '';
    document.getElementById('modal-photo-content').textContent = u.photoURL ? '' : '👤';
    const photoBox = document.getElementById('modal-photo');
    photoBox.style.backgroundImage = u.photoURL ? `url('${u.photoURL}')` : '';
    photoBox.style.backgroundSize = 'cover';
    photoBox.style.backgroundPosition = 'center';
    document.getElementById('modal-email').textContent = u.email || '—';
    document.getElementById('modal-phone').textContent = u.telephone || u.phone || '—';
    document.getElementById('modal-date').textContent = fmtDate(u.createdAt);
    document.getElementById('modal-status').value = u.status || 'active';
    document.getElementById('modal-taille').value = u.taille || '';
    document.getElementById('modal-poids').value = u.poids || '';
    document.getElementById('modal-pied').value = u.pied || '';
    document.getElementById('modal-main').value = u.main || '';
    document.getElementById('modal-matchs').value = u.matchsJoues || u.matchsJ || '';
    document.getElementById('modal-buts').value = u.buts || '';
    document.getElementById('modal-passes').value = u.passes || '';
    document.getElementById('modal-club').value = u.club || u.nomOrganisation || u.nomEtablissement || '';
    document.getElementById('modal-titre-perso').value = u.titrePersonnalise || '';

    const modal = document.getElementById('player-modal');
    const saveBtn = modal?.querySelector('.btn-primary');
    const allInputs = modal?.querySelectorAll('input, select, textarea');
    if (u.isDemo) {
      allInputs?.forEach(el => el.disabled = true);
      if (saveBtn) { saveBtn.disabled = true; saveBtn.title = 'Fiche de démonstration — non modifiable'; }
      ensureDeleteButton('player-modal', 'modal-actions', null, true);
      let notice = modal.querySelector('.demo-modal-notice');
      if (!notice) {
        notice = document.createElement('div');
        notice.className = 'demo-modal-notice';
        notice.style.cssText = 'background:#f3f4f6;border-left:4px solid #f59e0b;padding:12px;margin-bottom:12px;font-size:12px;color:#78350f;border-radius:4px';
        notice.textContent = '⚠️ Fiche de démonstration — non éditable. Ces données servent à présenter l\'application. Elles seront retirées quand la base de vrais acteurs sera suffisante.';
        modal.querySelector('.modal-body')?.insertBefore(notice, modal.querySelector('.modal-body').firstChild);
      }
    } else {
      allInputs?.forEach(el => el.disabled = false);
      if (saveBtn) { saveBtn.disabled = false; saveBtn.title = ''; }
      ensureDeleteButton('player-modal', 'modal-actions', () => deletePlayer(id), false);
      modal.querySelector('.demo-modal-notice')?.remove();
    }
    modal?.classList.add('open');
  }

  async function savePlayer() {
    const id = currentPlayerId;
    const u = users.find(x => x.id === id);
    if (!u || u.isDemo) return;
    const updates = {
      status: document.getElementById('modal-status').value,
      taille: document.getElementById('modal-taille').value || null,
      poids: document.getElementById('modal-poids').value || null,
      pied: document.getElementById('modal-pied').value || null,
      main: document.getElementById('modal-main').value || null,
      matchsJoues: parseInt(document.getElementById('modal-matchs').value) || 0,
      buts: parseInt(document.getElementById('modal-buts').value) || 0,
      passes: parseInt(document.getElementById('modal-passes').value) || 0,
      club: document.getElementById('modal-club').value || null,
      titrePersonnalise: document.getElementById('modal-titre-perso').value || null
    };
    try {
      await window.db.collection('users').doc(id).update(updates);
      toast('Acteur mis à jour', 'success');
      closeModal('player-modal');
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }

  async function deletePlayer(id) {
    if (!confirm('Supprimer ce profil ? Cette action est irréversible.')) return;
    try {
      await window.db.collection('users').doc(id).update({ status: 'deleted' });
      toast('Profil supprimé', 'success');
      closeModal('player-modal');
      renderPlayers();
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }

  /* ═══ PHOTOS ═══ */
  function renderPhotos() {
    let list = users.filter(u => u.status !== 'deleted' && u.photoURL);
    if (phFilter !== 'all') list = list.filter(u => matchesRoleFilter(u, phFilter));
    const grid = document.getElementById('photos-grid');
    if (!grid) return;
    grid.innerHTML = list.map(u => `
      <div class="photo-card" data-id="${u.id}">
        <div class="photo-img" style="background-image:url('${esc(u.photoURL)}')"></div>
        <div class="photo-info">
          <div class="photo-name">${esc(fullName(u))}</div>
          <div class="photo-role">${ROLE_LABELS[u.role] || u.role}</div>
        </div>
      </div>
    `).join('');
  }

  function wirePhotoFilters() {
    document.querySelectorAll('#photos .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#photos .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const m = btn.className.match(/role-(\w+)/);
        phFilter = (m && m[1] !== 'all') ? m[1] : 'all';
        renderPhotos();
      });
    });
  }

  /* ═══ MATCHS ═══ */
  function renderMatches() {
    let list = matchs.filter(m => m.status !== 'deleted');
    if (matchTabFilter !== 'all') {
      const now = new Date();
      if (matchTabFilter === 'past') list = list.filter(m => new Date(m.date) < now);
      if (matchTabFilter === 'upcoming') list = list.filter(m => new Date(m.date) >= now);
    }
    const tbody = document.getElementById('matchs-grid');
    if (!tbody) return;
    tbody.innerHTML = list.sort((a, b) => new Date(b.date) - new Date(a.date)).map(m => `
      <tr data-id="${m.id}">
        <td>${esc(m.home || '?')} — ${esc(m.away || '?')}</td>
        <td>${m.date ? new Date(m.date).toLocaleDateString('fr-FR') : '—'}</td>
        <td>${esc(m.lieu || '—')}</td>
        <td>${m.score || '—'}</td>
      </tr>
    `).join('');
    tbody.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => openMatchModal(tr.dataset.id)));
  }

  function wireMatchTabs() {
    document.querySelectorAll('#matchs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#matchs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const m = btn.className.match(/tab-(\w+)/);
        matchTabFilter = (m && m[1]) || 'all';
        renderMatches();
      });
    });
  }

  function openMatchModal(id) {
    const m = id ? matchs.find(x => x.id === id) : null;
    currentMatchId = id;
    document.getElementById('modal-match-home').value = m?.home || '';
    document.getElementById('modal-match-away').value = m?.away || '';
    document.getElementById('modal-match-date').value = m?.date || '';
    document.getElementById('modal-match-time').value = m?.time || '';
    document.getElementById('modal-match-lieu').value = m?.lieu || '';
    document.getElementById('modal-match-score').value = m?.score || '';
    document.getElementById('match-modal')?.classList.add('open');
  }

  async function saveMatch() {
    const data = {
      home: document.getElementById('modal-match-home').value.trim(),
      away: document.getElementById('modal-match-away').value.trim(),
      date: document.getElementById('modal-match-date').value,
      time: document.getElementById('modal-match-time').value || '',
      lieu: document.getElementById('modal-match-lieu').value || '',
      score: document.getElementById('modal-match-score').value || '',
      status: 'active'
    };
    if (!data.home || !data.away || !data.date) { toast('Remplissez au minimum : équipes et date', 'warn'); return; }
    try {
      if (currentMatchId) {
        await window.db.collection('matchs').doc(currentMatchId).update(data);
        toast('Match mis à jour', 'success');
      } else {
        await window.db.collection('matchs').add({ ...data, createdAt: new Date() });
        toast('Match créé', 'success');
      }
      closeModal('match-modal');
      renderMatches();
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }

  async function deleteMatch() {
    if (!confirm('Supprimer ce match ?')) return;
    try {
      await window.db.collection('matchs').doc(currentMatchId).update({ status: 'deleted' });
      toast('Match supprimé', 'success');
      closeModal('match-modal');
      renderMatches();
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }

  /* ═══ DOCUMENTS ═══ */
  let docSearchTerm = '';

  function archiveCheck(targetUsers) {
    const withDocs = targetUsers.filter(u => (u.documents || []).length > 0);
    const withoutDocs = targetUsers.filter(u => (u.documents || []).length === 0);
    return { withDocs, withoutDocs };
  }

  function renderDocsArchiveSummary() {
    const el = document.getElementById('documents-archive-summary');
    if (!el) return;
    const real = realUsers.filter(u => u.status !== 'deleted');
    if (!real.length) {
      el.innerHTML = `<span style="color:var(--gray-txt)">Aucun acteur réel enregistré pour le moment.</span>`;
      return;
    }
    const { withoutDocs } = archiveCheck(real);
    el.innerHTML = !withoutDocs.length
      ? `<span style="color:var(--green);font-weight:700;">✅ Tous les acteurs réels (${real.length}) ont au moins un document archivé.</span>`
      : `<span style="color:var(--danger);font-weight:700;">⚠️ ${withoutDocs.length}/${real.length} acteur(s) réel(s) n'ont AUCUN document archivé — à vérifier avant toute réinitialisation.</span>`;
  }

  function renderDocuments() {
    let list = users.filter(u => u.status !== 'deleted');
    if (docSearchTerm) {
      const t = docSearchTerm.toLowerCase();
      list = list.filter(u => (fullName(u) + ' ' + (u.club || u.nomOrganisation || '')).toLowerCase().includes(t));
    }
    const tbody = document.getElementById('documents-tbody');
    if (!tbody) { renderDocsArchiveSummary(); return; }
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray-txt)">Aucun acteur trouvé.</td></tr>`;
      renderDocsArchiveSummary();
      return;
    }
    tbody.innerHTML = list.map(u => {
      const docs = u.documents || [];
      const docsHtml = docs.length
        ? docs.map((d, i) => `
            <div class="doc-chip" style="display:inline-flex;align-items:center;gap:6px;border:1px solid var(--gray-bd);border-radius:8px;padding:3px 8px;margin:2px 4px 2px 0;font-size:12px;">
              <a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.label || 'Document')}</a>${d.locked ? ' 🔒' : ''}
              ${u.isDemo ? '' : `<button class="btn-sm danger" title="Supprimer" onclick="window.AdminController_deleteDocument('${u.id}', ${i})">✕</button>`}
            </div>`).join('')
        : `<span style="color:var(--danger);font-weight:700;">⚠️ aucun document</span>`;
      return `
        <tr class="${u.isDemo ? 'is-demo-row' : ''}">
          <td data-label="Acteur">${esc(fullName(u))}${u.isDemo ? '<span class="demo-pill">DÉMO</span>' : ''}</td>
          <td data-label="Rôle">${esc(ROLE_LABELS[u.role] || u.role || '—')}</td>
          <td data-label="Documents archivés">${docsHtml}</td>
          <td data-label="Actions">${docs.length} doc(s)</td>
        </tr>`;
    }).join('');
    renderDocsArchiveSummary();
  }

  function getUserDocs(uid) {
    return users.find(u => u.id === uid)?.documents || [];
  }

  async function deleteDocument(uid, idx) {
    const target = users.find(x => x.id === uid);
    if (target?.isDemo) return;
    const docs = getUserDocs(uid);
    const d = docs[idx];
    if (!d) return;
    if (d.locked) { toast('Document sous contrat — suppression bloquée', 'warn'); return; }
    if (!confirm('Supprimer ce document ?')) return;
    const updated = docs.filter((_, i) => i !== idx);
    try {
      await window.db.collection('users').doc(uid).update({ documents: updated });
      toast('Document supprimé', 'success');
      renderDocuments();
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }

  window.AdminController_deleteDocument = deleteDocument;

  async function executeReset() {
    const coll = document.getElementById('reset-collection-select').value;
    const confirmInput = document.getElementById('reset-confirm-input').value.trim();
    if (confirmInput !== 'SUPPRIMER') { toast('Tapez exactement SUPPRIMER pour confirmer', 'warn'); return; }
    if (!confirm('Dernière confirmation : supprimer TOUS les documents ? Cette action est irréversible.')) return;
    try {
      toast('Réinitialisation en cours…', 'info');
      const snap = await window.db.collection(coll).get();
      const docs = snap.docs;
      const BATCH_SIZE = 450;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = window.db.batch();
        docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      document.getElementById('reset-confirm-input').value = '';
      toast(coll + ' réinitialisé (' + docs.length + ' doc(s) supprimé(s))', 'success');
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }

  /* ═══ NOUVEAU CYCLE — RÉINITIALISATION DES ACTEURS ═══ */
  let resetSelectedRoles = new Set();

  function renderResetRoleChips() {
    const wrap = document.getElementById('reset-role-list');
    if (!wrap) return;
    const real = realUsers.filter(u => u.status !== 'deleted');
    wrap.innerHTML = DASH_ROLES.map(r => {
      const count = real.filter(u => u.role === r).length;
      const active = resetSelectedRoles.has(r) ? ' active' : '';
      return `<button type="button" class="filter-btn reset-role-chip${active}" data-role="${r}">${ROLE_LABELS[r] || r} (${count})</button>`;
    }).join('');
    wrap.querySelectorAll('.reset-role-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = btn.dataset.role;
        if (resetSelectedRoles.has(r)) { resetSelectedRoles.delete(r); btn.classList.remove('active'); }
        else { resetSelectedRoles.add(r); btn.classList.add('active'); }
        updateResetScopeSummary();
      });
    });
    updateResetScopeSummary();
  }

  function getResetTargets(scope) {
    const real = realUsers.filter(u => u.status !== 'deleted');
    return scope === 'general' ? real : real.filter(u => resetSelectedRoles.has(u.role));
  }

  function updateResetScopeSummary() {
    const partialBtn = document.getElementById('btn-reset-partial');
    const summaryEl = document.getElementById('reset-scope-summary');
    if (summaryEl) {
      summaryEl.textContent = resetSelectedRoles.size
        ? `${getResetTargets('partial').length} acteur(s) réel(s) concerné(s) (catégories : ${[...resetSelectedRoles].map(r => ROLE_LABELS[r] || r).join(', ')})`
        : 'Sélectionnez au moins une catégorie pour une réinitialisation partielle.';
    }
    if (partialBtn) partialBtn.disabled = resetSelectedRoles.size === 0;
    const statusEl = document.getElementById('reset-archive-status');
    if (statusEl) statusEl.innerHTML = '';
  }

  function renderArchiveStatus(targetUsers) {
    const statusEl = document.getElementById('reset-archive-status');
    if (!statusEl) return;
    if (!targetUsers.length) {
      statusEl.innerHTML = `<span style="color:var(--gray-txt)">Aucun acteur dans le périmètre actuel.</span>`;
      return;
    }
    const { withDocs, withoutDocs } = archiveCheck(targetUsers);
    let html = `<div style="margin-bottom:6px;"><strong>${withDocs.length}/${targetUsers.length}</strong> acteur(s) du périmètre ont au moins un document archivé.</div>`;
    if (withoutDocs.length) {
      html += `<div style="color:var(--danger);font-weight:700;margin-bottom:4px;">⚠️ ${withoutDocs.length} acteur(s) SANS AUCUN document — leurs données seront perdues définitivement :</div>`;
      html += `<ul style="margin:0 0 4px 18px;padding:0;max-height:140px;overflow-y:auto;">${withoutDocs.map(u => `<li>${esc(fullName(u))} — ${esc(u.email || u.telephone || 'aucun contact')}</li>`).join('')}</ul>`;
    } else {
      html += `<div style="color:var(--green);font-weight:700;">✅ Tous les acteurs du périmètre ont au moins un document archivé.</div>`;
    }
    statusEl.innerHTML = html;
  }

  async function executeActorReset(scope) {
    const targets = getResetTargets(scope);
    if (!targets.length) {
      toast(scope === 'general' ? 'Aucun acteur réel à réinitialiser' : 'Sélectionnez au moins une catégorie', 'warn');
      return;
    }
    const confirmInput = document.getElementById('reset-actors-confirm-input').value.trim();
    if (confirmInput !== 'SUPPRIMER') { toast('Tapez exactement SUPPRIMER pour confirmer', 'warn'); return; }

    const { withoutDocs } = archiveCheck(targets);
    if (withoutDocs.length) {
      const proceed = confirm(`⚠️ ${withoutDocs.length} acteur(s) sur ${targets.length} n'ont AUCUN document archivé. Leurs données seront perdues définitivement et irrémédiablement. Continuer quand même ?`);
      if (!proceed) return;
    }

    const label = scope === 'general'
      ? `TOUS les acteurs réels (${targets.length}) et leurs coordonnées`
      : `les acteurs des catégories sélectionnées (${targets.length}) et leurs coordonnées`;
    if (!confirm(`Dernière confirmation : supprimer définitivement ${label} ? Cette action est irréversible.`)) return;

    try {
      toast('Réinitialisation en cours…', 'info');
      const BATCH_SIZE = 450;
      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = window.db.batch();
        targets.slice(i, i + BATCH_SIZE).forEach(u => batch.delete(window.db.collection('users').doc(u.id)));
        await batch.commit();
      }
      document.getElementById('reset-actors-confirm-input').value = '';
      resetSelectedRoles.clear();
      toast(`${targets.length} acteur(s) réinitialisé(s)`, 'success');
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }

  function wireResetActorsTools() {
    renderResetRoleChips();
    document.getElementById('btn-verify-archives')?.addEventListener('click', () => {
      const scope = resetSelectedRoles.size ? 'partial' : 'general';
      renderArchiveStatus(getResetTargets(scope));
    });
    document.getElementById('btn-reset-general')?.addEventListener('click', () => executeActorReset('general'));
    document.getElementById('btn-reset-partial')?.addEventListener('click', () => executeActorReset('partial'));
  }

  /* ═══ MODALES & DIVERS ═══ */
  function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
  }

  function ensureDeleteButton(modalId, actionsClass, onClick, hide) {
    const modal = document.getElementById(modalId);
    const actions = modal?.querySelector('.' + actionsClass);
    if (!actions) return;
    let btn = actions.querySelector('.btn-dynamic-delete');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'btn btn-danger btn-dynamic-delete';
      btn.textContent = '🗑️ Supprimer';
      actions.appendChild(btn);
    }
    btn.onclick = onClick;
    btn.style.display = hide ? 'none' : '';
  }

  function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function wireModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
      overlay.querySelector('.modal-close')?.addEventListener('click', () => overlay.classList.remove('open'));
    });
    const playerModal = document.getElementById('player-modal');
    playerModal?.querySelector('.btn-primary')?.addEventListener('click', savePlayer);
    playerModal?.querySelector('.btn-secondary')?.addEventListener('click', () => closeModal('player-modal'));

    const matchModal = document.getElementById('match-modal');
    matchModal?.querySelector('.btn-primary')?.addEventListener('click', saveMatch);
    matchModal?.querySelector('.btn-secondary')?.addEventListener('click', () => closeModal('match-modal'));
    document.getElementById('btn-delete-match')?.addEventListener('click', deleteMatch);

    document.getElementById('doc-search-input')?.addEventListener('input', (e) => { docSearchTerm = e.target.value; renderDocuments(); });
    document.getElementById('btn-print-documents')?.addEventListener('click', () => window.print());
    document.getElementById('btn-execute-reset')?.addEventListener('click', executeReset);

    document.getElementById('logout-btn')?.addEventListener('click', () => {
      if (!confirm('Se déconnecter ?')) return;
      window.realtimeSync?.stopAll();
      localStorage.removeItem('gsc_admin_session');
      window.location.href = 'index.html';
    });
  }

  /* ═══ INITIALISATION ═══ */
  function init() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    wireNav();
    wireQuickActions();
    wirePlayerFilters();
    wirePhotoFilters();
    wireMatchTabs();
    wireModals();
    wireResetActorsTools();

    // Affichage immédiat avec le seed (même pattern que index.html) :
    // on ne dépend pas d'un aller-retour Firestore réussi pour montrer des chiffres.
    users = mergeWithDemo([]);
    renderDashboard();

    window.realtimeSync.onUpdate('users', (data) => {
      realUsers = data;
      users = mergeWithDemo(data);
      renderDashboard();
      renderResetRoleChips();
      const active = document.querySelector('.section.active');
      if (active) {
        if (active.id === 'joueurs') renderPlayers();
        if (active.id === 'photos') renderPhotos();
        if (active.id === 'documents') renderDocuments();
      }
    });
    window.realtimeSync.onUpdate('matchs', (data) => {
      matchs = data;
      renderDashboard();
      if (document.getElementById('matchs')?.classList.contains('active')) renderMatches();
    });
  }

  if (window._firebaseReady) init();
  else document.addEventListener('firebase-ready', init);
  window.addEventListener('firebase-init-error', () => {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    toast('Connexion Firebase impossible — vérifiez votre réseau', 'error');
  });
})();
