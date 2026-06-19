/* ═══════════════════════════════════════════════════════════════
   GSC ADMIN — Contrôleur (s'appuie sur realtime-sync-module.js)
   ═══════════════════════════════════════════════════════════════
   Hypothèses de schéma Firestore (déduites de gsc-sync-config.js
   et realtime-sync-module.js — à ajuster si vos documents réels
   utilisent d'autres noms de champs) :

   Collection "users" (joueurs/membres) :
     nom, email, telephone, role, club, status,
     photo, taille, poids, piedFort, mainDominante,
     matchsJoues, buts, passes

   Collection "matchs" :
     home, away, date, time, lieu, competition,
     scoreHome, scoreAway

   Toutes les écritures utilisent saveDocument(..., {merge:true}),
   donc aucune perte de données si vos champs réels diffèrent.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── État global ── */
  let allUsers = [];
  let allMatches = [];
  let currentRoleFilter = 'all';
  let currentPhFilter = 'all';
  let currentMatchTab = 'all';
  let editingUserId = null;
  let editingMatchId = null;
  let pendingPhotoBase64 = undefined; // undefined = inchangé, null = supprimée
  let usingFallback = false;
  let activityLog = [];

  const ROLE_LABELS = {
    joueur: '⚽ Joueur / Athlète',
    entraineur: '📋 Entraîneur',
    arbitre: '🟨 Arbitre',
    club: '🏟️ Club',
    federation: '🏛️ Fédération',
    association: '🤝 Association',
    admin: '⚙️ Administrateur'
  };
  const ROLE_COLORS = {
    joueur: '#009E60', entraineur: '#f97316', arbitre: '#8b5cf6',
    club: '#3b82f6', federation: '#f97316', association: '#e11d48'
  };
  const ROLE_BAR_ORDER = ['joueur', 'entraineur', 'arbitre', 'club', 'federation', 'association'];
  const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];

  /* ── Données de secours (utilisées seulement si Firebase est injoignable) ── */
  const FALLBACK_USERS = [
    { id: 'fallback-1', nom: 'Patrick', role: 'joueur', club: '', status: 'active' },
    { id: 'fallback-2', nom: 'Paradis okomo2', role: 'joueur', club: '', status: 'active' },
    { id: 'fallback-3', nom: 'Administrateur', role: 'admin', club: '', status: 'active' },
    { id: 'fallback-4', nom: 'ESSONO', role: 'joueur', club: '', status: 'active' },
    { id: 'fallback-5', nom: 'gabonsportconnectgsc', role: 'joueur', club: '', status: 'active' },
    { id: 'fallback-6', nom: 'Paradis okomo', role: 'joueur', club: '', status: 'active' }
  ];

  /* ═══════════════════════════════════════════════════════════
     UTILITAIRES
     ═══════════════════════════════════════════════════════════ */
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function showToast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function logActivity(text) {
    activityLog.unshift({ text, time: 'à l\'instant' });
    if (activityLog.length > 6) activityLog.pop();
    renderActivity();
  }

  function initials(name) {
    return (name || '?').trim().charAt(0).toUpperCase() || '?';
  }

  /* ═══════════════════════════════════════════════════════════
     CONNEXION FIREBASE (via realtime-sync-module.js)
     ═══════════════════════════════════════════════════════════ */
  function boot() {
    if (window.gscDb) {
      startSync(window.gscDb);
    } else {
      window.addEventListener('firebase-ready', e => startSync(e.detail.db), { once: true });
      window.addEventListener('firebase-init-error', () => {
        console.warn('[GSC-Admin] firebase-init-error reçu, passage en mode local');
        useFallback();
      }, { once: true });
      // Filet de sécurité si aucun événement n'arrive
      setTimeout(() => { if (!allUsers.length) useFallback(); }, 5000);
    }
  }

  function startSync(db) {
    if (!window.realtimeSync) {
      console.error('[GSC-Admin] realtime-sync-module.js non chargé — mode local');
      useFallback();
      return;
    }
    try {
      window.realtimeSync.initialize(db);
      window.realtimeSync.watchPlayers(users => {
        allUsers = users;
        usingFallback = false;
        setRealtimeBadge(true);
        renderAll();
      });
      window.realtimeSync.watchMatches(matches => {
        allMatches = matches;
        renderAll();
      });
      logActivity('Connexion temps réel établie');
    } catch (err) {
      console.error('[GSC-Admin] Erreur de connexion sync:', err);
      useFallback();
    }
  }

  function useFallback() {
    if (usingFallback) return;
    usingFallback = true;
    allUsers = FALLBACK_USERS.slice();
    allMatches = [];
    setRealtimeBadge(false);
    logActivity('Mode local (Firebase injoignable)');
    renderAll();
  }

  function setRealtimeBadge(live) {
    const badge = document.getElementById('realtime-status');
    if (!badge) return;
    if (live) {
      badge.innerHTML = '<div class="realtime-dot"></div><span>Temps réel</span>';
      badge.style.background = '';
      badge.style.borderColor = '';
      badge.style.color = '';
    } else {
      badge.innerHTML = '<div class="realtime-dot" style="background:var(--warn);animation:none"></div><span>Mode local</span>';
      badge.style.background = 'rgba(245,158,11,.12)';
      badge.style.borderColor = 'rgba(245,158,11,.3)';
      badge.style.color = 'var(--warn)';
    }
  }

  /* ═══════════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════════ */
  const SECTION_TITLES = {
    dashboard: 'Dashboard',
    joueurs: 'Joueurs',
    photos: 'Photos & Logos',
    matchs: 'Matchs'
  };

  function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(name);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mn-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.getElementById('nav-' + name);
    const mnavBtn = document.getElementById('mnav-' + name);
    if (navBtn) navBtn.classList.add('active');
    if (mnavBtn) mnavBtn.classList.add('active');

    document.getElementById('topbar-title').firstChild.textContent = SECTION_TITLES[name] || '';

    closeMobileSidebar();
    if (name === 'joueurs') renderUsersTable();
    if (name === 'photos') renderPhotosGrid();
    if (name === 'matchs') renderMatches();
  }

  function setupNav() {
    ['dashboard', 'joueurs', 'photos', 'matchs'].forEach(name => {
      const navBtn = document.getElementById('nav-' + name);
      const mnavBtn = document.getElementById('mnav-' + name);
      if (navBtn) navBtn.addEventListener('click', () => showSection(name));
      if (mnavBtn) mnavBtn.addEventListener('click', () => showSection(name));
    });
  }

  function setupMobileMenu() {
    const btnMenu = document.querySelector('.btn-menu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (btnMenu) btnMenu.addEventListener('click', () => {
      sidebar.classList.add('open');
      overlay.classList.add('open');
    });
    if (overlay) overlay.addEventListener('click', closeMobileSidebar);
  }
  function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  function setupLogout() {
    const btn = document.getElementById('logout-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        if (window.firebase && firebase.auth) {
          try { firebase.auth().signOut(); } catch (e) {}
        }
        showToast('Déconnexion...', 'info');
        setTimeout(() => { window.location.href = 'index.html'; }, 800);
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════
     RENDU GLOBAL
     ═══════════════════════════════════════════════════════════ */
  function renderAll() {
    renderDashboard();
    if (document.getElementById('joueurs').classList.contains('active')) renderUsersTable();
    if (document.getElementById('photos').classList.contains('active')) renderPhotosGrid();
    if (document.getElementById('matchs').classList.contains('active')) renderMatches();
  }

  /* ── DASHBOARD ── */
  function renderDashboard() {
    const total = allUsers.length;
    const verified = allUsers.filter(u => (u.status || 'active') === 'active').length;
    const pending = allUsers.filter(u => u.status === 'pending').length;

    setText('stat-total', total);
    setText('stat-verified', verified);
    setText('stat-pending', pending);
    setText('stat-matchs', allMatches.length);

    const bars = ROLE_BAR_ORDER.map(role => {
      const count = allUsers.filter(u => u.role === role).length;
      const pct = total ? Math.round((count / total) * 100) : 0;
      const color = ROLE_COLORS[role];
      return `<div class="sb-item">
        <div class="sb-label"><span>${ROLE_LABELS[role]}</span><span style="color:${color}">${count}</span></div>
        <div class="sb-track"><div class="sb-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>`;
    }).join('');
    const roleBars = document.getElementById('role-bars');
    if (roleBars) roleBars.innerHTML = bars;

    renderActivity();
    renderNextMatchPreview();
  }

  function renderActivity() {
    const el = document.getElementById('activity-list');
    if (!el) return;
    if (!activityLog.length) {
      el.innerHTML = `<div class="act-item"><div class="act-dot" style="background:var(--green)"></div><div class="act-text">Panneau chargé</div><div class="act-time">maintenant</div></div>`;
      return;
    }
    el.innerHTML = activityLog.map(a =>
      `<div class="act-item"><div class="act-dot" style="background:var(--green)"></div><div class="act-text">${esc(a.text)}</div><div class="act-time">${esc(a.time)}</div></div>`
    ).join('');
  }

  function renderNextMatchPreview() {
    const el = document.getElementById('next-match-preview');
    if (!el) return;
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = allMatches
      .filter(m => m.date && m.date >= today)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
    if (!upcoming) {
      el.innerHTML = `<div style="text-align:center;color:var(--gray-txt);font-size:13px;padding:10px">Aucun match à venir</div>`;
      return;
    }
    el.innerHTML = `<div style="text-align:center;padding:6px 0">
      <div style="font-weight:700;color:var(--navy);font-size:14px">${esc(upcoming.home || 'GSC')} vs ${esc(upcoming.away || '?')}</div>
      <div style="font-size:11px;color:var(--gray-txt);margin-top:4px">📅 ${esc(upcoming.date || '')} ${upcoming.time ? '· ' + esc(upcoming.time) : ''}</div>
    </div>`;
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ── JOUEURS ── */
  function visibleUsers() {
    const search = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    return allUsers.filter(u => {
      const matchRole = currentRoleFilter === 'all' || u.role === currentRoleFilter;
      const matchSearch = !search ||
        (u.nom || '').toLowerCase().includes(search) ||
        (u.club || '').toLowerCase().includes(search) ||
        (u.email || '').toLowerCase().includes(search);
      return matchRole && matchSearch;
    });
  }

  function statusBadge(status) {
    const map = {
      active: ['status-active', '✓ Actif'],
      pending: ['status-pending', '⏳ En attente'],
      hidden: ['status-hidden', '👁️ Masqué'],
      deleted: ['status-deleted', '🗑️ Supprimé']
    };
    const [cls, label] = map[status] || map.active;
    return `<span class="status-badge ${cls}">${label}</span>`;
  }

  function renderUsersTable() {
    const list = visibleUsers();
    const tbody = document.getElementById('players-grid');
    const wrap = document.querySelector('.users-table-wrap');
    const empty = document.getElementById('empty-state');

    if (!list.length) {
      if (wrap) wrap.style.display = 'none';
      if (empty) empty.style.display = 'block';
      if (tbody) tbody.innerHTML = '';
      return;
    }
    if (wrap) wrap.style.display = '';
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = list.map(u => {
      const avatar = u.photo
        ? `<img src="${u.photo}" alt="${esc(u.nom)}">`
        : initials(u.nom);
      return `<tr data-id="${esc(u.id)}">
        <td data-label="Membre"><div class="user-name-cell"><div class="user-row-avatar">${avatar}</div><span class="user-name-txt">${esc(u.nom || 'Sans nom')}</span></div></td>
        <td data-label="Rôle">${ROLE_LABELS[u.role] || 'Membre'}</td>
        <td data-label="Club">${esc(u.club) || '—'}</td>
        <td data-label="Statut">${statusBadge(u.status || 'active')}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => openPlayerModal(tr.dataset.id));
    });
  }

  function setupUserFilters() {
    document.querySelectorAll('.filters-bar .filter-btn').forEach(btn => {
      const roleClass = [...btn.classList].find(c => c.startsWith('role-'));
      const role = roleClass ? roleClass.replace('role-', '') : 'all';
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filters-bar .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentRoleFilter = role;
        renderUsersTable();
      });
    });
    const search = document.getElementById('search-input');
    if (search) search.addEventListener('input', renderUsersTable);
  }

  /* ── PLAYER MODAL ── */
  function openPlayerModal(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;
    editingUserId = id;
    pendingPhotoBase64 = undefined;

    setText('modal-player-name', user.nom || 'Sans nom');
    setText('modal-player-role', ROLE_LABELS[user.role] || 'Membre');
    setText('modal-email', user.email || '—');
    setText('modal-phone', user.telephone || '—');
    setText('modal-date', user.createdAt ? String(user.createdAt).slice(0, 10) : '—');
    document.getElementById('modal-status').value = user.status || 'active';
    document.getElementById('modal-taille').value = user.taille || '';
    document.getElementById('modal-poids').value = user.poids || '';
    document.getElementById('modal-pied').value = user.piedFort || '';
    document.getElementById('modal-main').value = user.mainDominante || '';
    document.getElementById('modal-matchs').value = user.matchsJoues || 0;
    document.getElementById('modal-buts').value = user.buts || 0;
    document.getElementById('modal-passes').value = user.passes || 0;
    document.getElementById('modal-club').value = user.club || '';

    setModalPhotoPreview(user.photo);

    document.getElementById('player-modal').classList.add('open');
  }

  function setModalPhotoPreview(photo) {
    const content = document.getElementById('modal-photo-content');
    if (!content) return;
    if (photo) {
      content.outerHTML = `<img src="${photo}" id="modal-photo-content" style="width:100%;height:100%;object-fit:cover">`;
    } else {
      content.outerHTML = `<span id="modal-photo-content">👤</span>`;
    }
  }

  function setupPlayerModal() {
    const modal = document.getElementById('player-modal');
    const trigger = document.getElementById('modal-photo-trigger');
    const input = document.getElementById('photo-input');

    if (trigger) trigger.addEventListener('click', () => input.click());
    if (input) input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        pendingPhotoBase64 = reader.result;
        setModalPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    });

    modal.querySelector('.modal-close').addEventListener('click', () => modal.classList.remove('open'));
    modal.querySelectorAll('.btn-secondary').forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

    modal.querySelector('.btn-primary').addEventListener('click', savePlayer);
  }

  async function savePlayer() {
    if (!editingUserId) return;
    const data = {
      status: document.getElementById('modal-status').value,
      taille: document.getElementById('modal-taille').value,
      poids: document.getElementById('modal-poids').value,
      piedFort: document.getElementById('modal-pied').value,
      mainDominante: document.getElementById('modal-main').value,
      matchsJoues: Number(document.getElementById('modal-matchs').value) || 0,
      buts: Number(document.getElementById('modal-buts').value) || 0,
      passes: Number(document.getElementById('modal-passes').value) || 0,
      club: document.getElementById('modal-club').value
    };
    if (pendingPhotoBase64 !== undefined) data.photo = pendingPhotoBase64;

    try {
      if (usingFallback) {
        const u = allUsers.find(x => x.id === editingUserId);
        if (u) Object.assign(u, data);
      } else {
        await window.realtimeSync.saveDocument('users', editingUserId, data);
      }
      showToast('Fiche mise à jour ✓', 'success');
      logActivity(`Joueur modifié`);
      document.getElementById('player-modal').classList.remove('open');
      if (usingFallback) renderAll();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  }

  /* ── PHOTOS & LOGOS ── */
  const PH_FILTER_ROLES = { all: null, joueur: 'joueur', club: 'club', federation: 'federation', association: 'association' };

  function setupPhotoFilters() {
    document.querySelectorAll('#ph-filter-bar .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ph-filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPhFilter = btn.dataset.phfilter;
        renderPhotosGrid();
      });
    });
  }

  function renderPhotosGrid() {
    const roleFilter = PH_FILTER_ROLES[currentPhFilter];
    const list = roleFilter ? allUsers.filter(u => u.role === roleFilter) : allUsers;

    const totalActors = list.length;
    const withPhoto = list.filter(u => u.photo).length;
    setText('ph-stat-total', totalActors);
    setText('ph-stat-photos', withPhoto);
    setText('ph-stat-rate', totalActors ? Math.round((withPhoto / totalActors) * 100) + '%' : '0%');

    const grid = document.getElementById('photos-grid');
    if (!grid) return;
    grid.innerHTML = list.map(u => `
      <div class="ph-actor-card ${u.photo ? 'ph-has-photo' : ''}" data-id="${esc(u.id)}">
        <div class="ph-photo-zone">
          ${u.photo
            ? `<div class="ph-avatar"><img src="${u.photo}" alt="${esc(u.nom)}"></div>`
            : `<div class="ph-avatar">${initials(u.nom)}</div>`}
          <div class="ph-hover-overlay">📷</div>
        </div>
        <div class="ph-info">
          <div class="ph-name">${esc(u.nom || 'Sans nom')}</div>
          <div class="ph-role">${(ROLE_LABELS[u.role] || 'Membre').replace(/^\S+\s/, '')}</div>
        </div>
        <div class="ph-actions">
          <button class="ph-btn upload" data-act="upload" data-id="${esc(u.id)}">📷 ${u.photo ? 'Changer' : 'Ajouter'}</button>
          ${u.photo ? `<button class="ph-btn remove" data-act="remove" data-id="${esc(u.id)}">🗑️</button>` : ''}
        </div>
      </div>
    `).join('') || `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">📸</div><h3>Aucun acteur</h3><p>Aucun résultat pour ce filtre</p></div>`;

    grid.querySelectorAll('[data-act="upload"]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); uploadPhotoFor(btn.dataset.id); });
    });
    grid.querySelectorAll('[data-act="remove"]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); removePhotoFor(btn.dataset.id); });
    });
    grid.querySelectorAll('.ph-photo-zone').forEach((zone, i) => {
      zone.addEventListener('click', () => uploadPhotoFor(list[i].id));
    });
  }

  function uploadPhotoFor(id) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          if (usingFallback) {
            const u = allUsers.find(x => x.id === id);
            if (u) u.photo = reader.result;
            renderAll();
          } else {
            await window.realtimeSync.saveDocument('users', id, { photo: reader.result });
          }
          showToast('Photo mise à jour ✓', 'success');
          logActivity('Photo modifiée');
        } catch (err) {
          console.error(err);
          showToast('Erreur upload photo', 'error');
        }
      };
      reader.readAsDataURL(file);
    });
    input.click();
  }

  async function removePhotoFor(id) {
    if (!confirm('Retirer cette photo ?')) return;
    try {
      if (usingFallback) {
        const u = allUsers.find(x => x.id === id);
        if (u) u.photo = null;
        renderAll();
      } else {
        await window.realtimeSync.saveDocument('users', id, { photo: null });
      }
      showToast('Photo retirée', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erreur', 'error');
    }
  }

  /* ── MATCHS ── */
  function visibleMatches() {
    const today = new Date().toISOString().slice(0, 10);
    let list = allMatches.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (currentMatchTab === 'upcoming') list = list.filter(m => m.date >= today);
    if (currentMatchTab === 'played') list = list.filter(m => m.date < today || (m.scoreHome != null && m.scoreAway != null));
    return list;
  }

  function renderMatches() {
    const list = visibleMatches();
    const el = document.getElementById('matches-list');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📅</div><h3>Aucun match</h3><p>Ajoutez votre premier match</p></div>`;
      return;
    }
    el.innerHTML = list.map(m => {
      const d = m.date ? new Date(m.date + 'T00:00:00') : null;
      const day = d ? d.getDate() : '--';
      const month = d ? MONTHS_FR[d.getMonth()] : '';
      const played = m.scoreHome != null && m.scoreAway != null && m.scoreHome !== '' && m.scoreAway !== '';
      let resultHtml;
      if (played) {
        const sh = Number(m.scoreHome), sa = Number(m.scoreAway);
        const cls = sh > sa ? 'win' : (sh < sa ? 'loss' : 'draw');
        const label = sh > sa ? 'Victoire' : (sh < sa ? 'Défaite' : 'Nul');
        resultHtml = `<div class="match-score">${sh}–${sa}</div><div class="match-result ${cls}">${label}</div>`;
      } else {
        resultHtml = `<div class="match-result upcoming">À venir</div>`;
      }
      return `<div class="match-card" data-id="${esc(m.id)}">
        <div class="match-date-col"><div class="match-day">${day}</div><div class="match-month">${esc(month)}</div></div>
        <div class="match-divider"></div>
        <div class="match-info">
          <div class="match-teams">${esc(m.home || 'GSC')} vs ${esc(m.away || '?')}</div>
          <div class="match-meta"><span>📍 ${esc(m.lieu) || '—'}</span><span>🏆 ${esc(m.competition) || '—'}</span>${m.time ? `<span>🕐 ${esc(m.time)}</span>` : ''}</div>
        </div>
        <div class="match-score-col">${resultHtml}</div>
      </div>`;
    }).join('');

    el.querySelectorAll('.match-card').forEach(card => {
      card.addEventListener('click', () => openMatchModal(card.dataset.id));
    });
  }

  function setupMatchTabs() {
    const tabs = document.querySelectorAll('.match-tab');
    const keys = ['all', 'upcoming', 'played'];
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentMatchTab = keys[i];
        renderMatches();
      });
    });
    const addBtn = document.querySelector('.btn-add');
    if (addBtn) addBtn.addEventListener('click', () => openMatchModal(null));
  }

  /* ── MATCH MODAL ── */
  function openMatchModal(id) {
    editingMatchId = id;
    const modal = document.getElementById('match-modal');
    const deleteBtn = document.getElementById('btn-delete-match');

    if (id) {
      const m = allMatches.find(x => x.id === id);
      if (!m) return;
      setText('match-modal-title', 'Modifier le Match');
      document.getElementById('match-home').value = m.home || 'GSC';
      document.getElementById('match-away').value = m.away || '';
      document.getElementById('match-date').value = m.date || '';
      document.getElementById('match-time').value = m.time || '';
      document.getElementById('match-lieu').value = m.lieu || '';
      document.getElementById('match-competition').value = m.competition || '';
      document.getElementById('match-score-home').value = m.scoreHome ?? '';
      document.getElementById('match-score-away').value = m.scoreAway ?? '';
      deleteBtn.style.display = '';
    } else {
      setText('match-modal-title', 'Nouveau Match');
      document.getElementById('match-home').value = 'GSC';
      document.getElementById('match-away').value = '';
      document.getElementById('match-date').value = '';
      document.getElementById('match-time').value = '';
      document.getElementById('match-lieu').value = '';
      document.getElementById('match-competition').value = '';
      document.getElementById('match-score-home').value = '';
      document.getElementById('match-score-away').value = '';
      deleteBtn.style.display = 'none';
    }
    modal.classList.add('open');
  }

  function setupMatchModal() {
    const modal = document.getElementById('match-modal');
    modal.querySelector('.modal-close').addEventListener('click', () => modal.classList.remove('open'));
    modal.querySelectorAll('.btn-secondary').forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
    modal.querySelector('.btn-primary').addEventListener('click', saveMatch);
    document.getElementById('btn-delete-match').addEventListener('click', deleteMatch);
  }

  async function saveMatch() {
    const data = {
      home: document.getElementById('match-home').value || 'GSC',
      away: document.getElementById('match-away').value,
      date: document.getElementById('match-date').value,
      time: document.getElementById('match-time').value,
      lieu: document.getElementById('match-lieu').value,
      competition: document.getElementById('match-competition').value,
      scoreHome: document.getElementById('match-score-home').value === '' ? null : Number(document.getElementById('match-score-home').value),
      scoreAway: document.getElementById('match-score-away').value === '' ? null : Number(document.getElementById('match-score-away').value)
    };
    if (!data.away) { showToast('Indiquez l\'équipe visiteuse', 'warn'); return; }

    try {
      if (usingFallback) {
        if (editingMatchId) {
          const m = allMatches.find(x => x.id === editingMatchId);
          if (m) Object.assign(m, data);
        } else {
          allMatches.push({ id: 'local-' + Date.now(), ...data });
        }
        renderAll();
      } else {
        const id = editingMatchId || ('m' + Date.now());
        await window.realtimeSync.saveDocument('matchs', id, data);
      }
      showToast('Match enregistré ✓', 'success');
      logActivity(`Match ${data.home} vs ${data.away} enregistré`);
      document.getElementById('match-modal').classList.remove('open');
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  }

  async function deleteMatch() {
    if (!editingMatchId || !confirm('Supprimer ce match ?')) return;
    try {
      if (usingFallback) {
        allMatches = allMatches.filter(m => m.id !== editingMatchId);
        renderAll();
      } else {
        await window.realtimeSync.deleteDocument('matchs', editingMatchId);
      }
      showToast('Match supprimé', 'success');
      logActivity('Match supprimé');
      document.getElementById('match-modal').classList.remove('open');
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la suppression', 'error');
    }
  }

  /* ── QUICK ACTIONS (dashboard) ── */
  function setupQuickActions() {
    const btns = document.querySelectorAll('.quick-actions .btn-action');
    if (btns[0]) btns[0].addEventListener('click', () => showSection('joueurs'));
    if (btns[1]) btns[1].addEventListener('click', () => openMatchModal(null));
    if (btns[2]) btns[2].addEventListener('click', () => showSection('matchs'));
  }

  /* ═══════════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════════ */
  window.addEventListener('DOMContentLoaded', () => {
    setupNav();
    setupMobileMenu();
    setupLogout();
    setupUserFilters();
    setupPlayerModal();
    setupPhotoFilters();
    setupMatchTabs();
    setupMatchModal();
    setupQuickActions();
    renderDashboard();
    boot();
  });

})();
