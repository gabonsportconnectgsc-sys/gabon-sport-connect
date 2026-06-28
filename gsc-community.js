/* ═══════════════════════════════════════════════════════════════════════════
   GSC-COMMUNITY.JS — Système Complet de Fil Communautaire
   Version 1.0 — Posts, Commentaires, Réactions, Partage, Signalement, Blocage
   Firebase Firestore v10 Modulaire — Temps réel — Responsive Mobile
   ═══════════════════════════════════════════════════════════════════════════ */

(function(window){
  'use strict';

  const POSTS_COLLECTION = 'community_posts';
  const COMMENTS_COLLECTION = 'community_comments';
  const REACTIONS_COLLECTION = 'community_reactions';
  const REPORTS_COLLECTION = 'community_reports';
  const BLOCKS_COLLECTION = 'community_blocks';

  const REACTION_TYPES = {
    like:   { label: 'J\'aime',   emoji: '👍', color: '#3b82f6' },
    love:   { label: 'Amour',     emoji: '❤️', color: '#ef4444' },
    bravo:  { label: 'Bravo',     emoji: '👏', color: '#f59e0b' },
    haha:   { label: 'Hilarant',  emoji: '😄', color: '#fbbf24' },
    wow:    { label: 'Wow',       emoji: '😲', color: '#a78bfa' },
    sad:    { label: 'Triste',    emoji: '😢', color: '#6b7280' }
  };

  let _currentUserId = null;
  let _currentUserName = null;
  let _currentUserAvatar = null;
  let _posts = {};
  let _comments = {};
  let _reactions = {};
  let _blockedUsers = [];
  let _blockedByUsers = [];
  let _unsubscribers = [];
  let _sortOrder = 'recent';

  function timeAgo(ts) {
    if (!ts) return 'À l\'instant';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - date.getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'À l\'instant';
    const m = Math.floor(s / 60);
    if (m < 60) return `Il y a ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Il y a ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `Il y a ${d}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: date.getFullYear() !== new Date().getFullYear() ? '2-digit' : undefined });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatContent(text) {
    let html = escapeHtml(text);
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/@(\w+)/g, '<span style="color:#009E60;font-weight:600;">@$1</span>');
    html = html.replace(/#(\w+)/g, '<span style="color:#3b82f6;font-weight:600;">#$1</span>');
    return html;
  }

  function canEditPost(post) {
    return _currentUserId && post.authorId === _currentUserId;
  }

  function canDeletePost(post) {
    return _currentUserId && post.authorId === _currentUserId;
  }

  function isUserBlocked(userId) {
    return _blockedUsers.includes(userId) || _blockedByUsers.includes(userId);
  }

  async function createPost(content, mediaUrl) {
    if (!_currentUserId || !content.trim()) return;
    if (isUserBlocked(_currentUserId)) {
      showToast('Vous êtes bloqué', 'error');
      return;
    }

    try {
      const { collection, addDoc, serverTimestamp } = window;
      const postRef = await addDoc(collection(window.db, POSTS_COLLECTION), {
        authorId: _currentUserId,
        authorName: _currentUserName || 'Utilisateur anonyme',
        authorAvatar: _currentUserAvatar || '',
        content: content.trim(),
        mediaUrl: mediaUrl || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likes: 0,
        commentsCount: 0,
        reportsCount: 0,
        isEdited: false,
        deleted: false
      });
      renderFeed();
      showToast('Post publié !', 'success');
      return postRef.id;
    } catch (error) {
      console.error('Erreur création post:', error);
      showToast('Erreur lors de la publication', 'error');
    }
  }

  async function updatePost(postId, content, mediaUrl) {
    if (!_currentUserId) return;

    try {
      const { doc, updateDoc, serverTimestamp } = window;
      await updateDoc(doc(window.db, POSTS_COLLECTION, postId), {
        content: content.trim(),
        mediaUrl: mediaUrl || '',
        updatedAt: serverTimestamp(),
        isEdited: true
      });
      renderFeed();
      showToast('Post modifié !', 'success');
    } catch (error) {
      console.error('Erreur modification post:', error);
      showToast('Erreur lors de la modification', 'error');
    }
  }

  async function deletePost(postId) {
    if (!_currentUserId) return;

    if (!confirm('Êtes-vous sûr ? Cette action est irréversible.')) return;

    try {
      const { doc, deleteDoc } = window;
      await deleteDoc(doc(window.db, POSTS_COLLECTION, postId));
      delete _posts[postId];
      renderFeed();
      showToast('Post supprimé', 'success');
    } catch (error) {
      console.error('Erreur suppression post:', error);
      showToast('Erreur lors de la suppression', 'error');
    }
  }

  async function createComment(postId, content, parentCommentId) {
    if (!_currentUserId || !content.trim()) return;
    if (isUserBlocked(_currentUserId)) {
      showToast('Vous êtes bloqué', 'error');
      return;
    }

    try {
      const { collection, addDoc, serverTimestamp } = window;
      await addDoc(collection(window.db, COMMENTS_COLLECTION), {
        postId: postId,
        parentId: parentCommentId || null,
        authorId: _currentUserId,
        authorName: _currentUserName || 'Utilisateur anonyme',
        authorAvatar: _currentUserAvatar || '',
        content: content.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likes: 0,
        deleted: false,
        isEdited: false
      });
      renderFeed();
      showToast('Commentaire ajouté !', 'success');
    } catch (error) {
      console.error('Erreur création commentaire:', error);
      showToast('Erreur lors de l\'ajout du commentaire', 'error');
    }
  }

  async function deleteComment(commentId, postId) {
    if (!_currentUserId) return;

    if (!confirm('Supprimer ce commentaire ?')) return;

    try {
      const { doc, deleteDoc } = window;
      await deleteDoc(doc(window.db, COMMENTS_COLLECTION, commentId));
      renderFeed();
      showToast('Commentaire supprimé', 'success');
    } catch (error) {
      console.error('Erreur suppression commentaire:', error);
      showToast('Erreur lors de la suppression', 'error');
    }
  }

  async function addReaction(postId, reactionType) {
    if (!_currentUserId || !REACTION_TYPES[reactionType]) return;

    try {
      const { collection, query, where, getDocs, doc, deleteDoc, addDoc, serverTimestamp } = window;
      const q = query(
        collection(window.db, REACTIONS_COLLECTION),
        where('postId', '==', postId),
        where('authorId', '==', _currentUserId),
        where('type', '==', reactionType)
      );
      const existing = await getDocs(q);

      if (!existing.empty) {
        await deleteDoc(doc(window.db, REACTIONS_COLLECTION, existing.docs[0].id));
      } else {
        await addDoc(collection(window.db, REACTIONS_COLLECTION), {
          postId: postId,
          authorId: _currentUserId,
          authorName: _currentUserName || 'Utilisateur',
          type: reactionType,
          createdAt: serverTimestamp()
        });
      }
      renderFeed();
    } catch (error) {
      console.error('Erreur réaction:', error);
    }
  }

  function sharePost(postId, post) {
    const url = `${window.location.origin}${window.location.pathname}#community-${postId}`;
    const text = `Découvrez ce post de ${post.authorName}: ${post.content.substring(0, 50)}...`;

    if (navigator.share) {
      navigator.share({ title: 'Gabon Sport Connect', text, url }).catch(() => {});
    } else {
      const encoded = encodeURIComponent(text + ' ' + url);
      const shareLinks = [
        { name: 'WhatsApp', url: `https://wa.me/?text=${encoded}` },
        { name: 'Facebook', url: `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
        { name: 'Twitter', url: `https://twitter.com/intent/tweet?text=${encoded}` }
      ];

      let menu = '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:12px;padding:16px;box-shadow:0 10px 40px rgba(0,0,0,.2);z-index:10001;max-width:300px;">';
      menu += '<p style="margin:0 0 12px;font-weight:700;">Partager via</p>';
      shareLinks.forEach(link => {
        menu += `<button onclick="window.open('${link.url}','_blank','width=600,height=400');this.closest('[data-share-menu]').remove()" style="width:100%;padding:10px;margin:6px 0;border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;cursor:pointer;font-weight:600;">📤 ${link.name}</button>`;
      });
      menu += `<button onclick="navigator.clipboard.writeText('${url}');this.closest('[data-share-menu]').remove();alert('Lien copié!')" style="width:100%;padding:10px;margin:6px 0;border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;cursor:pointer;font-weight:600;">📋 Copier le lien</button>`;
      menu += '</div>';

      const div = document.createElement('div');
      div.innerHTML = menu;
      div.setAttribute('data-share-menu', '1');
      document.body.appendChild(div);
      document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-share-menu]')) div.remove();
      }, { once: true });
    }
  }

  async function reportPost(postId, reason) {
    if (!_currentUserId) return;

    try {
      const { collection, addDoc, serverTimestamp } = window;
      await addDoc(collection(window.db, REPORTS_COLLECTION), {
        postId: postId,
        reportedBy: _currentUserId,
        reason: reason,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      showToast('Signalement enregistré', 'success');
    } catch (error) {
      console.error('Erreur signalement:', error);
      showToast('Erreur lors du signalement', 'error');
    }
  }

  async function blockUser(userId) {
    if (!_currentUserId) return;

    try {
      const { collection, addDoc, serverTimestamp, query, where, getDocs, doc, deleteDoc } = window;

      const q = query(
        collection(window.db, BLOCKS_COLLECTION),
        where('blockerId', '==', _currentUserId),
        where('blockedId', '==', userId)
      );
      const existing = await getDocs(q);

      if (existing.empty) {
        await addDoc(collection(window.db, BLOCKS_COLLECTION), {
          blockerId: _currentUserId,
          blockedId: userId,
          createdAt: serverTimestamp()
        });
        _blockedUsers.push(userId);
        showToast('Utilisateur bloqué', 'success');
      } else {
        await deleteDoc(doc(window.db, BLOCKS_COLLECTION, existing.docs[0].id));
        _blockedUsers = _blockedUsers.filter(id => id !== userId);
        showToast('Utilisateur débloqué', 'success');
      }
      renderFeed();
    } catch (error) {
      console.error('Erreur blocage:', error);
      showToast('Erreur lors du blocage', 'error');
    }
  }

  function renderFeed() {
    const container = document.getElementById('community-feed');
    if (!container) return;

    const posts = Object.values(_posts)
      .filter(p => !p.deleted && !isUserBlocked(p.authorId))
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return _sortOrder === 'recent' ? bTime - aTime : aTime - bTime;
      });

    if (posts.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#94a3b8;"><p style="font-size:40px;margin:0 0 12px;">💭</p><p style="font-weight:600;">Aucun post pour le moment</p></div>';
      return;
    }

    container.innerHTML = posts.map(post => renderPost(post)).join('');
    attachPostListeners();
  }

  function renderPost(post) {
    const comments = Object.values(_comments).filter(c => c.postId === post.id && !c.deleted && !c.parentId);
    const reactions = Object.values(_reactions).filter(r => r.postId === post.id);
    const userReactions = Object.values(_reactions).filter(r => r.postId === post.id && r.authorId === _currentUserId);

    const reactionCounts = {};
    reactions.forEach(r => {
      reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
    });

    let html = `
      <div class="community-post" data-post-id="${post.id}" style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);border:1px solid #e2e8f0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
            <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#009E60,#007a47);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-weight:700;font-size:14px;">
              ${post.authorAvatar ? `<img src="${post.authorAvatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : post.authorName.charAt(0).toUpperCase()}
            </div>
            <div style="min-width:0;flex:1;">
              <div style="font-weight:700;color:#0A1628;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(post.authorName)}</div>
              <div style="font-size:12px;color:#94a3b8;">${timeAgo(post.createdAt)}${post.isEdited ? ' (modifié)' : ''}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            ${canEditPost(post) ? `<button class="btn-post-edit" data-post-id="${post.id}" style="padding:6px 10px;background:#e2e8f0;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;color:#475569;">✏️</button>` : ''}
            ${canDeletePost(post) ? `<button class="btn-post-delete" data-post-id="${post.id}" style="padding:6px 10px;background:#fee2e2;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;color:#ef4444;">🗑️</button>` : ''}
            <button class="btn-post-report" data-post-id="${post.id}" style="padding:6px 10px;background:#f1f5f9;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;color:#64748b;">⚠️</button>
          </div>
        </div>

        <div style="color:#0A1628;line-height:1.5;margin-bottom:12px;word-break:break-word;" class="post-content">${formatContent(post.content)}</div>

        ${post.mediaUrl ? `<img src="${post.mediaUrl}" style="width:100%;border-radius:8px;margin-bottom:12px;max-height:400px;object-fit:cover;">` : ''}

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;padding:8px;background:#f8fafc;border-radius:8px;">
          ${Object.entries(REACTION_TYPES).map(([type, react]) => {
            const count = reactionCounts[type] || 0;
            const hasReacted = userReactions.some(r => r.type === type);
            return `<button class="btn-reaction" data-type="${type}" data-post-id="${post.id}" style="padding:4px 8px;border-radius:6px;border:1px solid ${hasReacted ? react.color : '#e2e8f0'};background:${hasReacted ? react.color + '22' : '#fff'};color:${hasReacted ? react.color : '#64748b'};font-size:12px;cursor:pointer;font-weight:${hasReacted ? '700' : '500'};transition:all .2s;">${react.emoji} ${count > 0 ? count : ''}</button>`;
          }).join('')}
        </div>

        <div style="display:flex;justify-content:space-between;gap:6px;padding-top:8px;border-top:1px solid #f1f5f9;">
          <button class="btn-share" data-post-id="${post.id}" style="flex:1;padding:8px;border:1px solid #e2e8f0;background:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;color:#64748b;">📤 Partager</button>
          <button class="btn-toggle-comments" data-post-id="${post.id}" style="flex:1;padding:8px;border:1px solid #e2e8f0;background:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;color:#64748b;">💬 ${comments.length}</button>
          ${_currentUserId && !isUserBlocked(post.authorId) ? `<button class="btn-block-user" data-user-id="${post.authorId}" style="flex:1;padding:8px;border:1px solid #e2e8f0;background:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;color:#ef4444;">${_blockedUsers.includes(post.authorId) ? '🔓 Débloquer' : '🔒 Bloquer'}</button>` : ''}
        </div>

        <div class="comments-section" data-post-id="${post.id}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid #f1f5f9;">
          ${renderComments(post.id, comments)}
          ${_currentUserId && !isUserBlocked(_currentUserId) ? `
            <div style="margin-top:12px;display:flex;gap:8px;">
              <input type="text" class="comment-input" data-post-id="${post.id}" placeholder="Ajouter un commentaire…" style="flex:1;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;">
              <button class="btn-send-comment" data-post-id="${post.id}" style="padding:8px 12px;background:#009E60;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">✓</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    return html;
  }

  function renderComments(postId, comments) {
    return comments.map(comment => {
      const children = Object.values(_comments).filter(c => c.parentId === comment.id && !c.deleted);
      return `
        <div style="background:#f8fafc;border-radius:8px;padding:10px;margin-bottom:8px;border-left:3px solid #009E60;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
              <div style="width:28px;height:28px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;font-weight:700;color:#64748b;">
                ${comment.authorAvatar ? `<img src="${comment.authorAvatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : comment.authorName.charAt(0).toUpperCase()}
              </div>
              <div style="min-width:0;flex:1;">
                <div style="font-weight:600;font-size:12px;color:#0A1628;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(comment.authorName)}</div>
                <div style="font-size:11px;color:#94a3b8;">${timeAgo(comment.createdAt)}</div>
              </div>
            </div>
            ${comment.authorId === _currentUserId ? `<button class="btn-delete-comment" data-comment-id="${comment.id}" data-post-id="${postId}" style="padding:4px 8px;background:#fee2e2;border:none;border-radius:4px;cursor:pointer;font-size:11px;color:#ef4444;">✕</button>` : ''}
          </div>
          <div style="font-size:12px;color:#475569;word-break:break-word;margin-bottom:6px;">${formatContent(comment.content)}</div>
          <button class="btn-reply-comment" data-comment-id="${comment.id}" data-post-id="${postId}" style="font-size:11px;background:none;border:none;color:#009E60;font-weight:600;cursor:pointer;padding:0;">↩️ Répondre</button>
          ${children.length > 0 ? `<div style="margin-top:8px;margin-left:8px;border-left:2px solid #e2e8f0;padding-left:8px;">${children.map(child => renderComments(postId, [child])).join('')}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function attachPostListeners() {
    document.querySelectorAll('.btn-reaction').forEach(btn => {
      btn.addEventListener('click', function() {
        const postId = this.dataset.postId;
        const type = this.dataset.type;
        addReaction(postId, type);
      });
    });

    document.querySelectorAll('.btn-share').forEach(btn => {
      btn.addEventListener('click', function() {
        const postId = this.dataset.postId;
        sharePost(postId, _posts[postId]);
      });
    });

    document.querySelectorAll('.btn-toggle-comments').forEach(btn => {
      btn.addEventListener('click', function() {
        const postId = this.dataset.postId;
        const section = document.querySelector(`.comments-section[data-post-id="${postId}"]`);
        if (section) {
          section.style.display = section.style.display === 'none' ? 'block' : 'none';
        }
      });
    });

    document.querySelectorAll('.btn-send-comment').forEach(btn => {
      btn.addEventListener('click', function() {
        const postId = this.dataset.postId;
        const input = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
        if (input && input.value.trim()) {
          createComment(postId, input.value);
          input.value = '';
        }
      });
    });

    document.querySelectorAll('.comment-input').forEach(input => {
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const postId = this.dataset.postId;
          const btn = document.querySelector(`.btn-send-comment[data-post-id="${postId}"]`);
          if (btn) btn.click();
        }
      });
    });

    document.querySelectorAll('.btn-delete-comment').forEach(btn => {
      btn.addEventListener('click', function() {
        const commentId = this.dataset.commentId;
        const postId = this.dataset.postId;
        deleteComment(commentId, postId);
      });
    });

    document.querySelectorAll('.btn-reply-comment').forEach(btn => {
      btn.addEventListener('click', function() {
        const commentId = this.dataset.commentId;
        const postId = this.dataset.postId;
        const input = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
        if (input) {
          input.focus();
          input.placeholder = `Répondre à un commentaire…`;
          input.dataset.parentCommentId = commentId;
        }
      });
    });

    document.querySelectorAll('.btn-post-edit').forEach(btn => {
      btn.addEventListener('click', function() {
        const postId = this.dataset.postId;
        const post = _posts[postId];
        showEditModal(postId, post.content, post.mediaUrl);
      });
    });

    document.querySelectorAll('.btn-post-delete').forEach(btn => {
      btn.addEventListener('click', function() {
        const postId = this.dataset.postId;
        deletePost(postId);
      });
    });

    document.querySelectorAll('.btn-post-report').forEach(btn => {
      btn.addEventListener('click', function() {
        const postId = this.dataset.postId;
        showReportModal(postId);
      });
    });

    document.querySelectorAll('.btn-block-user').forEach(btn => {
      btn.addEventListener('click', function() {
        const userId = this.dataset.userId;
        blockUser(userId);
      });
    });
  }

  function showEditModal(postId, content, mediaUrl) {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:12px;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,.2);z-index:10001;width:90%;max-width:500px;">
        <h3 style="margin:0 0 16px;font-weight:700;color:#0A1628;">Modifier le post</h3>
        <textarea id="edit-content" style="width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;resize:vertical;min-height:100px;font-family:inherit;margin-bottom:12px;">${content}</textarea>
        <div style="display:flex;gap:8px;">
          <button onclick="this.closest('[data-edit-modal]').remove()" style="flex:1;padding:10px;background:#e2e8f0;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Annuler</button>
          <button id="btn-save-edit" data-post-id="${postId}" style="flex:1;padding:10px;background:#009E60;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Enregistrer</button>
        </div>
      </div>
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;" onclick="if(event.target===this)this.nextElementSibling.remove();this.remove();"></div>
    `;
    modal.setAttribute('data-edit-modal', '1');
    document.body.appendChild(modal);

    document.getElementById('btn-save-edit').addEventListener('click', function() {
      const newContent = document.getElementById('edit-content').value;
      if (newContent.trim()) {
        updatePost(postId, newContent, mediaUrl);
        modal.remove();
        modal.previousElementSibling.remove();
      }
    });
  }

  function showReportModal(postId) {
    const reasons = ['Contenu offensant', 'Spam', 'Contenu inapproprié', 'Arnaque', 'Autre'];
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:12px;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,.2);z-index:10001;width:90%;max-width:400px;">
        <h3 style="margin:0 0 16px;font-weight:700;color:#0A1628;">Signaler ce post</h3>
        <select id="report-reason" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;font-size:14px;">
          <option>Sélectionnez une raison...</option>
          ${reasons.map(r => `<option>${r}</option>`).join('')}
        </select>
        <div style="display:flex;gap:8px;">
          <button onclick="this.closest('[data-report-modal]').remove();this.closest('[data-report-modal]').previousElementSibling.remove()" style="flex:1;padding:10px;background:#e2e8f0;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Annuler</button>
          <button id="btn-send-report" data-post-id="${postId}" style="flex:1;padding:10px;background:#ef4444;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Signaler</button>
        </div>
      </div>
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;"></div>
    `;
    modal.setAttribute('data-report-modal', '1');
    document.body.appendChild(modal);

    document.getElementById('btn-send-report').addEventListener('click', function() {
      const reason = document.getElementById('report-reason').value;
      if (reason !== 'Sélectionnez une raison...') {
        reportPost(postId, reason);
        modal.remove();
        modal.previousElementSibling.remove();
      }
    });
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:${type === 'success' ? '#009E60' : type === 'error' ? '#ef4444' : '#0A1628'};color:#fff;padding:12px 20px;border-radius:8px;z-index:10002;font-weight:600;font-size:14px;animation:slideUp .3s ease;`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function injectStyles() {
    if (document.getElementById('gsc-community-styles')) return;
    const style = document.createElement('style');
    style.id = 'gsc-community-styles';
    style.textContent = `
.community-container{max-width:800px;margin:0 auto;padding:16px 8px;}
.community-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap;}
.community-header h2{margin:0;font-size:24px;font-weight:800;color:#0A1628;flex:1;}
.sort-controls{display:flex;gap:6px;}
.sort-btn{padding:8px 12px;border:1px solid #e2e8f0;background:#fff;border-radius:8px;cursor:pointer;font-weight:600;font-size:12px;color:#64748b;transition:all .2s;}
.sort-btn.active{background:#009E60;color:#fff;border-color:#009E60;}
.post-form{background:#fff;border-radius:12px;padding:16px;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,.08);border:1px solid #e2e8f0;}
.post-form textarea{width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical;min-height:100px;margin-bottom:12px;}
.post-form-buttons{display:flex;gap:8px;justify-content:flex-end;}
.btn-primary{padding:10px 16px;background:#009E60;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;transition:all .2s;}
.btn-primary:hover{background:#007a47;}
.btn-secondary{padding:10px 16px;background:#e2e8f0;color:#0A1628;border:none;border-radius:8px;cursor:pointer;font-weight:600;transition:all .2s;}
.btn-secondary:hover{background:#cbd5e1;}
#community-feed{display:flex;flex-direction:column;}
@media(max-width:768px){.community-container{padding:8px;}
.post-form{padding:12px;}
.community-header{flex-direction:column;align-items:stretch;}
.community-header h2{font-size:20px;}
.sort-controls{width:100%;}
.sort-btn{flex:1;text-align:center;}}
    `;
    document.head.appendChild(style);
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
        renderFeed();
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
        renderFeed();
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
        renderFeed();
      },
      (error) => console.error('Reactions sync error:', error)
    );
    _unsubscribers.push(unsubscribe);
  }

  function subscribeToBlocks() {
    if (!window.db || !_currentUserId) return;

    const { collection, query, where, onSnapshot } = window;
    const q = query(
      collection(window.db, BLOCKS_COLLECTION),
      where('blockerId', '==', _currentUserId)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        _blockedUsers = snap.docs.map(doc => doc.data().blockedId);
        renderFeed();
      },
      (error) => console.error('Blocks sync error:', error)
    );
    _unsubscribers.push(unsubscribe);
  }

  function unsubscribeAll() {
    _unsubscribers.forEach(unsub => unsub());
    _unsubscribers = [];
  }

  window.GSCCommunity = {
    init(userId, userName, userAvatar) {
      _currentUserId = userId || null;
      _currentUserName = userName || 'Utilisateur anonyme';
      _currentUserAvatar = userAvatar || '';
      injectStyles();
      subscribeToPosts();
      subscribeToComments();
      subscribeToReactions();
      if (userId) subscribeToBlocks();
    },
    render() {
      renderFeed();
    },
    createPost(content, mediaUrl) {
      return createPost(content, mediaUrl);
    },
    getPostCount() {
      return Object.keys(_posts).length;
    },
    setSortOrder(order) {
      _sortOrder = order;
      renderFeed();
    },
    destroy() {
      unsubscribeAll();
    }
  };

})(window);
