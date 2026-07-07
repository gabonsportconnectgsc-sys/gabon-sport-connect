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
      await window.ensureFirebaseAuthViaSupabase();
    }
    return fn();
  }

  /* ── Sync Helper : Synchronise status vers le vrai emplacement ──────────────
     Depuis la migration, status doit vivre à users/{uid}/private/contact.status,
     pas à la racine. Ce helper normalise les écritures pour les deux chemins.
  ────────────────────────────────────────────────────────────────────────── */
  async function syncStatusToBothLocations(docRef, updates) {
    // Si pas de status dans les updates, écrire normalement
    if (!('status' in updates)) {
      return docRef.update(updates);
    }

    const statusValue = updates.status;
    const rootUpdates = { ...updates };
    delete rootUpdates.status; // Enlever de la racine

    // Écriture atomique : racine + private/contact
    const batch = window.db.batch();
    if (Object.keys(rootUpdates).length > 0) {
      batch.update(docRef, rootUpdates);
    }
    batch.update(docRef.collection('private').doc('contact'), {
      status: statusValue,
      updatedAt: new Date()
    });
    return batch.commit();
  }

  const ROLE_LABELS = {
    joueur: '⚽ Joueur',
    athlete: '🏃 Athlète',
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
    ecole_universite: '🏫 École/Université',
    handisport: '🦾 Sportif handisport',
    ancien_sportif: '🎖️ Ancien Sportif',
    formateur: '🧑‍🏫 Formateur'
  };
  /* ── Catégories d'acteurs pour la fiche modale (player-modal) ──────────────
     Le modal est partagé par TOUS les acteurs (personnes ET organisations).
     Sans cette distinction, un club/fédération affichait et pouvait écraser
     des champs qui n'ont aucun sens pour une organisation (taille, poids,
     pied fort, main dominante, buts, passes décisives). */
  const PLAYER_ROLES = ['joueur', 'athlete', 'independant', 'eleve_etudiant', 'sportif_etranger', 'handisport', 'ancien_sportif'];
  // Les arbitres participent physiquement sur le terrain (course, endurance…) —
  // ils ont donc des critères physiques pertinents, mais pas de stats de
  // performance joueur (buts/passes décisives n'ont pas de sens pour eux).
  const PHYSIQUE_ROLES = PLAYER_ROLES.concat(['arbitre']);
  const ORG_ROLES = ['club', 'federation', 'association', 'organisateur', 'ecole_universite'];
  const ROLE_COLORS = {
    joueur: '#009E60',
    athlete: '#0891b2',
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
    ecole_universite: '#059669',
    handisport: '#7c3aed',
    ancien_sportif: '#9f1239',
    formateur: '#0284c7'
  };
  const DASH_ROLES = [
    'joueur', 'athlete', 'entraineur', 'arbitre', 'club', 'federation', 'association',
    'organisateur', 'supporter', 'independant', 'eleve_etudiant',
    'sportif_etranger', 'ecole_universite', 'handisport', 'ancien_sportif', 'formateur'
  ];
  const GROUP_ORDER = [
    'joueur', 'athlete', 'entraineur', 'arbitre', 'club', 'federation', 'association',
    'organisateur', 'independant', 'supporter', 'eleve_etudiant',
    'sportif_etranger', 'ecole_universite', 'handisport', 'ancien_sportif', 'formateur'
  ];
  const NIVEAU_ORDER = ['International', 'National', 'Regional', 'Amateur'];
  const SECONDARY_GROUP_CONFIG = {
    joueur: { getKey: a => a.club || a.nomOrganisation, label: v => '🏟️ ' + v, fallback: 'Sans club' },
    athlete: { getKey: a => a.sport, label: v => '🏃 ' + v, fallback: 'Discipline non précisée' },
    entraineur: { getKey: a => a.niveau, label: v => '🏆 Niveau ' + v, fallback: 'Niveau non précisé', order: NIVEAU_ORDER },
    arbitre: { getKey: a => a.niveau, label: v => '🏆 Niveau ' + v, fallback: 'Niveau non précisé', order: NIVEAU_ORDER },
    club: { getKey: a => a.division || a.niveau, label: v => '📊 Division ' + v, fallback: 'Division non précisée', order: NIVEAU_ORDER },
    organisateur: { getKey: a => a.province || a.ville, label: v => '📍 ' + v, fallback: 'Localisation non précisée' },
    independant: { getKey: a => a.province || a.ville, label: v => '📍 ' + v, fallback: 'Localisation non précisée' },
    association: { getKey: a => a.province || a.ville, label: v => '📍 ' + v, fallback: 'Localisation non précisée' },
    federation: { getKey: a => a.niveau || 'National', label: v => '🏛️ ' + v, fallback: 'Niveau non précisé', order: NIVEAU_ORDER },
    eleve_etudiant: { getKey: a => a.etablissement, label: v => '🎓 ' + v, fallback: 'Établissement non précisé' },
    sportif_etranger: { getKey: a => a.nationalite, label: v => '🌍 ' + v, fallback: 'Nationalité non précisée' },
    handisport: { getKey: a => a.disciplineParaSport, label: v => '🦾 ' + v, fallback: 'Discipline non précisée' },
    ancien_sportif: { getKey: a => a.sport, label: v => '🎖️ ' + v, fallback: 'Discipline non précisée' },
    supporter: { getKey: a => a.club || a.ville, label: v => '💗 ' + v, fallback: 'Non précisé' },
    formateur: { getKey: a => a.specialite || a.discipline, label: v => '🧑‍🏫 ' + v, fallback: 'Spécialité non précisée' }
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

  let hiddenDemoUids = new Set();

  function mergeWithDemo(realData) {
    const seed = window.GSC_SEED_ACTORS || [];
    const realIds = new Set(realData.map(u => u.uid || u.id));
    const demoOnly = seed
      .filter(s => !realIds.has(s.uid) && !hiddenDemoUids.has(s.uid))
      .map(s => ({ ...s, id: s.uid }));
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
      const labels = { dashboard: 'Dashboard', joueurs: 'Joueurs', photos: 'Photos & Logos', matchs: 'Matchs', rapports: 'Rapports', documents: 'Documents', verification: 'Vérification', sites: 'Sites sportifs', actualites: 'Actualités', carte: 'Carte des sites', cms: 'CMS' };
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
    ['dashboard', 'joueurs', 'photos', 'matchs', 'documents', 'sites', 'actualites', 'qrscan', 'verification', 'rapports'].forEach(name => {
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

    renderPendingValidation(pending);

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

  /* ═══ VALIDATION DES PROFILS & DROITS DE PROPRIÉTÉ ═══
     Réutilise les champs déjà posés par inscription.html :
     status ('pending'/'active'), editLocked, ownershipStatus,
     ownerRef {clubName,email,contactName}, ownerUid, ownerConfirmedAt, accessLevel */
  function hoursSince(createdAt) {
    try {
      const d = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
      if (isNaN(d.getTime())) return null;
      return (Date.now() - d.getTime()) / 3600000;
    } catch (e) { return null; }
  }

  let _overdueAlertShown = false;

  function renderPendingValidation(pendingList) {
    const card = document.getElementById('pending-validation-card');
    const listEl = document.getElementById('pending-validation-list');
    if (!card || !listEl) return;

    const withAge = pendingList.map(u => ({ u, hrs: hoursSince(u.createdAt) }));
    withAge.sort((a, b) => (b.hrs ?? 0) - (a.hrs ?? 0)); // plus ancien en premier (le plus urgent)
    const overdueCount = withAge.filter(x => x.hrs !== null && x.hrs > 24).length;

    card.style.display = pendingList.length ? '' : 'none';
    const countEl = document.getElementById('pending-validation-count');
    if (countEl) {
      countEl.innerHTML = pendingList.length
        ? `(${pendingList.length})${overdueCount ? ` · <span style="color:#dc2626;">🚨 ${overdueCount} en retard (&gt;24h)</span>` : ''}`
        : '';
    }
    if (!pendingList.length) { listEl.innerHTML = ''; return; }

    if (overdueCount > 0 && !_overdueAlertShown) {
      _overdueAlertShown = true;
      toast(`🚨 ${overdueCount} profil(s) en attente depuis plus de 24h — validation requise.`, 'error');
    }
    if (overdueCount === 0) _overdueAlertShown = false;

    listEl.innerHTML = withAge.map(({ u, hrs }) => {
      const needsOwner = u.editLocked && !u.ownerUid && ['pending_owner_claim', 'pending_owner_claim_ambiguous'].includes(u.ownershipStatus);
      const autoDetected = u.editLocked && u.ownerUid && u.ownershipStatus === 'owner_confirmed_auto';
      const overdue = hrs !== null && hrs > 24;
      const ageLabel = hrs === null ? '' : overdue
        ? `🚨 En retard de ${Math.round(hrs - 24)}h`
        : `🕐 Reçu il y a ${hrs < 1 ? '<1h' : Math.round(hrs) + 'h'}`;
      return `
      <div class="pending-row" data-id="${u.id}" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--white);border:1.5px solid ${overdue ? '#fca5a5' : 'var(--gray-bd)'};border-left:4px solid ${overdue ? '#dc2626' : '#f97316'};border-radius:6px;margin-bottom:8px;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;color:var(--navy);font-size:13px;">${esc(fullName(u))}</div>
          <div style="font-size:11px;color:var(--gray-txt);margin-top:2px;">${esc(ROLE_LABELS[u.role] || u.role)}${u.club || u.nomOrganisation ? ' • ' + esc(u.club || u.nomOrganisation) : ''}${ageLabel ? ' • ' + ageLabel : ''}</div>
          ${needsOwner ? `<div style="font-size:10px;color:#f97316;margin-top:4px;">🔒 En attente de revendication par : ${esc(u.ownerRef?.clubName || 'un club')}</div>` : ''}
          ${autoDetected ? `<div style="font-size:10px;color:#1e40af;margin-top:4px;">🤖 Structure détectée automatiquement — à confirmer</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn-sm btn-pending-view" data-id="${u.id}">👁️ Voir</button>
          <button class="btn-sm btn-pending-validate" data-id="${u.id}" style="background:var(--green);color:#fff;border-color:var(--green);">✅ Valider</button>
        </div>
      </div>`;
    }).join('');

    listEl.querySelectorAll('.btn-pending-view').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPlayerModal(btn.dataset.id);
    }));
    listEl.querySelectorAll('.btn-pending-validate').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openValidationModal(btn.dataset.id);
    }));
  }

  function openValidationModal(id) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    currentPlayerId = id;
    document.getElementById('validation-player-name').textContent = fullName(u);
    document.getElementById('validation-player-role').textContent = ROLE_LABELS[u.role] || u.role || '';

    const needsAssign = !!u.editLocked && !u.ownerUid && ['pending_owner_claim', 'pending_owner_claim_ambiguous'].includes(u.ownershipStatus);
    const needsReview = !!u.editLocked && !!u.ownerUid && u.ownershipStatus === 'owner_confirmed_auto';
    const ownerSection = document.getElementById('validation-owner-section');
    if (ownerSection) {
      i
