/* ═══════════════════════════════════════════════════════════════
   ADMIN-CONTROLLER.JS — Logique du panneau GSC Admin
   Lit/écrit Firestore via window.db (firebase-init.js) et le cache
   live de window.realtimeSync (realtime-sync-module.js).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const ROLE_LABELS = {
    joueur: '⚽ Joueur / Athlète', entraineur: '📋 Entraîneur', arbitre: '🟨 Arbitre',
    club: '🏟️ Club', federation: '🏛️ Fédération', association: '🤝 Association',
    organisateur: '🎯 Organisateur', independant: '🚴 Indépendant', supporter: '💗 Supporter'
  };
  const ROLE_COLORS = {
    joueur: '#009E60', entraineur: '#f97316', arbitre: '#8b5cf6',
    club: '#3b82f6', federation: '#f97316', association: '#e11d48',
    organisateur: '#0d9488', independant: '#64748b', supporter: '#ec4899'
  };
  const DASH_ROLES = ['joueur', 'entraineur', 'arbitre', 'club', 'federation', 'association'];

  let users = [], matchs = [];
  let roleFilter = 'all', searchTerm = '';
  let phFilter = 'all';
  let matchTabFilter = 'all';
  let currentPlayerId = null, currentMatchId = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function fullName(u) { return ((u.prenom || '') + ' ' + (u.nom || '')).trim() || u.nomOrganisation || u.name || 'Sans nom'; }
  function fmtDate(ts) { try { return ts && ts.toDate ? ts.toDate().toLocaleDateString('fr-FR') : '—'; } catch (e) { return '—'; } }

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
      const labels = { dashboard: 'Dashboard', joueurs: 'Joueurs', photos: 'Photos & Logos', matchs: 'Matchs', rapports: 'Rapports', documents: 'Documents' };
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
    // nav-rapports / impression / actualisation rapports déjà gérés par le bloc inline en bas d'admin.html
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
    const pending = users.filter(u => u.status === 'pending');

    document.getElementById('stat-total').textContent = users.length;
    document.getElementById('stat-verified').textContent = actifs.length;
    document.getElementById('stat-pending').textContent = pending.length;
    document.getElementById('stat-matchs').textContent = matchs.length;

    const total = visibles.length || 1;
    const barsHtml = DASH_ROLES.map(r => {
      const count = visibles.filter(u => u.role === r).length;
      const pct = Math.round((count / total) * 100);
      return `<div class="sb-item"><div class="sb-label"><span>${ROLE_LABELS[r]}</span><span style="color:${ROLE_COLORS[r]}">${count}</span></div><div class="sb-track"><div class="sb-fill" style="width:${pct}%;background:${ROLE_COLORS[r]}"></div></div></div>`;
    }).join('');
    const barsEl = document.getElementById('role-bars');
    if (barsEl) barsEl.innerHTML = barsHtml;

    const activityEl = document.getElementById('activity-list');
    if (activityEl) {
      activityEl.innerHTML = `
        <div class="act-item"><div class="act-dot" style="background:var(--green)"></div><div class="act-text">${actifs.length} membre(s) actif(s)</div><div class="act-time">—</div></div>
        ${pending.length ? `<div class="act-item"><div class="act-dot" style="background:var(--warn)"></div><div class="act-text">${pending.length} fiche(s) en attente de validation</div><div class="act-time">—</div></div>` : ''}
        <div class="act-item"><div class="act-dot" style="background:var(--green)"></div><div class="act-text">Panneau synchronisé en temps réel</div><div class="act-time">maintenant</div></div>`;
    }

    const upcoming = matchs.filter(m => m.date && new Date(m.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));
    const nextEl = document.getElementById('next-match-preview');
    if (nextEl) {
      if (upcoming.length) {
        const m = upcoming[0];
        const d = new Date(m.date);
        nextEl.innerHTML = `<div style="text-align:center;"><div style="font-weight:800;font-size:14px;">${esc(m.home || 'GSC')} — ${esc(m.away || '?')}</div><div style="font-size:11px;color:var(--gray-txt);margin-top:4px;">${d.toLocaleDateString('fr-FR')} ${m.time ? '· ' + m.time : ''} ${m.lieu ? '· ' + esc(m.lieu) : ''}</div></div>`;
      } else {
        nextEl.innerHTML = `<div style="text-align:center;color:var(--gray-txt);font-size:13px;padding:10px">Aucun match à venir</div>`;
      }
    }
  }

  function wireQuickActions() {
    const btns = document.querySelectorAll('.quick-actions .btn-action');
    if (btns[0]) btns[0].addEventListener('click', () => switchSection('joueurs'));
    if (btns[1]) btns[1].addEventListener('click', () => openMatchModal(null));
    if (btns[2]) btns[2].addEventListener('click', () => switchSection('matchs'));
  }

  /* ═══ JOUEURS ═══ */
  function renderPlayers() {
    let list = users.filter(u => u.status !== 'deleted');
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter);
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(u => (fullName(u) + ' ' + (u.club || '') + ' ' + (u.email || '')).toLowerCase().includes(t));
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
    tbody.innerHTML = list.map(u => `
      <tr data-id="${u.id}">
        <td data-label="Membre"><div class="user-name-cell"><div class="user-row-avatar">${u.photoURL ? `<img src="${esc(u.photoURL)}">` : esc(fullName(u).charAt(0).toUpperCase())}</div><span class="user-name-txt">${esc(fullName(u))}</span></div></td>
        <td data-label="Rôle">${esc(ROLE_LABELS[u.role] || u.role || '—')}</td>
        <td data-label="Club">${esc(u.club || '—')}</td>
        <td data-label="Statut"><span class="status-badge status-${u.status || 'active'}">${({ active: 'Actif', pending: 'En attente', hidden: 'Masqué', deleted: 'Supprimé' })[u.status || 'active']}</span></td>
      </tr>`).join('');
    tbody.querySelectorAll('tr').forEach(tr => tr.addEventListener('click', () => openPlayerModal(tr.dataset.id)));
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
      searchTerm = e.target.value; renderPlayers();
    });
  }

  function openPlayerModal(id) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    currentPlayerId = id;
    document.getElementById('modal-player-name').textContent = fullName(u);
    document.getElementById('modal-player-role').textContent = ROLE_LABELS[u.role] || u.role || '';
    document.getElementById('modal-photo-content').textContent = u.photoURL ? '' : '👤';
    const photoBox = document.getElementById('modal-photo');
    photoBox.style.backgroundImage = u.photoURL ? `url('${u.photoURL}')` : '';
    photoBox.style.backgroundSize = 'cover'; photoBox.style.backgroundPosition = 'center';
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
    document.getElementById('modal-club').value = u.club || '';
    ensureDeleteButton('player-modal', 'modal-actions', () => deletePlayer(id));
    document.getElementById('player-modal').classList.add('open');
  }

  async function savePlayer() {
    if (!currentPlayerId) return;
    const data = {
      status: document.getElementById('modal-status').value,
      taille: Number(document.getElementById('modal-taille').value) || null,
      poids: Number(document.getElementById('modal-poids').value) || null,
      pied: document.getElementById('modal-pied').value || null,
      main: document.getElementById('modal-main').value || null,
      matchsJoues: Number(document.getElementById('modal-matchs').value) || 0,
      buts: Number(document.getElementById('modal-buts').value) || 0,
      passes: Number(document.getElementById('modal-passes').value) || 0,
      club: document.getElementById('modal-club').value || null
    };
    try {
      await window.db.collection('users').doc(currentPlayerId).set(data, { merge: true });
      closeModal('player-modal');
      toast('Fiche mise à jour', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  }

  async function deletePlayer(id) {
    if (!confirm('Supprimer définitivement cette fiche ?')) return;
    try {
      await window.db.collection('users').doc(id).delete();
      closeModal('player-modal');
      toast('Fiche supprimée', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  }

  /* ═══ PHOTOS & LOGOS ═══ */
  function renderPhotos() {
    let list = users.filter(u => u.status !== 'deleted');
    if (phFilter !== 'all') list = list.filter(u => u.role === phFilter);
    const total = list.length;
    const withPhoto = list.filter(u => u.photoURL).length;
    document.getElementById('ph-stat-total').textContent = total;
    document.getElementById('ph-stat-photos').textContent = withPhoto;
    document.getElementById('ph-stat-rate').textContent = total ? Math.round(withPhoto / total * 100) + '%' : '0%';

    const grid = document.getElementById('photos-grid');
    if (!grid) return;
    grid.innerHTML = list.map(u => `
      <div class="ph-actor-card" data-id="${u.id}">
        <div class="ph-photo-zone" data-upload="${u.id}">
          <div class="ph-avatar">${u.photoURL ? `<img src="${esc(u.photoURL)}">` : esc(fullName(u).charAt(0).toUpperCase())}</div>
        </div>
        <div class="player-info">
          <div class="player-name">${esc(fullName(u))}</div>
          <div class="player-role">${esc(ROLE_LABELS[u.role] || u.role || '—')}</div>
        </div>
      </div>`).join('');
    grid.querySelectorAll('[data-upload]').forEach(zone => {
      zone.addEventListener('click', () => triggerPhotoUpload(zone.dataset.upload));
    });
  }

  function wirePhotoFilters() {
    document.querySelectorAll('#ph-filter-bar .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ph-filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        phFilter = btn.dataset.phfilter || 'all';
        renderPhotos();
      });
    });
  }

  function triggerPhotoUpload(uid) {
    const input = document.getElementById('photo-input');
    if (!input) return;
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      if (!window.storage) { toast('Firebase Storage non configuré sur ce projet', 'error'); return; }
      try {
        toast('Envoi de la photo…', 'info');
        const ref = window.storage.ref().child('actors/' + uid + '/photo_' + Date.now() + '_' + file.name);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        await window.db.collection('users').doc(uid).set({ photoURL: url }, { merge: true });
        toast('Photo mise à jour', 'success');
      } catch (e) { toast('Erreur upload : ' + e.message, 'error'); }
      input.value = '';
    };
    input.click();
  }

  /* ═══ MATCHS ═══ */
  function renderMatches() {
    let list = [...matchs];
    const now = new Date();
    if (matchTabFilter === 'upcoming') list = list.filter(m => m.date && new Date(m.date) >= now);
    if (matchTabFilter === 'played') list = list.filter(m => m.date && new Date(m.date) < now);
    list.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    const container = document.getElementById('matches-list');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = `<div class="empty" style="display:block"><div class="empty-icon">📅</div><h3>Aucun match</h3><p>Ajoutez votre premier match</p></div>`;
      return;
    }
    container.innerHTML = list.map(m => {
      const d = m.date ? new Date(m.date) : null;
      const played = m.scoreHome != null && m.scoreAway != null;
      let resultClass = 'upcoming', resultText = 'À venir';
      if (played) {
        if (m.scoreHome > m.scoreAway) { resultClass = 'win'; resultText = 'Victoire'; }
        else if (m.scoreHome < m.scoreAway) { resultClass = 'loss'; resultText = 'Défaite'; }
        else { resultClass = 'draw'; resultText = 'Nul'; }
      }
      return `<div class="match-card" data-id="${m.id}">
        <div class="match-date-col"><div class="match-day">${d ? d.getDate() : '—'}</div><div class="match-month">${d ? d.toLocaleDateString('fr-FR', { month: 'short' }) : ''}</div></div>
        <div class="match-divider"></div>
        <div class="match-info"><div class="match-teams">${esc(m.home || 'GSC')} — ${esc(m.away || '?')}</div><div class="match-meta">${m.competition ? '<span>🏆 ' + esc(m.competition) + '</span>' : ''}${m.lieu ? '<span>📍 ' + esc(m.lieu) + '</span>' : ''}${m.time ? '<span>🕐 ' + esc(m.time) + '</span>' : ''}</div></div>
        <div class="match-score-col"><div class="match-score">${played ? m.scoreHome + ' - ' + m.scoreAway : '—'}</div><div class="match-result ${resultClass}">${resultText}</div></div>
      </div>`;
    }).join('');
    container.querySelectorAll('.match-card').forEach(card => card.addEventListener('click', () => openMatchModal(card.dataset.id)));
  }

  function wireMatchTabs() {
    document.querySelectorAll('.match-tab').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.match-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        matchTabFilter = ['all', 'upcoming', 'played'][idx] || 'all';
        renderMatches();
      });
    });
    document.querySelector('.btn-add')?.addEventListener('click', () => openMatchModal(null));
  }

  function openMatchModal(id) {
    currentMatchId = id;
    const m = id ? matchs.find(x => x.id === id) : null;
    document.getElementById('match-modal-title').textContent = m ? 'Modifier le match' : 'Nouveau Match';
    document.getElementById('match-home').value = m?.home || 'GSC';
    document.getElementById('match-away').value = m?.away || '';
    document.getElementById('match-date').value = m?.date ? m.date.slice(0, 10) : '';
    document.getElementById('match-time').value = m?.time || '';
    document.getElementById('match-lieu').value = m?.lieu || '';
    document.getElementById('match-competition').value = m?.competition || '';
    document.getElementById('match-score-home').value = m?.scoreHome ?? '';
    document.getElementById('match-score-away').value = m?.scoreAway ?? '';
    const delBtn = document.getElementById('btn-delete-match');
    if (delBtn) delBtn.style.display = m ? 'inline-block' : 'none';
    document.getElementById('match-modal').classList.add('open');
  }

  async function saveMatch() {
    const data = {
      home: document.getElementById('match-home').value || 'GSC',
      away: document.getElementById('match-away').value || '',
      date: document.getElementById('match-date').value || null,
      time: document.getElementById('match-time').value || null,
      lieu: document.getElementById('match-lieu').value || null,
      competition: document.getElementById('match-competition').value || null,
      scoreHome: document.getElementById('match-score-home').value !== '' ? Number(document.getElementById('match-score-home').value) : null,
      scoreAway: document.getElementById('match-score-away').value !== '' ? Number(document.getElementById('match-score-away').value) : null
    };
    try {
      if (currentMatchId) await window.db.collection('matchs').doc(currentMatchId).set(data, { merge: true });
      else await window.db.collection('matchs').add(data);
      closeModal('match-modal');
      toast('Match enregistré', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  }

  async function deleteMatch() {
    if (!currentMatchId || !confirm('Supprimer ce match ?')) return;
    try {
      await window.db.collection('matchs').doc(currentMatchId).delete();
      closeModal('match-modal');
      toast('Match supprimé', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  }

  /* ═══ DOCUMENTS (archive des dossiers d'inscription) ═══ */
  let docSearchTerm = '';
  function renderDocuments() {
    let list = users.filter(u => u.status !== 'deleted');
    if (docSearchTerm) {
      const t = docSearchTerm.toLowerCase();
      list = list.filter(u => fullName(u).toLowerCase().includes(t));
    }
    const tbody = document.getElementById('documents-tbody');
    if (!tbody) return;
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--gray-txt)">Aucun acteur</td></tr>'; return; }
    tbody.innerHTML = list.map(u => {
      const docs = Array.isArray(u.documents) ? u.documents : [];
      const docsHtml = docs.length
        ? docs.map(d => `<a href="${esc(d.url)}" target="_blank" style="display:inline-block;margin:2px 6px 2px 0;font-size:11px;">📎 ${esc(d.label || 'Document')}</a>`).join('')
        : '<span style="color:var(--gray-txt);font-size:12px;">Aucun</span>';
      return `<tr>
        <td data-label="Acteur"><strong>${esc(fullName(u))}</strong></td>
        <td data-label="Rôle">${esc(ROLE_LABELS[u.role] || u.role || '—')}</td>
        <td data-label="Documents">${docsHtml}</td>
        <td data-label="Actions"><button class="btn-sm" data-adddoc="${u.id}" style="padding:5px 10px;font-size:11px;border:1px solid var(--gray-bd);border-radius:6px;background:#fff;cursor:pointer;">➕ Ajouter</button></td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('[data-adddoc]').forEach(btn => {
      btn.addEventListener('click', () => addDocumentToUser(btn.dataset.adddoc));
    });
  }

  async function addDocumentToUser(uid) {
    const label = prompt('Type de document (ex: Carte d\'identité, Licence, Justificatif domicile)');
    if (!label) return;
    const url = prompt('URL du document (lien hébergé — Drive, Firebase Storage, etc.)');
    if (!url) return;
    try {
      await window.db.collection('users').doc(uid).update({
        documents: firebase.firestore.FieldValue.arrayUnion({ label, url, addedAt: new Date().toISOString() })
      });
      toast('Document archivé', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  }

  /* ═══ RÉINITIALISATION (outils avancés) ═══ */
  async function executeReset() {
    const coll = document.getElementById('reset-collection-select').value;
    const confirmInput = document.getElementById('reset-confirm-input').value.trim();
    if (confirmInput !== 'SUPPRIMER') { toast('Tapez exactement SUPPRIMER pour confirmer', 'warn'); return; }
    if (!confirm('Dernière confirmation : supprimer TOUS les documents de "' + coll + '" ? Cette action est irréversible.')) return;
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
      toast(coll + ' réinitialisé (' + docs.length + ' document(s) supprimé(s))', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  }

  /* ═══ MODALES & DIVERS ═══ */
  function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
  function ensureDeleteButton(modalId, actionsClass, onClick) {
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

    wireNav(); wireQuickActions(); wirePlayerFilters(); wirePhotoFilters();
    wireMatchTabs(); wireModals();

    window.realtimeSync.onUpdate('users', (data) => {
      users = data;
      renderDashboard();
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
