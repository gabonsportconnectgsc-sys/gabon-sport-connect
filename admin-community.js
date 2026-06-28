/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN-COMMUNITY.JS — Système d'Administration et Modération Communautaire
   Version 1.0 — Gestion des posts, commentaires, signalements, utilisateurs
   Firebase Firestore v10 Modulaire — Temps réel
   ═══════════════════════════════════════════════════════════════════════════ */

(function(window){
  'use strict';

  const POSTS_COLLECTION = 'community_posts';
  const COMMENTS_COLLECTION = 'community_comments';
  const REACTIONS_COLLECTION = 'community_reactions';
  const REPORTS_COLLECTION = 'community_reports';
  const BLOCKS_COLLECTION = 'community_blocks';

  let _posts = {};
  let _comments = {};
  let _reactions = {};
  let _reports = {};
  let _blocks = {};
  let _unsubscribers = [];
  let _filters = { status: 'all', searchTerm: '' };
  let _stats = { totalPosts: 0, totalComments: 0, totalReports: 0, activeUsers: 0, totalReactions: 0 };

  function timeAgo(ts) {
    if (!ts) return 'À l\'instant';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - date.getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'À l\'instant';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}j`;
    return date.toLocaleDateString('fr-FR');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function updateStats() {
    _stats.totalPosts = Object.keys(_posts).length;
    _stats.totalComments = Object.keys(_comments).length;
    _stats.totalReactions = Object.keys(_reactions).length;
    _stats.totalReports = Object.keys(_reports).length;
    const uniqueAuthors = new Set();
    Object.values(_posts).forEach(p => uniqueAuthors.add(p.authorId));
    Object.values(_comments).forEach(c => uniqueAuthors.add(c.authorId));
    _stats.activeUsers = uniqueAuthors.size;
    renderStats();
  }

  function renderStats() {
    const stats = document.getElementById('admin-community-stats');
    if (!stats) return;

    stats.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
        <div style="background:#fff;padding:16px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.08);">
          <div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:8px;">📰 Posts</div>
          <div style="font-size:28px;font-weight:800;color:#009E60;">${_stats.totalPosts}</div>
        </div>
        <div style="background:#fff;padding:16px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.08);">
          <div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:8px;">💬 Commentaires</div>
          <div style="font-size:28px;font-weight:800;color:#3b82f6;">${_stats.totalComments}</div>
        </div>
        <div style="background:#fff;padding:16px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.08);">
          <div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:8px;">👍 Réactions</div>
          <div style="font-size:28px;font-weight:800;color:#f59e0b;">${_stats.totalReactions}</div>
        </div>
        <div style="background:#fff;padding:16px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.08);">
          <div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:8px;">👤 Utilisateurs actifs</div>
          <div style="font-size:28px;font-weight:800;color:#8b5cf6;">${_stats.activeUsers}</div>
        </div>
        <div style="background:#fff;padding:16px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.08);">
          <div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:8px;">⚠️ Signalements</div>
          <div style="font-size:28px;font-weight:800;color:#ef4444;">${_stats.totalReports}</div>
        </div>
      </div>
    `;
  }

  function renderPostsTable() {
    const container = document.getElementById('admin-community-posts-table');
    if (!container) return;

    const posts = Object.values(_posts).sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return bTime - aTime;
    });

    if (posts.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;"><p>Aucun post</p></div>';
      return;
    }

    let html = '<div style="overflow-x:auto;">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
    html += '<thead><tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">';
    html += '<th style="padding:12px;text-align:left;font-weight:700;color:#0A1628;">Auteur</th>';
    html += '<th style="padding:12px;text-align:left;font-weight:700;color:#0A1628;">Contenu</th>';
    html += '<th style="padding:12px;text-align:center;font-weight:700;color:#0A1628;">Réactions</th>';
    html += '<th style="padding:12px;text-align:center;font-weight:700;color:#0A1628;">Commentaires</th>';
    html += '<th style="padding:12px;text-align:center;font-weight:700;color:#0A1628;">Signalements</th>';
    html += '<th style="padding:12px;text-align:left;font-weight:700;color:#0A1628;">Date</th>';
    html += '<th style="padding:12px;text-align:center;font-weight:700;color:#0A1628;">Actions</th>';
    html += '</tr></thead><tbody>';

    posts.forEach(post => {
      const reportCount = Object.values(_reports).filter(r => r.postId === post.id).length;
      const commentCount = Object.values(_comments).filter(c => c.postId === post.id).length;
      const reactionCount = Object.values(_reactions).filter(r => r.postId === post.id).length;
      const contentPreview = post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '');

      html += `<tr style="border-bottom:1px solid #e2e8f0;hover:background:#f8fafc;">`;
      html += `<td style="padding:12px;"><strong>${escapeHtml(post.authorName)}</strong><br><small style="color:#94a3b8;">${post.authorId}</small></td>`;
      html += `<td style="padding:12px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(contentPreview)}</td>`;
      html += `<td style="padding:12px;text-align:center;color:#f59e0b;font-weight:600;">${reactionCount}</td>`;
      html += `<td style="padding:12px;text-align:center;color:#3b82f6;font-weight:600;">${commentCount}</td>`;
      html += `<td style="padding:12px;text-align:center;"><span style="background:${reportCount > 0 ? '#fee2e2' : '#e6f7ef'};color:${reportCount > 0 ? '#ef4444' : '#009E60'};padding:4px 8px;border-radius:4px;font-weight:600;">${reportCount}</span></td>`;
      html += `<td style="padding:12px;color:#94a3b8;">${timeAgo(post.createdAt)}</td>`;
      html += `<td style="padding:12px;text-align:center;">`;
      html += `<button class="btn-view-post" data-post-id="${post.id}" style="padding:4px 8px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;font-size:11px;margin-right:4px;">👁️</button>`;
      if (reportCount > 0) {
        html += `<button class="btn-view-reports" data-post-id="${post.id}" style="padding:4px 8px;background:#fee2e2;border:none;border-radius:4px;cursor:pointer;font-size:11px;color:#ef4444;margin-right:4px;">📋</button>`;
      }
      html += `<button class="btn-delete-post" data-post-id="${post.id}" style="padding:4px 8px;background:#fee2e2;border:none;border-radius:4px;cursor:pointer;font-size:11px;color:#ef4444;">🗑️</button>`;
      html += `</td>`;
      html += `</tr>`;
    });

    html += '</tbody></table>';
    html += '</div>';
    container.innerHTML = html;
    attachPostTableListeners();
  }

  function renderReportsTable() {
    const container = document.getElementById('admin-community-reports-table');
    if (!container) return;

    const reports = Object.values(_reports).sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return bTime - aTime;
    });

    if (reports.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;"><p>Aucun signalement</p></div>';
      return;
    }

    let html = '<div style="overflow-x:auto;">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
    html += '<thead><tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">';
    html += '<th style="padding:12px;text-align:left;font-weight:700;color:#0A1628;">Post ID</th>';
    html += '<th style="padding:12px;text-align:left;font-weight:700;color:#0A1628;">Raison</th>';
    html += '<th style="padding:12px;text-align:left;font-weight:700;color:#0A1628;">Signalé par</th>';
    html += '<th style="padding:12px;text-align:left;font-weight:700;color:#0A1628;">Statut</th>';
    html += '<th style="padding:12px;text-align:left;font-weight:700;color:#0A1628;">Date</th>';
    html += '<th style="padding:12px;text-align:center;font-weight:700;color:#0A1628;">Actions</th>';
    html += '</tr></thead><tbody>';

    reports.forEach(report => {
      const post = _posts[report.postId];
      const statusBg = report.status === 'pending' ? '#fef3c7' : report.status === 'approved' ? '#dcfce7' : '#fee2e2';
      const statusColor = report.status === 'pending' ? '#92400e' : report.status === 'approved' ? '#166534' : '#991b1b';
      const statusLabel = report.status === 'pending' ? 'En attente' : report.status === 'approved' ? 'Approuvé' : 'Rejeté';

      html += `<tr style="border-bottom:1px solid #e2e8f0;">`;
      html += `<td style="padding:12px;"><code style="background:#f1f5f9;padding:2px 6px;border-radius:3px;font-size:11px;">${report.postId.substring(0, 8)}...</code></td>`;
      html += `<td style="padding:12px;"><strong>${escapeHtml(report.reason)}</strong></td>`;
      html += `<td style="padding:12px;font-size:12px;color:#94a3b8;">${report.reportedBy}</td>`;
      html += `<td style="padding:12px;"><span style="background:${statusBg};color:${statusColor};padding:4px 8px;border-radius:4px;font-weight:600;font-size:11px;">${statusLabel}</span></td>`;
      html += `<td style="padding:12px;color:#94a3b8;">${timeAgo(report.createdAt)}</td>`;
      html += `<td style="padding:12px;text-align:center;">`;
      html += `<button class="btn-view-report-post" data-post-id="${report.postId}" style="padding:4px 8px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;font-size:11px;margin-right:4px;">👁️</button>`;
      if (report.status === 'pending') {
        html += `<button class="btn-approve-report" data-report-id="${report.id}" style="padding:4px 8px;background:#dcfce7;border:none;border-radius:4px;cursor:pointer;font-size:11px;color:#166534;margin-right:4px;">✓</button>`;
        html += `<button class="btn-reject-report" data-report-id="${report.id}" style="padding:4px 8px;background:#fee2e2;border:none;border-radius:4px;cursor:pointer;font-size:11px;color:#ef4444;">✕</button>`;
      }
      html += `</td>`;
      html += `</tr>`;
    });

    html += '</tbody></table>';
    html += '</div>';
    container.innerHTML = html;
    attachReportTableListeners();
  }

  function renderUsersList() {
    const container = document.getElementById('admin-community-users-list');
    if (!container) return;

    const userActivity = {};
    Object.values(_posts).forEach(p => {
      if (!userActivity[p.authorId]) {
        userActivity[p.authorId] = { name: p.authorName, posts: 0, comments: 0, avatar: p.authorAvatar };
      }
      userActivity[p.authorId].posts++;
    });

    Object.values(_comments).forEach(c => {
      if (!userActivity[c.authorId]) {
        userActivity[c.authorId] = { name: c.authorName, posts: 0, comments: 0, avatar: c.authorAvatar };
      }
      userActivity[c.authorId].comments++;
    });

    const users = Object.entries(userActivity).sort((a, b) => (b[1].posts + b[1].comments) - (a[1].posts + a[1].comments));

    if (users.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;"><p>Aucun utilisateur</p></div>';
      return;
    }

    let html = '<div style="overflow-x:auto;">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
    html += '<thead><tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">';
    html += '<th style="padding:12px;text-align:left;font-weight:700;color:#0A1628;">Utilisateur</th>';
    html += '<th style="padding:12px;text-align:center;font-weight:700;color:#0A1628;">Posts</th>';
    html += '<th style="padding:12px;text-align:center;font-weight:700;color:#0A1628;">Commentaires</th>';
    html += '<th style="padding:12px;text-align:center;font-weight:700;color:#0A1628;">Activité totale</th>';
    html += '<th style="padding:12px;text-align:center;font-weight:700;color:#0A1628;">Actions</th>';
    html += '</tr></thead><tbody>';

    users.forEach(([userId, userData]) => {
      const total = userData.posts + userData.comments;
      html += `<tr style="border-bottom:1px solid #e2e8f0;">`;
      html += `<td style="padding:12px;"><div style="display:flex;align-items:center;gap:8px;"><div style="width:32px;height:32px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;color:#64748b;font-size:12px;">${userData.avatar ? '<img src="' + userData.avatar + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">' : userData.name.charAt(0).toUpperCase()}</div><div><strong>${escapeHtml(userData.name)}</strong><br><code style="background:#f1f5f9;padding:2px 4px;border-radius:3px;font-size:10px;color:#94a3b8;">${userId.substring(0, 8)}...</code></div></div></td>`;
      html += `<td style="padding:12px;text-align:center;color:#3b82f6;font-weight:600;">${userData.posts}</td>`;
      html += `<td style="padding:12px;text-align:center;color:#3b82f6;font-weight:600;">${userData.comments}</td>`;
      html += `<td style="padding:12px;text-align:center;font-weight:600;color:#009E60;">${total}</td>`;
      html += `<td style="padding:12px;text-align:center;">`;
      html += `<button class="btn-block-user" data-user-id="${userId}" style="padding:4px 8px;background:#fee2e2;border:none;border-radius:4px;cursor:pointer;font-size:11px;color:#ef4444;">🔒 Bloquer</button>`;
      html += `</td>`;
      html += `</tr>`;
    });

    html += '</tbody></table>';
    html += '</div>';
    container.innerHTML = html;
    attachUserListListeners();
  }

  function attachPostTableListeners() {
    document.querySelectorAll('.btn-delete-post').forEach(btn => {
      btn.addEventListener('click', function() {
        const postId = this.dataset.postId;
        if (confirm('Supprimer ce post ? Cette action est irréversible.')) {
          deletePost(postId);
        }
      });
    });

    document.querySelectorAll('.btn-view-post').forEach(btn => {
      btn.addEventListener('click', function() {
        const postId = this.dataset.postId;
        const post = _posts[postId];
        if (post) showPostDetail(postId, post);
      });
    });

    document.querySelectorAll('.btn-view-reports').forEach(btn => {
      btn.addEventListener('click', function() {
        const postId = this.dataset.postId;
        const postReports = Object.values(_reports).filter(r => r.postId === postId);
        showReportsDetail(postReports);
      });
    });
  }

  function attachReportTableListeners() {
    document.querySelectorAll('.btn-approve-report').forEach(btn => {
      btn.addEventListener('click', function() {
        const reportId = this.dataset.reportId;
        updateReportStatus(reportId, 'approved');
      });
    });

    document.querySelectorAll('.btn-reject-report').forEach(btn => {
      btn.addEventListener('click', function() {
        const reportId = this.dataset.reportId;
        updateReportStatus(reportId, 'rejected');
      });
    });

    document.querySelectorAll('.btn-view-report-post').forEach(btn => {
      btn.addEventListener('click', function() {
        const postId = this.dataset.postId;
        const post = _posts[postId];
        if (post) showPostDetail(postId, post);
      });
    });
  }

  function attachUserListListeners() {
    document.querySelectorAll('.btn-block-user').forEach(btn => {
      btn.addEventListener('click', function() {
        const userId = this.dataset.userId;
        blockUser(userId);
      });
    });
  }

  async function deletePost(postId) {
    try {
      const { doc, deleteDoc } = window;
      await deleteDoc(doc(window.db, POSTS_COLLECTION, postId));
      delete _posts[postId];
      renderPostsTable();
      updateStats();
      showToast('Post supprimé', 'success');
    } catch (error) {
      console.error('Erreur suppression:', error);
      showToast('Erreur lors de la suppression', 'error');
    }
  }

  async function updateReportStatus(reportId, status) {
    try {
      const { doc, updateDoc } = window;
      await updateDoc(doc(window.db, REPORTS_COLLECTION, reportId), { status });
      _reports[reportId].status = status;
      renderReportsTable();
      showToast(`Signalement ${status === 'approved' ? 'approuvé' : 'rejeté'}`, 'success');
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  }

  async function blockUser(userId) {
    try {
      const { collection, addDoc, serverTimestamp } = window;
      await addDoc(collection(window.db, BLOCKS_COLLECTION), {
        blockerId: 'admin',
        blockedId: userId,
        createdAt: serverTimestamp()
      });
      showToast('Utilisateur bloqué', 'success');
      renderUsersList();
    } catch (error) {
      console.error('Erreur blocage:', error);
      showToast('Erreur lors du blocage', 'error');
    }
  }

  function showPostDetail(postId, post) {
    const modal = document.createElement('div');
    const comments = Object.values(_comments).filter(c => c.postId === postId && !c.parentId);
    const reactions = Object.values(_reactions).filter(r => r.postId === postId);

    modal.innerHTML = `
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:12px;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,.2);z-index:10001;width:90%;max-width:600px;max-height:80vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;font-weight:700;font-size:18px;color:#0A1628;">Détail du post</h3>
          <button onclick="this.closest('[data-modal]').remove();this.closest('[data-modal]').previousElementSibling.remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;">✕</button>
        </div>

        <div style="background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:16px;">
          <div style="margin-bottom:8px;"><strong style="color:#0A1628;">Auteur:</strong> ${escapeHtml(post.authorName)}</div>
          <div style="margin-bottom:8px;"><strong style="color:#0A1628;">ID:</strong> <code style="background:#fff;padding:2px 6px;border-radius:3px;font-size:12px;">${post.id}</code></div>
          <div style="margin-bottom:8px;"><strong style="color:#0A1628;">Date:</strong> ${new Date(post.createdAt?.toDate?.() || post.createdAt).toLocaleString('fr-FR')}</div>
          <div style="margin-bottom:8px;"><strong style="color:#0A1628;">Réactions:</strong> ${reactions.length}</div>
          <div style="margin-bottom:8px;"><strong style="color:#0A1628;">Commentaires:</strong> ${comments.length}</div>
        </div>

        <div style="background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:16px;">
          <strong style="color:#0A1628;display:block;margin-bottom:8px;">Contenu:</strong>
          <p style="margin:0;color:#475569;line-height:1.6;word-break:break-word;">${post.content}</p>
        </div>

        <button onclick="this.closest('[data-modal]').remove();this.closest('[data-modal]').previousElementSibling.remove()" style="width:100%;padding:10px;background:#e2e8f0;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Fermer</button>
      </div>
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;"></div>
    `;
    modal.setAttribute('data-modal', '1');
    document.body.appendChild(modal);
  }

  function showReportsDetail(reports) {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:12px;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,.2);z-index:10001;width:90%;max-width:500px;max-height:80vh;overflow-y:auto;">
        <h3 style="margin:0 0 16px;font-weight:700;font-size:18px;color:#0A1628;">Signalements (${reports.length})</h3>
        <div style="max-height:400px;overflow-y:auto;">
          ${reports.map(r => `
            <div style="background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:8px;border-left:3px solid #ef4444;">
              <div style="margin-bottom:6px;"><strong>${escapeHtml(r.reason)}</strong></div>
              <div style="font-size:12px;color:#94a3b8;">Signalé par: ${r.reportedBy}</div>
              <div style="font-size:12px;color:#94a3b8;">Date: ${timeAgo(r.createdAt)}</div>
            </div>
          `).join('')}
        </div>
        <button onclick="this.closest('[data-modal]').remove();this.closest('[data-modal]').previousElementSibling.remove()" style="width:100%;padding:10px;margin-top:16px;background:#e2e8f0;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Fermer</button>
      </div>
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;"></div>
    `;
    modal.setAttribute('data-modal', '1');
    document.body.appendChild(modal);
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:${type === 'success' ? '#009E60' : type === 'error' ? '#ef4444' : '#0A1628'};color:#fff;padding:12px 20px;border-radius:8px;z-index:10002;font-weight:600;font-size:14px;`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function subscribeToPosts() {
    if (!window.db) return;
    const { collection, onSnapshot } = window;
    const unsubscribe = onSnapshot(
      collection(window.db, POSTS_COLLECTION),
      (snap) => {
        _posts = {};
        snap.docs.forEach(doc => {
          _posts[doc.id] = { id: doc.id, ...doc.data() };
        });
        renderPostsTable();
        updateStats();
      },
      (error) => console.error('Posts sync error:', error)
    );
    _unsubscribers.push(unsubscribe);
  }

  function subscribeToComments() {
    if (!window.db) return;
    const { collection, onSnapshot } = window;
    const unsubscribe = onSnapshot(
      collection(window.db, COMMENTS_COLLECTION),
      (snap) => {
        _comments = {};
        snap.docs.forEach(doc => {
          _comments[doc.id] = { id: doc.id, ...doc.data() };
        });
        renderUsersList();
        updateStats();
      },
      (error) => console.error('Comments sync error:', error)
    );
    _unsubscribers.push(unsubscribe);
  }

  function subscribeToReactions() {
    if (!window.db) return;
    const { collection, onSnapshot } = window;
    const unsubscribe = onSnapshot(
      collection(window.db, REACTIONS_COLLECTION),
      (snap) => {
        _reactions = {};
        snap.docs.forEach(doc => {
          _reactions[doc.id] = { id: doc.id, ...doc.data() };
        });
        updateStats();
      },
      (error) => console.error('Reactions sync error:', error)
    );
    _unsubscribers.push(unsubscribe);
  }

  function subscribeToReports() {
    if (!window.db) return;
    const { collection, onSnapshot } = window;
    const unsubscribe = onSnapshot(
      collection(window.db, REPORTS_COLLECTION),
      (snap) => {
        _reports = {};
        snap.docs.forEach(doc => {
          _reports[doc.id] = { id: doc.id, ...doc.data() };
        });
        renderReportsTable();
        updateStats();
      },
      (error) => console.error('Reports sync error:', error)
    );
    _unsubscribers.push(unsubscribe);
  }

  function unsubscribeAll() {
    _unsubscribers.forEach(unsub => unsub());
    _unsubscribers = [];
  }

  window.GSCAdminCommunity = {
    init() {
      subscribeToPosts();
      subscribeToComments();
      subscribeToReactions();
      subscribeToReports();
    },
    renderAll() {
      renderStats();
      renderPostsTable();
      renderReportsTable();
      renderUsersList();
    },
    destroy() {
      unsubscribeAll();
    }
  };

})(window);
