/* ═══════════════════════════════════════════════════════════════
   ADMIN-CONTROLLER.JS — Logique du panneau GSC Admin AMÉLIORÉ
   • Toutes les catégories d'acteurs (écoles/universités ajoutées)
   • Comptage cohérent avec index.html
   • Navigation responsive sans débordement
   • Modes d'affichage (grille/liste/compact)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  /* ── Pont d'authentification Firebase ──────────────────────────────────────
     Toutes les écritures Firestore passent par withAuth() pour garantir que
     Firebase Auth a un uid valide (request.auth != null dans les règles Firestore).
     Le pont est défini dans admin.html via ensureFirebaseAuthViaSupabase().
  ────────────────────────────────────────────────────────────────────────── */
  async function withAuth(fn) {
    if (typeof window.ensureFirebaseAuthViaSupabase === 'function') {
      try { await window.ensureFirebaseAuthViaSupabase(); }
      catch (e) { console.warn('[GSC Admin] withAuth — pont Firebase indisponible :', e); }
    }
    return fn();
  }

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
  const NIVEAU_ORDER = ['International', 'National', 'Regional', 'Amateur'];
  const SECONDARY_GROUP_CONFIG = {
    joueur: { getKey: a => a.club || a.nomOrganisation, label: v => '🏟️ ' + v, fallback: 'Sans club' },
    entraineur: { getKey: a => a.niveau, label: v => '🏆 Niveau ' + v, fallback: 'Niveau non précisé', order: NIVEAU_ORDER },
    arbitre: { getKey: a => a.niveau, label: v => '🏆 Niveau ' + v, fallback: 'Niveau non précisé', order: NIVEAU_ORDER },
    club: { getKey: a => a.division || a.niveau, label: v => '📊 Division ' + v, fallback: 'Division non précisée', order: NIVEAU_ORDER },
    organisateur: { getKey: a => a.province || a.ville, label: v => '📍 ' + v, fallback: 'Localisation non précisée' },
    independant: { getKey: a => a.province || a.ville, label: v => '📍 ' + v, fallback: 'Localisation non précisée' },
    association: { getKey: a => a.province || a.ville, label: v => '📍 ' + v, fallback: 'Localisation non précisée' },
    federation: { getKey: a => a.niveau || 'National', label: v => '🏛️ ' + v, fallback: 'Niveau non précisé', order: NIVEAU_ORDER },
    eleve_etudiant: { getKey: a => a.etablissement, label: v => '🎓 ' + v, fallback: 'Établissement non précisé' },
    sportif_etranger: { getKey: a => a.nationalite, label: v => '🌍 ' + v, fallback: 'Nationalité non précisée' },
    supporter: { getKey: a => a.club || a.ville, label: v => '💗 ' + v, fallback: 'Non précisé' }
  };

  function buildSecondaryGroups(list, role) {
    const cfg = SECONDARY_GROUP_CONFIG[role];
    if (!cfg) return null;
    const buckets = {};
    list.forEach(a => {
      const raw = (cfg.getKey(a) || '').toString().trim();
      const key = raw || cfg.fallback;
      (buckets[key] = buckets[key] || []).push(a);
    });
    const keys = Object.keys(buckets);
    if (keys.length <= 1) return null;
    if (cfg.order) {
      keys.sort((x, y) => {
        const ix = cfg.order.indexOf(x), iy = cfg.order.indexOf(y);
        if (ix === -1 && iy === -1) return x.localeCompare(y, 'fr');
        if (ix === -1) return 1;
        if (iy === -1) return -1;
        return ix - iy;
      });
    } else {
      keys.sort((x, y) => x === cfg.fallback ? 1 : (y === cfg.fallback ? -1 : x.localeCompare(y, 'fr')));
    }
    return keys.map(k => ({
      label: cfg.label(k),
      items: buckets[k].sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr'))
    }));
  }

  let users = [], matchs = [];
  let realUsers = [];
  let sites = [], actualites = [];
  let currentSiteId = null;
  let roleFilter = 'all', searchTerm = '';
  let statusFilter = null; // null = tous statuts, 'active' = filtre ACTIFS depuis les tuiles
  let docRoleFilter = 'all';
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
      const labels = { dashboard: 'Dashboard', joueurs: 'Joueurs', photos: 'Photos & Logos', matchs: 'Matchs', rapports: 'Rapports', documents: 'Documents', verification: 'Vérification', sites: 'Sites sportifs', actualites: 'Actualités', carte: 'Carte des sites' };
      titleEl.firstChild.textContent = labels[name] || name;
    }
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');

    if (name === 'joueurs') renderPlayers();
    if (name === 'photos') renderPhotos();
    if (name === 'matchs') renderMatches();
    if (name === 'documents') renderDocuments();
    if (name === 'dashboard') renderDashboard();
    if (name === 'sites') renderSites();
    if (name === 'actualites') renderActualites();
  }

  function wireNav() {
    ['dashboard', 'joueurs', 'photos', 'matchs', 'documents', 'sites', 'actualites'].forEach(name => {
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
    document.getElementById('nav-goto-index')?.addEventListener('click', () => { window.location.href = 'index.html'; });
    document.getElementById('header-menu-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('header-dropdown')?.classList.toggle('open');
    });
    document.getElementById('hdd-goto-index')?.addEventListener('click', () => { window.location.href = 'index.html'; });
    document.getElementById('hdd-goto-admin')?.addEventListener('click', () => { window.location.href = 'admin.html'; document.getElementById('header-dropdown')?.classList.remove('open'); });
    document.addEventListener('click', (e) => {
      const dd = document.getElementById('header-dropdown');
      if (dd && dd.classList.contains('open') && !dd.contains(e.target) && e.target.id !== 'header-menu-toggle') dd.classList.remove('open');
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
      return `<div class="sb-item clickable" style="cursor:pointer;" onclick="window.gscGoToFiltered({roles:'${r}', title:'Gestion des Acteurs'})"><div class="sb-label"><span>${ROLE_LABELS[r] || r}</span><span style="color:${ROLE_COLORS[r] || '#64748b'}">${count}</span></div><div class="sb-track"><div class="sb-fill" style="width:${pct}%;background:${ROLE_COLORS[r] || '#64748b'}"></div></div></div>`;
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
    if (Array.isArray(filter)) return filter.includes(u.role);
    if (filter === 'supporter') return u.role === 'supporter' || u.isSupporter === true;
    return u.role === filter;
  }

  function renderPlayers() {
    let list = users.filter(u => u.status !== 'deleted');
    if (statusFilter) list = list.filter(u => (u.status || 'active') === statusFilter);
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

    let qrRowIdx = 0;
    const renderRow = (u) => {
      const uid = u.uid || u.id;
      const role = u.role || 'joueur';
      const gscId = u.gscId || (window.gscGenerateId ? window.gscGenerateId(uid, role) : ('GSC-' + (uid || '').slice(0, 6).toUpperCase()));
      const qrIdx = qrRowIdx++;
      return `
      <tr data-id="${u.id}" class="${u.isDemo ? 'is-demo-row' : ''}">
        <td data-label="ID"><span class="user-gscid-cell">${esc(gscId)}</span></td>
        <td data-label="Membre"><div class="user-name-cell"><div class="user-row-avatar">${u.photoURL ? `<img src="${esc(u.photoURL)}">` : esc(fullName(u).charAt(0).toUpperCase())}</div><span class="user-name-txt">${esc(fullName(u))}</span>${u.isDemo ? '<span class="demo-pill">DÉMO</span>' : ''}</div></td>
        <td data-label="Rôle">${esc(ROLE_LABELS[u.role] || u.titrePersonnalise || u.role || '—')}</td>
        <td data-label="Club/Org">${esc(u.club || u.nomOrganisation || u.nomEtablissement || '—')}</td>
        <td data-label="QR"><div class="user-qr-cell" title="QR Code d'identification" data-uid="${esc(uid)}" id="row-qr-${qrIdx}"><canvas id="row-qr-canvas-${qrIdx}" width="26" height="26"></canvas></div></td>
        <td data-label="Statut"><span class="status-badge status-${u.status || 'active'}">${({ active: 'Actif', pending: 'En attente', hidden: 'Masqué', deleted: 'Supprimé' })[u.status || 'active'] || 'Actif'}</span></td>
      </tr>`;
    };

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
        html += `<tr class="group-header-row"><td colspan="6"><span class="group-header-label">${ROLE_LABELS[role] || role}</span><span class="group-header-count">${groupList.length}</span></td></tr>`;
        html += groupList.map(renderRow).join('');
      });
      Object.keys(buckets).forEach(role => {
        if (seen.has(role)) return;
        const groupList = buckets[role];
        html += `<tr class="group-header-row"><td colspan="6"><span class="group-header-label">👤 ${esc(role)}</span><span class="group-header-count">${groupList.length}</span></td></tr>`;
        html += groupList.map(renderRow).join('');
      });
      tbody.innerHTML = html;
    } else {
      const sGroups = buildSecondaryGroups(list, roleFilter);
      if (sGroups) {
        let html = '';
        sGroups.forEach(g => {
          html += `<tr class="group-header-row"><td colspan="6"><span class="group-header-label">${g.label}</span><span class="group-header-count">${g.items.length}</span></td></tr>`;
          html += g.items.map(renderRow).join('');
        });
        tbody.innerHTML = html;
      } else {
        list.sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr'));
        tbody.innerHTML = list.map(renderRow).join('');
      }
    }

    // Rendu des mini QR codes par ciblage DOM (cohérent avec index.html)
    if (window.gscDrawQrOnCanvas) {
      tbody.querySelectorAll('.user-qr-cell').forEach(cell => {
        const canvas = cell.querySelector('canvas');
        const targetUid = cell.dataset.uid;
        if (!canvas || !targetUid) return;
        const url = window.gscBuildQrUrl ? window.gscBuildQrUrl(targetUid) : (location.origin + location.pathname.replace(/admin\.html$/, 'index.html') + '?actor=' + encodeURIComponent(targetUid));
        window.gscDrawQrOnCanvas(canvas, url, 26);
      });
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
        statusFilter = null;
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
      await withAuth(() => window.db.collection('users').doc(id).update(updates));
      toast('Acteur mis à jour', 'success');
      closeModal('player-modal');
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }

  async function deletePlayer(id) {
    if (!confirm('Supprimer ce profil ? Cette action est irréversible.')) return;
    try {
      await withAuth(() => window.db.collection('users').doc(id).update({ status: 'deleted' }));
      toast('Profil supprimé', 'success');
      closeModal('player-modal');
      renderPlayers();
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }

  /* ═══ PHOTOS & LOGOS — cadres d'import ═══ */
  let defaultAvatars = {}; // { role: url } — photo/logo par défaut par catégorie (admin)
  let actorPhotoUploadTargetUid = null;
  let defaultAvatarUploadTargetRole = null;
  let photoUploadBusyId = null; // uid ou role en cours d'upload (pour afficher le spinner)

  function photoFrameContent(url, fallbackIcon) {
    if (url) return `style="background-image:url('${esc(url)}')"`;
    return '';
  }

  function renderPhotos() {
    const allReal = users.filter(u => u.status !== 'deleted');
    let list = allReal;
    if (phFilter !== 'all') list = list.filter(u => matchesRoleFilter(u, phFilter));

    // Statistiques globales (indépendantes du filtre actif, comme l'indique le libellé "Acteurs")
    const withPhoto = allReal.filter(u => u.photoURL).length;
    const total = allReal.length;
    const rate = total ? Math.round((withPhoto / total) * 100) : 0;
    const elTotal = document.getElementById('ph-stat-total');
    const elPhotos = document.getElementById('ph-stat-photos');
    const elRate = document.getElementById('ph-stat-rate');
    if (elTotal) elTotal.textContent = total;
    if (elPhotos) elPhotos.textContent = withPhoto;
    if (elRate) elRate.textContent = rate + '%';

    const grid = document.getElementById('photos-grid');
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--gray-txt);">Aucun acteur dans cette catégorie.</div>`;
      return;
    }
    grid.innerHTML = list.map(u => {
      const uid = u.uid || u.id;
      const gscId = u.gscId || (window.gscGenerateId ? window.gscGenerateId(uid, u.role || 'joueur') : '');
      const photoUrl = u.photoURL || defaultAvatars[u.role] || '';
      const isUploading = photoUploadBusyId === uid;
      const disabledAttr = u.isDemo ? 'style="cursor:not-allowed;opacity:.6" title="Fiche de démonstration — import désactivé"' : `onclick="window.AdminController_triggerActorPhotoUpload('${uid}')"`;
      return `
      <div class="photo-card" data-id="${u.id}">
        <div class="photo-frame ${photoUrl ? 'has-photo' : ''}" ${photoUrl ? `style="background-image:url('${esc(photoUrl)}')"` : ''} ${disabledAttr}>
          ${!photoUrl ? `<span class="photo-placeholder">${(ROLE_LABELS[u.role] || '👤').split(' ')[0]}</span>` : ''}
          ${!u.isDemo ? `<div class="photo-overlay"><span class="photo-overlay-btn">📤 ${photoUrl ? 'Changer' : 'Importer'}</span></div>` : ''}
          ${isUploading ? `<div class="photo-uploading">⏳ Envoi…</div>` : ''}
        </div>
        <div class="photo-info">
          <div class="photo-name">${esc(fullName(u))}</div>
          <div class="photo-role">${ROLE_LABELS[u.role] || u.role}${gscId ? ' · ' + esc(gscId) : ''}</div>
        </div>
      </div>
    `;
    }).join('');
  }

  function renderDefaultAvatars() {
    const grid = document.getElementById('default-avatars-grid');
    if (!grid) return;
    grid.innerHTML = DASH_ROLES.map(role => {
      const url = defaultAvatars[role] || '';
      const isUploading = photoUploadBusyId === ('default:' + role);
      const label = ROLE_LABELS[role] || role;
      return `
      <div class="photo-card default-avatar-card" data-role="${role}">
        <div class="photo-frame ${url ? 'has-photo' : ''}" ${url ? `style="background-image:url('${esc(url)}')"` : ''} onclick="window.AdminController_triggerDefaultAvatarUpload('${role}')">
          ${!url ? `<span class="photo-placeholder">${label.split(' ')[0]}</span>` : ''}
          <div class="photo-overlay"><span class="photo-overlay-btn">📤 ${url ? 'Changer' : 'Importer'}</span></div>
          ${isUploading ? `<div class="photo-uploading">⏳ Envoi…</div>` : ''}
        </div>
        <div class="photo-info">
          <div class="photo-role">${esc(label)}</div>
          <div class="admin-only-badge">🔒 ADMIN</div>
        </div>
      </div>`;
    }).join('');
  }

  async function loadDefaultAvatars() {
    try {
      if (!window.db) return;
      const snap = await window.db.collection('settings').doc('defaultAvatars').get();
      defaultAvatars = (snap.exists && snap.data()) || {};
    } catch (e) {
      console.warn('Chargement photos par défaut impossible :', e);
      defaultAvatars = defaultAvatars || {};
    }
    renderDefaultAvatars();
    renderPhotos();
  }

  /* ─── Upload via Cloudinary (Firebase Storage indisponible sur plan Spark) ───
     Cloud name + upload preset (non signé) — voir console.cloudinary.com */
  const CLOUDINARY_CLOUD_NAME = 'djvzc3vqp';
  const CLOUDINARY_UPLOAD_PRESET = 'gsc_admin_uploads';

  function pickAndUpload(input, onFile) {
    input.accept = ''; // tous formats acceptés
    input.value = '';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (file) {
        if (file.size > 100 * 1024 * 1024) { // 100 Mo max
          toast('❌ Fichier trop volumineux (max 100 Mo).', 'error');
          return;
        }
        onFile(file);
      }
    };
    input.click();
  }

  function createProgressBar() {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 10000;
      min-width: 300px;
      max-width: 90vw;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      font-weight: 600;
      margin-bottom: 12px;
      color: #0A1628;
      font-size: 14px;
    `;
    title.className = 'progress-title';
    title.textContent = '⏳ Envoi en cours...';

    const barContainer = document.createElement('div');
    barContainer.style.cssText = `
      background: #E2E8F0;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    `;

    const bar = document.createElement('div');
    bar.style.cssText = `
      background: linear-gradient(90deg, #009E60, #00C78F);
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
      border-radius: 4px;
    `;
    bar.className = 'progress-fill';

    const percent = document.createElement('div');
    percent.style.cssText = `
      text-align: center;
      font-size: 12px;
      color: #64748B;
      font-weight: 500;
    `;
    percent.className = 'progress-percent';
    percent.textContent = '0%';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Annuler';
    cancelBtn.className = 'progress-cancel-btn';
    cancelBtn.style.cssText = `
      display: block;
      margin: 14px auto 0;
      background: #f1f5f9;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      color: #475569;
      cursor: pointer;
    `;

    barContainer.appendChild(bar);
    container.appendChild(title);
    container.appendChild(barContainer);
    container.appendChild(percent);
    container.appendChild(cancelBtn);

    return container;
  }

  function updateProgressBar(progressBar, percentage) {
    const bar = progressBar.querySelector('.progress-fill');
    const percent = progressBar.querySelector('.progress-percent');
    if (bar) bar.style.width = percentage + '%';
    if (percent) percent.textContent = Math.round(percentage) + '%';
  }

  function removeProgressBar(progressBar) {
    if (progressBar && progressBar.parentNode) {
      progressBar.parentNode.removeChild(progressBar);
    }
  }

  /**
   * Upload un fichier vers Cloudinary (preset non signé) avec barre de
   * progression en temps réel, timeout de sécurité et messages d'erreur clairs.
   * @param {File} file
   * @param {string} folderPath - ex: "profiles/photos/UID" ou "defaults/avatars/role"
   * @returns {Promise<string|null>} URL sécurisée du fichier, ou null en cas d'échec
   */
  function doUpload(file, folderPath) {
    return new Promise((resolve) => {
      const progressBar = createProgressBar();
      document.body.appendChild(progressBar);
      const titleEl = progressBar.querySelector('.progress-title');
      let settled = false;

      const xhr = new XMLHttpRequest();
      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        xhr.abort();
        if (titleEl) titleEl.textContent = '⚠️ Aucune réponse du serveur après 20s';
        toast('❌ Upload bloqué : aucune réponse de Cloudinary après 20s. Vérifiez votre connexion réseau.', 'error');
        removeProgressBar(progressBar);
        resolve(null);
      }, 20000);

      const cancelBtn = progressBar.querySelector('.progress-cancel-btn');
      if (cancelBtn) cancelBtn.onclick = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        xhr.abort();
        removeProgressBar(progressBar);
        resolve(null);
      };

      xhr.upload.addEventListener('progress', (e) => {
        if (settled || !e.lengthComputable) return;
        updateProgressBar(progressBar, (e.loaded / e.total) * 100);
      });

      xhr.addEventListener('load', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        removeProgressBar(progressBar);
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
            toast('✅ Fichier uploadé avec succès !', 'success');
            resolve(data.secure_url);
          } else {
            const msg = (data.error && data.error.message) ? data.error.message : `Code HTTP ${xhr.status}`;
            console.error('Cloudinary upload error:', data);
            toast('❌ Erreur upload : ' + msg, 'error');
            resolve(null);
          }
        } catch (e) {
          console.error('Cloudinary response parse error:', e, xhr.responseText);
          toast('❌ Réponse Cloudinary invalide.', 'error');
          resolve(null);
        }
      });

      xhr.addEventListener('error', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        removeProgressBar(progressBar);
        toast('❌ Erreur réseau pendant l\'upload. Vérifiez votre connexion.', 'error');
        resolve(null);
      });

      xhr.addEventListener('abort', () => {
        // déjà géré par le timeout ou le bouton Annuler
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', folderPath);

      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  function triggerActorPhotoUpload(uid) {
    const u = users.find(x => (x.uid || x.id) === uid);
    if (!u || u.isDemo) return;
    const input = document.getElementById('actor-photo-input');
    if (!input) return;
    pickAndUpload(input, async (file) => {
      photoUploadBusyId = uid;
      renderPhotos();
      try {
        const url = await doUpload(file, `profiles/photos/${uid}`);
        if (!url) { photoUploadBusyId = null; renderPhotos(); return; }
        await withAuth(() => window.db.collection('users').doc(u.id).update({ photoURL: url }));
        toast('Photo mise à jour', 'success');
      } catch (e) {
        toast('Erreur upload : ' + e.message, 'error');
      } finally {
        photoUploadBusyId = null;
        renderPhotos();
      }
    });
  }

  function triggerDefaultAvatarUpload(role) {
    const input = document.getElementById('default-avatar-input');
    if (!input) return;
    pickAndUpload(input, async (file) => {
      photoUploadBusyId = 'default:' + role;
      renderDefaultAvatars();
      try {
        const url = await doUpload(file, `defaults/avatars/${role}`);
        if (!url) { photoUploadBusyId = null; renderDefaultAvatars(); return; }
        defaultAvatars[role] = url;
        await withAuth(() => window.db.collection('settings').doc('defaultAvatars').set(defaultAvatars, { merge: true }));
        toast('Photo/logo par défaut mis à jour pour cette catégorie', 'success');
        renderPhotos();
      } catch (e) {
        toast('Erreur upload : ' + e.message, 'error');
      } finally {
        photoUploadBusyId = null;
        renderDefaultAvatars();
      }
    });
  }

  window.AdminController_triggerActorPhotoUpload = triggerActorPhotoUpload;
  window.AdminController_triggerDefaultAvatarUpload = triggerDefaultAvatarUpload;

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
        await withAuth(() => window.db.collection('matchs').doc(currentMatchId).update(data));
        toast('Match mis à jour', 'success');
      } else {
        await withAuth(() => window.db.collection('matchs').add({ ...data, createdAt: new Date() }));
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
      await withAuth(() => window.db.collection('matchs').doc(currentMatchId).update({ status: 'deleted' }));
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
    if (docRoleFilter !== 'all') list = list.filter(u => matchesRoleFilter(u, docRoleFilter));
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
          <td data-label="Acteur"><span class="user-gscid-cell" style="margin-right:8px;">${esc(u.gscId || (window.gscGenerateId ? window.gscGenerateId(u.uid || u.id, u.role || 'joueur') : ''))}</span>${esc(fullName(u))}${u.isDemo ? '<span class="demo-pill">DÉMO</span>' : ''}</td>
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
      await withAuth(() => window.db.collection('users').doc(uid).update({ documents: updated }));
      toast('Document supprimé', 'success');
      renderDocuments();
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }

  // Alias global de sécurité — certains éléments du DOM (tuiles, cartes) appellent
  // showSection(...) directement ; on l'expose ici pour éviter toute erreur silencieuse.
  window.showSection = switchSection;

  window.AdminController_deleteDocument = deleteDocument;

  // Helper global utilisé par les tuiles/cartes cliquables du Dashboard et des Rapports
  // pour naviguer vers la section Joueurs avec un filtre de rôle (simple ou multiple) et/ou de statut.
  window.gscGoToFiltered = function (opts) {
    opts = opts || {};
    roleFilter = opts.roles || 'all';
    statusFilter = opts.status || null;
    searchTerm = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    if (typeof switchSection === 'function') switchSection('joueurs');
    document.querySelectorAll('#joueurs .filter-btn').forEach(b => b.classList.remove('active'));
    if (typeof roleFilter === 'string') {
      const sel = roleFilter === 'all' ? '.role-all' : '.role-' + roleFilter;
      const btn = document.querySelector('#joueurs .filter-btn' + sel);
      if (btn) btn.classList.add('active');
    }
    renderPlayers();
    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle && topbarTitle.firstChild) topbarTitle.firstChild.textContent = opts.title || 'Gestion des Acteurs';
  };

  // Helper global utilisé par la tuile MATCHS / cartes Rapports pour aller à la section Matchs.
  window.gscGoToMatches = function () {
    if (typeof switchSection === 'function') switchSection('matchs');
    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle && topbarTitle.firstChild) topbarTitle.firstChild.textContent = 'Gestion des Matchs';
  };

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
        await withAuth(() => batch.commit());
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
        await withAuth(() => batch.commit());
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
    document.querySelectorAll('#documents .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#documents .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const m = btn.className.match(/role-(\w+)/);
        docRoleFilter = (m && m[1] !== 'all') ? m[1] : 'all';
        renderDocuments();
      });
    });
    document.getElementById('btn-print-documents')?.addEventListener('click', () => window.print());
    document.getElementById('btn-execute-reset')?.addEventListener('click', executeReset);

    document.getElementById('logout-btn')?.addEventListener('click', () => {
      if (!confirm('Se déconnecter ?')) return;
      window.realtimeSync?.stopAll();
      localStorage.removeItem('gsc_admin_session');
      window.location.href = 'index.html';
    });
  }

  /* ═══ SITES SPORTIFS ═══ */
  const SITE_ICONS = { Stade: '🏟️', Gymnase: '🏋️', Piscine: '🏊', Court: '🎾', Dojo: '🥋', Salle: '🏸', Terrain: '⛳', Piste: '🏃' };
  let sitesSearchTerm = '';

  function renderSites() {
    const tbody = document.getElementById('sites-tbody');
    if (!tbody) return;
    let list = sites.slice();
    if (sitesSearchTerm) {
      const t = sitesSearchTerm.toLowerCase();
      list = list.filter(s => ((s.nom || '') + ' ' + (s.ville || '')).toLowerCase().includes(t));
    }
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--gray-txt);padding:16px;">Aucun site enregistré.</td></tr>`;
      return;
    }
    list.sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));
    tbody.innerHTML = list.map(s => `
      <tr data-id="${s.id}">
        <td data-label="Site">${SITE_ICONS[s.type] || '📍'} ${esc(s.nom || '—')}</td>
        <td data-label="Type">${esc(s.type || '—')}</td>
        <td data-label="Ville">${esc(s.ville || '—')}</td>
        <td data-label="Capacité">${s.capacite ? Number(s.capacite).toLocaleString('fr-FR') : '—'}</td>
        <td data-label="Actions"><button class="btn-sm btn-edit-site" data-id="${s.id}">✏️ Modifier</button></td>
      </tr>`).join('');
    tbody.querySelectorAll('.btn-edit-site').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); openSiteModal(btn.dataset.id); }));
  }

  function openSiteModal(id) {
    currentSiteId = id || null;
    const s = id ? sites.find(x => x.id === id) : null;
    document.getElementById('site-modal-title').textContent = s ? 'Modifier le site' : 'Nouveau site sportif';
    document.getElementById('site-modal-nom').value = s?.nom || '';
    document.getElementById('site-modal-type').value = s?.type || 'Stade';
    document.getElementById('site-modal-ville').value = s?.ville || '';
    document.getElementById('site-modal-lat').value = s?.lat ?? '';
    document.getElementById('site-modal-lng').value = s?.lng ?? '';
    document.getElementById('site-modal-capacite').value = s?.capacite ?? '';
    document.getElementById('btn-delete-site').style.display = s ? '' : 'none';
    document.getElementById('site-modal')?.classList.add('open');
  }

  async function saveSiteModal() {
    const nom = document.getElementById('site-modal-nom').value.trim();
    const lat = parseFloat(document.getElementById('site-modal-lat').value);
    const lng = parseFloat(document.getElementById('site-modal-lng').value);
    if (!nom) { toast('Le nom du site est requis.', 'error'); return; }
    if (isNaN(lat) || isNaN(lng)) { toast('Latitude / longitude invalides.', 'error'); return; }
    const data = {
      nom, type: document.getElementById('site-modal-type').value,
      ville: document.getElementById('site-modal-ville').value.trim(),
      lat, lng,
      capacite: parseInt(document.getElementById('site-modal-capacite').value, 10) || 0,
      status: 'active'
    };
    try {
      if (currentSiteId) await withAuth(() => window.db.collection('sitesSportifs').doc(currentSiteId).update(data));
      else await withAuth(() => window.db.collection('sitesSportifs').add({ ...data, createdAt: new Date() }));
      toast('✅ Site enregistré.', 'success');
      closeModal('site-modal');
    } catch (e) { toast('Erreur lors de l\'enregistrement.', 'error'); }
  }

  async function deleteSiteModal() {
    if (!currentSiteId) return;
    if (!confirm('Supprimer définitivement ce site ?')) return;
    try {
      await withAuth(() => window.db.collection('sitesSportifs').doc(currentSiteId).delete());
      toast('🗑️ Site supprimé.', 'success');
      closeModal('site-modal');
    } catch (e) { toast('Erreur lors de la suppression.', 'error'); }
  }

  async function searchOsm() {
    const q = document.getElementById('osm-import-query')?.value.trim();
    const resultsEl = document.getElementById('osm-import-results');
    if (!q) { toast('Entrez un lieu à rechercher.', 'info'); return; }
    if (resultsEl) resultsEl.innerHTML = `<div style="font-size:12px;color:var(--gray-txt);padding:8px 0;">Recherche en cours…</div>`;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=ga&q=${encodeURIComponent(q)}`;
      const r = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      const results = await r.json();
      if (!results.length) { if (resultsEl) resultsEl.innerHTML = `<div style="font-size:12px;color:var(--gray-txt);padding:8px 0;">Aucun résultat OpenStreetMap pour « ${esc(q)} ».</div>`; return; }
      if (resultsEl) resultsEl.innerHTML = results.map((res, i) => `
        <div class="dash-card" style="margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="font-size:12px;"><strong>${esc(res.display_name.split(',')[0])}</strong><br><span style="color:var(--gray-txt);">${esc(res.display_name)}</span></div>
          <button class="btn-sm btn-osm-add" data-i="${i}">➕ Ajouter</button>
        </div>`).join('');
      resultsEl.querySelectorAll('.btn-osm-add').forEach(btn => btn.addEventListener('click', async () => {
        const res = results[parseInt(btn.dataset.i, 10)];
        const type = document.getElementById('osm-import-type')?.value || 'Stade';
        try {
          await withAuth(() => window.db.collection('sitesSportifs').add({
            nom: res.display_name.split(',')[0], type,
            ville: q, lat: parseFloat(res.lat), lng: parseFloat(res.lon),
            capacite: 0, status: 'active', source: 'osm', createdAt: new Date()
          }));
          toast('✅ Site importé depuis OpenStreetMap.', 'success');
        } catch (e) { toast('Erreur import OSM.', 'error'); }
      }));
    } catch (e) {
      if (resultsEl) resultsEl.innerHTML = `<div style="font-size:12px;color:var(--danger);padding:8px 0;">Service OpenStreetMap indisponible pour le moment.</div>`;
    }
  }

  /* ═══ ACTUALITÉS ═══ */
  function renderActualites() {
    const tbody = document.getElementById('news-tbody');
    if (!tbody) return;
    if (!actualites.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--gray-txt);padding:16px;">Aucune actualité publiée.</td></tr>`;
      return;
    }
    const list = actualites.slice().sort((a, b) => fmtSortDate(b) - fmtSortDate(a));
    tbody.innerHTML = list.map(n => `
      <tr data-id="${n.id}">
        <td data-label="Titre">${esc(n.titre || '—')}</td>
        <td data-label="Catégorie">${esc(n.categorie || '—')}</td>
        <td data-label="Tag">${esc(n.tag || '—')}</td>
        <td data-label="Date">${fmtDate(n.createdAt)}</td>
        <td data-label="Actions"><button class="btn-sm btn-danger btn-delete-news" data-id="${n.id}">🗑️ Supprimer</button></td>
      </tr>`).join('');
    tbody.querySelectorAll('.btn-delete-news').forEach(btn => btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Supprimer cette actualité ?')) return;
      try { await window.db.collection('actualites').doc(btn.dataset.id).delete(); toast('🗑️ Actualité supprimée.', 'success'); }
      catch (err) { toast('Erreur lors de la suppression.', 'error'); }
    }));
  }
  function fmtSortDate(n) { try { return n.createdAt?.toDate ? n.createdAt.toDate().getTime() : 0; } catch (e) { return 0; } }

  async function publishNewsAdmin() {
    const titre = document.getElementById('news-titre-admin').value.trim();
    const excerpt = document.getElementById('news-excerpt-admin').value.trim();
    if (!titre) { toast('Le titre est requis.', 'error'); return; }
    try {
      await withAuth(() => window.db.collection('actualites').add({
        titre, excerpt, categorie: document.getElementById('news-cat-admin').value,
        tag: document.getElementById('news-tag-admin').value.trim(), createdAt: new Date()
      }));
      toast('📢 Actualité publiée.', 'success');
      document.getElementById('news-titre-admin').value = '';
      document.getElementById('news-excerpt-admin').value = '';
      document.getElementById('news-tag-admin').value = '';
    } catch (e) { toast('Erreur lors de la publication.', 'error'); }
  }

  function wireSitesActualites() {
    document.getElementById('btn-add-site')?.addEventListener('click', () => openSiteModal(null));
    document.getElementById('btn-save-site')?.addEventListener('click', saveSiteModal);
    document.getElementById('btn-cancel-site')?.addEventListener('click', () => closeModal('site-modal'));
    document.getElementById('btn-delete-site')?.addEventListener('click', deleteSiteModal);
    document.getElementById('site-modal-close')?.addEventListener('click', () => closeModal('site-modal'));
    document.getElementById('sites-search-input')?.addEventListener('input', (e) => { sitesSearchTerm = e.target.value; renderSites(); });
    document.getElementById('btn-osm-search')?.addEventListener('click', searchOsm);
    document.getElementById('btn-publish-news')?.addEventListener('click', publishNewsAdmin);
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
    wireSitesActualites();
    loadDefaultAvatars();

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
    window.realtimeSync.onUpdate('sitesSportifs', (data) => {
      sites = data;
      if (document.getElementById('sites')?.classList.contains('active')) renderSites();
    });
    window.realtimeSync.onUpdate('actualites', (data) => {
      actualites = data;
      if (document.getElementById('actualites')?.classList.contains('active')) renderActualites();
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
