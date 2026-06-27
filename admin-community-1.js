/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN-COMMUNITY.JS — Modération du fil communautaire (GSC Admin)
   Signalements · publications · blocages
   ─────────────────────────────────────────────────────────────────────────
   Intégration : ajouter dans admin.html, après admin-controller.js :
     <script src="admin-community.js"></script>
   Le module s'auto-injecte (bouton de navigation "Modération" + section)
   dans le sidebar / mobile-nav / .main-content existants.
   Collections Firestore (API compat) : signalements, communityPosts,
   communityPosts/{id}/comments, blocages.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (window) {
  'use strict';

  const POSTS_COL = 'communityPosts';
  const REPORTS_COL = 'signalements';
  const BLOCKS_COL = 'blocages';
  const NEWS_COL = 'actualites';

  let _reports = [], _posts = [], _blocks = [], _news = [];
  let _reportsShowAll = false;
  let _postsStatusFilter = 'all';
  let _subTab = 'reports';
  let _unsubs = [];
  let _mounted = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function fmtDate(ts) {
    try {
      if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleString('fr-FR');
      if (ts instanceof Date) return ts.toLocaleString('fr-FR');
      return '—';
    } catch (e) { return '—'; }
  }
  function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
  async function withAuth(fn) {
    if (typeof window.ensureFirebaseAuthViaSupabase === 'function') {
      try { await window.ensureFirebaseAuthViaSupabase(); } catch (e) {}
    }
    return fn();
  }
  function db() { return window.db; }
  function ready() { return !!window.db && typeof window.db.collection === 'function'; }
  function currentAdminUid() {
    try { return window._fbAuth?.currentUser?.uid || 'admin'; } catch (e) { return 'admin'; }
  }
  /* Écrit directement dans la collection 'notifications' (même schéma que GSCNotif
     côté index.html) afin que l'auteur soit notifié en temps réel des décisions
     de modération, même si admin.html ne charge pas gsc-notifications.js. */
  async function notifyUser(recipientId, type, title, body) {
    if (!recipientId || !ready()) return;
    try {
      await withAuth(() => db().collection('notifications').add({
        type, title, body, recipientId, personal: true, read: false,
        link: 'index.html#actualites', createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }));
    } catch (e) {}
  }

  const REASON_LABELS = {
    spam: 'Spam / publicité', haine: 'Propos haineux', violence: 'Violence',
    inapproprie: 'Contenu inapproprié', fake: 'Fausse information', autre: 'Autre'
  };
  const STATUS_LABELS = {
    pending: '🟡 En attente', reviewed: '✅ Traité', dismissed: '⚪ Rejeté'
  };
  const POST_STATUS_LABELS = {
    visible: '🟢 Visible', hidden: '🟠 Masqué (signalé)', removed: '🔴 Supprimé'
  };

  /* ═══ STYLES ═══ */
  function injectStyles() {
    if (document.getElementById('gsc-admin-community-styles')) return;
    const s = document.createElement('style');
    s.id = 'gsc-admin-community-styles';
    s.textContent = `
.gac-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:16px;}
@media(max-width:900px){.gac-stats{grid-template-columns:repeat(3,1fr);}}
@media(max-width:560px){.gac-stats{grid-template-columns:repeat(2,1fr);}}
.gac-stat{background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);padding:14px;text-align:center;}
.gac-stat-val{font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--navy);}
.gac-stat-lbl{font-size:11px;color:var(--gray-txt);margin-top:2px;}
.gac-tabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.gac-tab{padding:8px 16px;border-radius:18px;border:1.5px solid var(--gray-bd);background:#fff;font-size:12.5px;font-weight:700;color:var(--gray-txt);cursor:pointer;}
.gac-tab.active{background:var(--green);color:#fff;border-color:var(--green);}
.gac-filterbar{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
.gac-filterbar select,.gac-filterbar label{font-size:12px;color:var(--gray-txt);}
.gac-snippet{max-width:280px;font-size:12px;color:var(--navy);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.gac-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:700;background:var(--gray-bg);color:var(--navy);}
.gac-badge.warn{background:#fef3c7;color:#92400e;}
.gac-badge.danger{background:#fee2e2;color:#991b1b;}
.gac-actions-cell{display:flex;gap:6px;flex-wrap:wrap;}
.gac-empty{text-align:center;padding:30px;color:var(--gray-txt);font-size:13px;}
`;
    document.head.appendChild(s);
  }

  /* ═══ INJECTION NAVIGATION + SECTION ═══ */
  function mountUI() {
    if (_mounted) return;
    if (!document.querySelector('.sidebar-nav') || !document.querySelector('.mobile-nav') || !document.querySelector('.main-content')) return;
    _mounted = true;
    injectStyles();

    /* Bouton sidebar */
    const sidebarNav = document.querySelector('.sidebar-nav');
    const navBtn = document.createElement('button');
    navBtn.className = 'nav-item';
    navBtn.id = 'nav-moderation';
    navBtn.innerHTML = '<span class="nav-icon">🚩</span><span>Modération</span><span id="gac-nav-badge" style="margin-left:auto;background:var(--danger);color:#fff;font-size:10px;font-weight:800;border-radius:9px;min-width:17px;height:17px;display:none;align-items:center;justify-content:center;padding:0 4px;"></span>';
    const appLabel = Array.from(sidebarNav.querySelectorAll('.nav-label')).find(l => l.textContent.trim() === 'Application');
    if (appLabel) sidebarNav.insertBefore(navBtn, appLabel);
    else sidebarNav.appendChild(navBtn);

    /* Bouton mobile-nav */
    const mobileNav = document.querySelector('.mobile-nav');
    const mnBtn = document.createElement('button');
    mnBtn.className = 'mn-btn';
    mnBtn.id = 'mnav-moderation';
    mnBtn.innerHTML = '<span class="mn-icon">🚩</span><span>Modér.</span><span id="gac-mnav-badge" style="position:absolute;top:2px;right:18%;background:var(--danger);color:#fff;font-size:9px;font-weight:800;border-radius:8px;min-width:15px;height:15px;display:none;align-items:center;justify-content:center;padding:0 3px;"></span>';
    mnBtn.style.position = 'relative';
    mobileNav.appendChild(mnBtn);

    /* Section de contenu */
    const main = document.querySelector('.main-content');
    const section = document.createElement('div');
    section.id = 'moderation';
    section.className = 'section';
    section.innerHTML = buildSectionSkeleton();
    main.appendChild(section);

    navBtn.addEventListener('click', activateModeration);
    mnBtn.addEventListener('click', activateModeration);

    section.querySelector('#gac-tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-subtab]');
      if (!btn) return;
      _subTab = btn.dataset.subtab;
      renderActiveTab();
    });
    section.querySelector('#gac-reports-showall')?.addEventListener('change', (e) => {
      _reportsShowAll = e.target.checked;
      renderReports();
    });
    section.querySelector('#gac-posts-filter')?.addEventListener('change', (e) => {
      _postsStatusFilter = e.target.value;
      renderPosts();
    });

    subscribeAll();
  }

  function buildSectionSkeleton() {
    return `
      <div class="admin-header">
        <div class="admin-header-title">🚩 Modération du fil communautaire</div>
        <div class="admin-header-sub">Signalements, publications, actualités et blocages des membres</div>
      </div>
      <div class="gac-stats" id="gac-stats" style="grid-template-columns:repeat(5,1fr);">
        <div class="gac-stat"><div class="gac-stat-val" id="gac-stat-pending">—</div><div class="gac-stat-lbl">Signalements en attente</div></div>
        <div class="gac-stat"><div class="gac-stat-val" id="gac-stat-hidden">—</div><div class="gac-stat-lbl">Publications masquées</div></div>
        <div class="gac-stat"><div class="gac-stat-val" id="gac-stat-posts">—</div><div class="gac-stat-lbl">Publications totales</div></div>
        <div class="gac-stat"><div class="gac-stat-val" id="gac-stat-news">—</div><div class="gac-stat-lbl">Actualités publiées</div></div>
        <div class="gac-stat"><div class="gac-stat-val" id="gac-stat-blocks">—</div><div class="gac-stat-lbl">Blocages actifs</div></div>
      </div>
      <div class="gac-tabs" id="gac-tabs">
        <button class="gac-tab active" data-subtab="reports" type="button">🚩 Signalements</button>
        <button class="gac-tab" data-subtab="posts" type="button">📝 Publications</button>
        <button class="gac-tab" data-subtab="news" type="button">📰 Actualités</button>
        <button class="gac-tab" data-subtab="blocks" type="button">🚫 Blocages</button>
      </div>
      <div id="gac-pane"></div>`;
  }

  function activateModeration() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('moderation')?.classList.add('active');
    document.querySelectorAll('.nav-item, .mn-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-moderation')?.classList.add('active');
    document.getElementById('mnav-moderation')?.classList.add('active');
    const titleEl = document.getElementById('topbar-title');
    if (titleEl && titleEl.firstChild) titleEl.firstChild.textContent = 'Modération';
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
    renderActiveTab();
  }

  /* ═══ ABONNEMENTS TEMPS RÉEL ═══ */
  function subscribeAll() {
    if (!ready()) { setTimeout(subscribeAll, 800); return; }
    try {
      _unsubs.push(db().collection(REPORTS_COL).orderBy('createdAt', 'desc').limit(300).onSnapshot(snap => {
        _reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderStats(); if (_subTab === 'reports' && isActive()) renderReports();
      }, () => {}));
      _unsubs.push(db().collection(POSTS_COL).orderBy('createdAt', 'desc').limit(300).onSnapshot(snap => {
        _posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderStats(); if (_subTab === 'posts' && isActive()) renderPosts();
      }, () => {}));
      _unsubs.push(db().collection(BLOCKS_COL).orderBy('createdAt', 'desc').limit(300).onSnapshot(snap => {
        _blocks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderStats(); if (_subTab === 'blocks' && isActive()) renderBlocks();
      }, () => {}));
      _unsubs.push(db().collection(NEWS_COL).orderBy('createdAt', 'desc').limit(300).onSnapshot(snap => {
        _news = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderStats(); if (_subTab === 'news' && isActive()) renderNews();
      }, () => {}));
    } catch (e) { console.warn('Modération GSC :', e); }
  }
  function isActive() { return document.getElementById('moderation')?.classList.contains('active'); }

  function renderStats() {
    const pending = _reports.filter(r => r.status === 'pending' || !r.status).length;
    const hidden = _posts.filter(p => p.status === 'hidden').length;
    const blocksActive = _blocks.length;
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt('gac-stat-pending', pending);
    setTxt('gac-stat-hidden', hidden);
    setTxt('gac-stat-posts', _posts.filter(p => p.status !== 'removed').length);
    setTxt('gac-stat-news', _news.length);
    setTxt('gac-stat-blocks', blocksActive);
    [['gac-nav-badge', 'flex'], ['gac-mnav-badge', 'flex']].forEach(([id, disp]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (pending > 0) { el.textContent = pending > 99 ? '99+' : String(pending); el.style.display = disp; }
      else el.style.display = 'none';
    });
  }

  function renderActiveTab() {
    document.querySelectorAll('#gac-tabs .gac-tab').forEach(b => b.classList.toggle('active', b.dataset.subtab === _subTab));
    if (_subTab === 'reports') renderReports();
    else if (_subTab === 'posts') renderPosts();
    else if (_subTab === 'news') renderNews();
    else renderBlocks();
  }

  /* ═══ SIGNALEMENTS ═══ */
  function renderReports() {
    const pane = document.getElementById('gac-pane');
    if (!pane) return;
    let list = _reports.slice();
    if (!_reportsShowAll) list = list.filter(r => r.status === 'pending' || !r.status);
    pane.innerHTML = `
      <div class="gac-filterbar">
        <label><input type="checkbox" id="gac-reports-showall" ${_reportsShowAll ? 'checked' : ''}> Afficher les signalements traités</label>
      </div>
      ${!list.length ? `<div class="gac-empty">Aucun signalement ${_reportsShowAll ? '' : 'en attente'}.</div>` : `
      <div class="users-table-wrap">
        <table class="users-table">
          <thead><tr><th>Type</th><th>Motif</th><th>Détail</th><th>Signalé par</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>${list.map(reportRow).join('')}</tbody>
        </table>
      </div>`}`;
    pane.querySelector('#gac-reports-showall')?.addEventListener('change', (e) => { _reportsShowAll = e.target.checked; renderReports(); });
    pane.querySelectorAll('.gac-act-dismiss').forEach(b => b.addEventListener('click', () => updateReportStatus(b.dataset.id, 'dismissed')));
    pane.querySelectorAll('.gac-act-resolve').forEach(b => b.addEventListener('click', () => updateReportStatus(b.dataset.id, 'reviewed')));
    pane.querySelectorAll('.gac-act-remove-content').forEach(b => b.addEventListener('click', () => removeReportedContent(b.dataset.id)));
  }

  function reportRow(r) {
    const post = _posts.find(p => p.id === r.postId);
    const typeLabel = r.type === 'comment' ? '💬 Commentaire' : '📝 Publication';
    return `
      <tr data-id="${r.id}">
        <td data-label="Type">${typeLabel}${post ? `<div class="gac-snippet">${esc((post.text || '').slice(0, 90))}</div>` : ''}</td>
        <td data-label="Motif"><span class="gac-badge warn">${esc(REASON_LABELS[r.reason] || r.reason || '—')}</span></td>
        <td data-label="Détail"><div class="gac-snippet">${esc(r.detail || '—')}</div></td>
        <td data-label="Signalé par">${esc(r.reporterName || '—')}</td>
        <td data-label="Date">${fmtDate(r.createdAt)}</td>
        <td data-label="Statut">${STATUS_LABELS[r.status] || STATUS_LABELS.pending}</td>
        <td data-label="Actions">
          <div class="gac-actions-cell">
            ${(r.status === 'pending' || !r.status) ? `
              <button class="btn-sm gac-act-resolve" data-id="${r.id}">✅ Traiter</button>
              <button class="btn-sm gac-act-dismiss" data-id="${r.id}">⚪ Rejeter</button>
              <button class="btn-sm btn-danger gac-act-remove-content" data-id="${r.id}">🗑️ Supprimer le contenu</button>
            ` : '—'}
          </div>
        </td>
      </tr>`;
  }

  async function updateReportStatus(id, status) {
    try {
      await withAuth(() => db().collection(REPORTS_COL).doc(id).update({ status, moderatedAt: firebase.firestore.FieldValue.serverTimestamp(), moderatedBy: currentAdminUid() }));
      toast(status === 'reviewed' ? '✅ Signalement traité.' : '⚪ Signalement rejeté.', 'success');
    } catch (e) { toast('Erreur lors de la mise à jour.', 'error'); }
  }

  async function removeReportedContent(reportId) {
    const r = _reports.find(x => x.id === reportId); if (!r) return;
    if (!confirm('Supprimer définitivement le contenu signalé ?')) return;
    try {
      let authorId = null;
      if (r.type === 'comment' && r.postId) {
        await withAuth(() => db().collection(POSTS_COL).doc(r.postId).collection('comments').doc(r.targetId).delete());
      } else {
        const post = _posts.find(p => p.id === r.targetId);
        authorId = post?.authorId || null;
        await withAuth(() => db().collection(POSTS_COL).doc(r.targetId).update({ status: 'removed', removedAt: firebase.firestore.FieldValue.serverTimestamp(), removedBy: currentAdminUid() }));
      }
      await withAuth(() => db().collection(REPORTS_COL).doc(reportId).update({ status: 'reviewed', moderatedAt: firebase.firestore.FieldValue.serverTimestamp(), moderatedBy: currentAdminUid() }));
      if (authorId) notifyUser(authorId, 'alert', 'Votre publication a été supprimée', 'Un modérateur a supprimé votre publication suite à un signalement justifié.');
      toast('🗑️ Contenu supprimé et signalement traité.', 'success');
    } catch (e) { toast('Erreur lors de la suppression.', 'error'); }
  }

  /* ═══ PUBLICATIONS ═══ */
  function renderPosts() {
    const pane = document.getElementById('gac-pane');
    if (!pane) return;
    let list = _posts.slice();
    if (_postsStatusFilter !== 'all') list = list.filter(p => (p.status || 'visible') === _postsStatusFilter);
    pane.innerHTML = `
      <div class="gac-filterbar">
        <label>Statut :
          <select id="gac-posts-filter">
            <option value="all" ${_postsStatusFilter === 'all' ? 'selected' : ''}>Tous</option>
            <option value="visible" ${_postsStatusFilter === 'visible' ? 'selected' : ''}>Visibles</option>
            <option value="hidden" ${_postsStatusFilter === 'hidden' ? 'selected' : ''}>Masquées (signalées)</option>
            <option value="removed" ${_postsStatusFilter === 'removed' ? 'selected' : ''}>Supprimées</option>
          </select>
        </label>
      </div>
      ${!list.length ? `<div class="gac-empty">Aucune publication.</div>` : `
      <div class="users-table-wrap">
        <table class="users-table">
          <thead><tr><th>Auteur</th><th>Contenu</th><th>Catégorie</th><th>Réactions</th><th>Comm.</th><th>Signal.</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>${list.map(postRow).join('')}</tbody>
        </table>
      </div>`}`;
    pane.querySelector('#gac-posts-filter')?.addEventListener('change', (e) => { _postsStatusFilter = e.target.value; renderPosts(); });
    pane.querySelectorAll('.gac-post-restore').forEach(b => b.addEventListener('click', () => restorePost(b.dataset.id)));
    pane.querySelectorAll('.gac-post-hide').forEach(b => b.addEventListener('click', () => hidePost(b.dataset.id)));
    pane.querySelectorAll('.gac-post-remove').forEach(b => b.addEventListener('click', () => removePost(b.dataset.id)));
  }

  function postRow(p) {
    const reactCount = p.reactions ? Object.keys(p.reactions).length : 0;
    const status = p.status || 'visible';
    const badgeClass = status === 'hidden' ? 'warn' : (status === 'removed' ? 'danger' : '');
    return `
      <tr data-id="${p.id}">
        <td data-label="Auteur">${esc(p.authorName || '—')}</td>
        <td data-label="Contenu"><div class="gac-snippet">${esc((p.text || '(image seule)').slice(0, 100))}</div></td>
        <td data-label="Catégorie">${esc(p.category || 'general')}${p.targetRole ? ` <span class="gac-badge">🎯 ${esc(p.targetRole)}</span>` : ''}</td>
        <td data-label="Réactions">${reactCount}</td>
        <td data-label="Comm.">${p.commentsCount || 0}</td>
        <td data-label="Signal."><span class="gac-badge ${p.reportsCount ? 'warn' : ''}">${p.reportsCount || 0}</span></td>
        <td data-label="Date">${fmtDate(p.createdAt)}</td>
        <td data-label="Statut"><span class="gac-badge ${badgeClass}">${POST_STATUS_LABELS[status] || status}</span></td>
        <td data-label="Actions">
          <div class="gac-actions-cell">
            ${status !== 'visible' ? `<button class="btn-sm gac-post-restore" data-id="${p.id}">♻️ Restaurer</button>` : ''}
            ${status === 'visible' ? `<button class="btn-sm gac-post-hide" data-id="${p.id}">🟠 Masquer</button>` : ''}
            ${status !== 'removed' ? `<button class="btn-sm btn-danger gac-post-remove" data-id="${p.id}">🗑️ Supprimer</button>` : ''}
          </div>
        </td>
      </tr>`;
  }

  async function restorePost(id) {
    try {
      const post = _posts.find(p => p.id === id);
      await withAuth(() => db().collection(POSTS_COL).doc(id).update({ status: 'visible', reportsCount: 0 }));
      if (post?.authorId) notifyUser(post.authorId, 'system', 'Votre publication a été restaurée', 'Après vérification, votre publication est de nouveau visible sur le fil communautaire.');
      toast('♻️ Publication restaurée.', 'success');
    } catch (e) { toast('Erreur lors de la restauration.', 'error'); }
  }
  async function hidePost(id) {
    if (!confirm('Masquer cette publication du fil public ?')) return;
    try {
      const post = _posts.find(p => p.id === id);
      await withAuth(() => db().collection(POSTS_COL).doc(id).update({ status: 'hidden' }));
      if (post?.authorId) notifyUser(post.authorId, 'alert', 'Votre publication a été masquée', 'Un modérateur a masqué votre publication du fil communautaire.');
      toast('🟠 Publication masquée.', 'success');
    } catch (e) { toast('Erreur lors du masquage.', 'error'); }
  }
  async function removePost(id) {
    if (!confirm('Supprimer définitivement cette publication ?')) return;
    try {
      const post = _posts.find(p => p.id === id);
      await withAuth(() => db().collection(POSTS_COL).doc(id).update({ status: 'removed', removedAt: firebase.firestore.FieldValue.serverTimestamp(), removedBy: currentAdminUid() }));
      if (post?.authorId) notifyUser(post.authorId, 'alert', 'Votre publication a été supprimée', 'Un modérateur a supprimé cette publication du fil communautaire.');
      toast('🗑️ Publication supprimée.', 'success');
    } catch (e) { toast('Erreur lors de la suppression.', 'error'); }
  }

  /* ═══ ACTUALITÉS ═══ */
  function renderNews() {
    const pane = document.getElementById('gac-pane');
    if (!pane) return;
    if (!_news.length) { pane.innerHTML = `<div class="gac-empty">Aucune actualité publiée.</div>`; return; }
    pane.innerHTML = `
      <div class="users-table-wrap">
        <table class="users-table">
          <thead><tr><th>Titre</th><th>Catégorie</th><th>Tag</th><th>Extrait</th><th>Source</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>${_news.map(n => `
            <tr data-id="${n.id}">
              <td data-label="Titre"><strong>${esc(n.title || '—')}</strong></td>
              <td data-label="Catégorie"><span class="gac-badge">${esc(n.cat || '—')}</span></td>
              <td data-label="Tag">${n.tag ? `<span class="gac-badge warn">${esc(n.tag)}</span>` : '—'}</td>
              <td data-label="Extrait"><div class="gac-snippet">${esc((n.excerpt || '—').slice(0, 100))}</div></td>
              <td data-label="Source">${n.source ? `<a href="${esc(n.source)}" target="_blank" rel="noopener" style="font-size:11px;">🔗 Lien</a>` : '—'}</td>
              <td data-label="Date">${fmtDate(n.createdAt)}</td>
              <td data-label="Actions"><button class="btn-sm btn-danger gac-news-delete" data-id="${n.id}">🗑️ Supprimer</button></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;
    pane.querySelectorAll('.gac-news-delete').forEach(b => b.addEventListener('click', () => deleteNews(b.dataset.id)));
  }

  async function deleteNews(id) {
    if (!confirm('Supprimer définitivement cette actualité ?')) return;
    try {
      await withAuth(() => db().collection(NEWS_COL).doc(id).delete());
      toast('🗑️ Actualité supprimée.', 'success');
    } catch (e) { toast('Erreur lors de la suppression.', 'error'); }
  }

  /* ═══ BLOCAGES ═══ */
  function renderBlocks() {
    const pane = document.getElementById('gac-pane');
    if (!pane) return;
    if (!_blocks.length) { pane.innerHTML = `<div class="gac-empty">Aucun blocage enregistré entre membres.</div>`; return; }
    pane.innerHTML = `
      <div class="users-table-wrap">
        <table class="users-table">
          <thead><tr><th>Membre bloquant</th><th>Membre bloqué</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>${_blocks.map(b => `
            <tr data-id="${b.id}">
              <td data-label="Bloquant">${esc(b.blockerId || '—')}</td>
              <td data-label="Bloqué">${esc(b.blockedName || b.blockedId || '—')}</td>
              <td data-label="Date">${fmtDate(b.createdAt)}</td>
              <td data-label="Actions"><button class="btn-sm btn-danger gac-unblock" data-id="${b.id}">🔓 Débloquer</button></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;
    pane.querySelectorAll('.gac-unblock').forEach(b => b.addEventListener('click', () => unblock(b.dataset.id)));
  }

  async function unblock(id) {
    if (!confirm('Lever ce blocage entre les deux membres ?')) return;
    try {
      await withAuth(() => db().collection(BLOCKS_COL).doc(id).delete());
      toast('🔓 Blocage levé.', 'success');
    } catch (e) { toast('Erreur lors du déblocage.', 'error'); }
  }

  /* ═══ INITIALISATION ═══ */
  function tryMount() {
    if (_mounted) return;
    mountUI();
    if (!_mounted) setTimeout(tryMount, 500);
  }

  if (window._firebaseReady) tryMount();
  document.addEventListener('firebase-ready', tryMount);
  document.addEventListener('DOMContentLoaded', tryMount);
  setTimeout(tryMount, 1200);

})(window);
