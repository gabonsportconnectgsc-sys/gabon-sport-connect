/* ═══════════════════════════════════════════════════════════════════════════
   GSC-COMMUNITY.JS — Fil communautaire Gabon Sport Connect
   Publications · réactions · commentaires · partage · signalement · blocage
   ─────────────────────────────────────────────────────────────────────────
   Intégration : ajouter dans index.html, après gsc-notifications.js :
     <script src="gsc-community.js"></script>
   Aucune autre modification HTML requise — le module s'auto-injecte dans
   la vue #view-actualites (onglet "💬 Fil communautaire").
   Collections Firestore utilisées : communityPosts, communityPosts/{id}/comments,
   signalements, blocages.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (window) {
  'use strict';

  const POSTS_COL = 'communityPosts';
  const COMMENTS_SUB = 'comments';
  const REPORTS_COL = 'signalements';
  const BLOCKS_COL = 'blocages';
  const REPORT_THRESHOLD = 3;

  const REACTIONS = [
    { key: 'like', icon: '👍' },
    { key: 'love', icon: '❤️' },
    { key: 'fire', icon: '🔥' },
    { key: 'clap', icon: '👏' },
    { key: 'wow', icon: '😮' }
  ];

  const CATS = [
    { key: 'all', icon: '🌍', label: 'Tout' },
    { key: 'general', icon: '💬', label: 'Général' },
    { key: 'Football', icon: '⚽', label: 'Football' },
    { key: 'Basketball', icon: '🏀', label: 'Basketball' },
    { key: 'Athlétisme', icon: '🏃', label: 'Athlétisme' },
    { key: 'Gabon', icon: '🇬🇦', label: 'Gabon' }
  ];

  /* Catégories par TYPE D'ACTEUR (rôle GSC) — distinctes des catégories sport ci-dessus.
     Permet de cibler précisément qui une publication concerne (ex: un message pour les
     Arbitres, les Clubs, les Sportifs handisport, etc.) afin que les notifications de
     mention/ciblage ("X a publié sur vous") restent précises. */
  /* Couleurs alignées sur les tuiles "Acteurs sportifs" de la page d'accueil
     (dégradés stat-card dans index.html), une couleur unique par rôle pour
     une reconnaissance visuelle immédiate et cohérente dans toute l'app. */
  const ROLE_CATS = [
    { key: 'joueur', icon: '⚽', label: 'Joueurs', color: '#009E60', colorDk: '#007a47' },
    { key: 'arbitre', icon: '🟨', label: 'Arbitres', color: '#f59e0b', colorDk: '#d97706' },
    { key: 'entraineur', icon: '📋', label: 'Entraîneurs', color: '#0d9488', colorDk: '#0f766e' },
    { key: 'club', icon: '🏟️', label: 'Clubs', color: '#f97316', colorDk: '#c2410c' },
    { key: 'association', icon: '🤝', label: 'Associations', color: '#8b5cf6', colorDk: '#6d28d9' },
    { key: 'federation', icon: '🏛️', label: 'Fédérations', color: '#1a2d4a', colorDk: '#0f3460' },
    { key: 'organisateur', icon: '🎪', label: 'Organisateurs', color: '#b45309', colorDk: '#92400e' },
    { key: 'supporter', icon: '💗', label: 'Supporters', color: '#ec4899', colorDk: '#db2777' },
    { key: 'independant', icon: '🧍', label: 'Indépendants', color: '#0ea5e9', colorDk: '#0284c7' },
    { key: 'eleve_etudiant', icon: '🎓', label: 'Élèves/Étudiants', color: '#6366f1', colorDk: '#4338ca' },
    { key: 'sportif_etranger', icon: '🌍', label: 'Sportifs étrangers', color: '#ca8a04', colorDk: '#92660a' },
    { key: 'handisport', icon: '🦾', label: 'Sportifs handisport', color: '#7c3aed', colorDk: '#5b21b6' }
  ];

  const REPORT_REASONS = [
    { key: 'spam', label: 'Spam / publicité' },
    { key: 'haine', label: 'Propos haineux ou injurieux' },
    { key: 'violence', label: 'Violence' },
    { key: 'inapproprie', label: 'Contenu inapproprié' },
    { key: 'fake', label: 'Fausse information' },
    { key: 'autre', label: 'Autre' }
  ];

  let _posts = [];
  let _blockedIds = new Set();
  let _currentCat = 'all';
  let _currentRoleCat = 'all'; // filtre secondaire par type d'acteur
  let _unsub = null;
  let _subscribed = false;
  let _openComments = new Set();
  let _openMenus = new Set();
  let _commentsCache = {};
  let _extraFns = null;
  let _composerImage = null;
  let _reportCtx = null;
  let _mentionState = null; // { scope:'composer'|'comment', postId, start, query }

  /* ── Utilitaires ── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function ready() { return !!window.db && typeof window.collection === 'function'; }
  function isLogged() { return !!window.currentUser && !window.isVisitor; }
  function toastMsg(msg, type) { if (typeof window.toast === 'function') window.toast(msg, type); }
  function pushNotif(opts) { if (window.GSCNotif && typeof window.GSCNotif.push === 'function') window.GSCNotif.push(opts); }

  function timeAgo(ts) {
    let ms;
    try { ms = ts && ts.toDate ? ts.toDate().getTime() : (typeof ts === 'number' ? ts : Date.now()); }
    catch (e) { ms = Date.now(); }
    const diff = Date.now() - ms, s = Math.floor(diff / 1000);
    if (s < 60) return 'à l\'instant';
    const m = Math.floor(s / 60); if (m < 60) return `il y a ${m} min`;
    const h = Math.floor(m / 60); if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24); if (d < 7) return `il y a ${d} j`;
    return new Date(ms).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
  function initials(name) { return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'; }
  function authorName(profile) {
    return [profile?.prenom, profile?.nom].filter(Boolean).join(' ').trim()
      || profile?.nomOrganisation || profile?.email?.split('@')[0] || 'Membre GSC';
  }

  /* ── Accès à l'annuaire réel des acteurs (alimenté par index.html) ── */
  function getAllActors() { return (window.allActors && window.allActors.length) ? window.allActors : []; }
  function findActorById(id) {
    if (!id) return null;
    return getAllActors().find(a => (a.uid || a.id) === id)
      || (window.allAdminUsers || []).find(a => (a.uid || a.id) === id)
      || null;
  }
  function roleLabel(roleKey) {
    const r = ROLE_CATS.find(c => c.key === roleKey);
    return r ? `${r.icon} ${r.label}` : (window.ROLE_LABELS && window.ROLE_LABELS[roleKey]) || roleKey || '';
  }

  /* ── Ouvrir le profil d'un membre (nom ou avatar cliqué) ──
     window.allActors peut ne pas encore être chargé (ou pas rafraîchi) au moment
     où le fil communautaire s'affiche : on ne se fie donc pas qu'au cache local.
     Si l'acteur n'y est pas, on va le chercher directement dans Firestore avant
     de renoncer. */
  async function openMemberProfile(uid) {
    if (!uid) return;
    if (typeof window.openActorDetail !== 'function') {
      toastMsg('Profil indisponible pour ce membre.', 'info');
      return;
    }
    if (findActorById(uid)) {
      window.openActorDetail(uid);
      return;
    }
    /* Fallback : récupérer le document utilisateur directement dans Firestore */
    if (window.db && typeof window.doc === 'function' && typeof window.getDoc === 'function') {
      try {
        const snap = await withAuth(() => window.getDoc(window.doc(window.db, 'users', uid)));
        if (snap && snap.exists && snap.exists()) {
          const actor = { id: uid, uid, ...snap.data() };
          window.allActors = [...(window.allActors || []), actor];
          window.openActorDetail(uid);
          return;
        }
      } catch (e) { /* silencieux — on retombe sur le message d'indisponibilité */ }
    }
    toastMsg('Profil indisponible pour ce membre.', 'info');
  }

  /* ── Ouvrir une photo de profil en plein écran ── */
  function openPhotoFullscreen(url) {
    if (!url) return;
    if (typeof window.openGalleryModal === 'function') window.openGalleryModal(url);
  }

  /* ── MENTIONS @Nom ── */
  /* Recherche d'acteurs par préfixe de nom pour l'autocomplétion @mention */
  function searchActorsForMention(prefix) {
    const q = (prefix || '').trim().toLowerCase();
    const list = getAllActors();
    const scored = list
      .map(a => ({ a, name: authorName({ prenom: a.prenom, nom: a.nom, nomOrganisation: a.nomOrganisation, email: a.email }) }))
      .filter(({ name }) => !q || name.toLowerCase().includes(q));
    return scored.slice(0, 6).map(({ a, name }) => ({ id: a.uid || a.id, name, role: a.role || 'joueur' }));
  }

  /* Extrait les mentions @Nom présentes dans un texte, en se basant sur la liste
     d'acteurs réels (pour résoudre le nom complet vers un uid précis). Retourne
     un tableau d'objets { id, name } dédupliqué. */
  function extractMentions(text) {
    if (!text) return [];
    const list = getAllActors().map(a => ({ id: a.uid || a.id, name: authorName({ prenom: a.prenom, nom: a.nom, nomOrganisation: a.nomOrganisation, email: a.email }) })).filter(a => a.id && a.name);
    /* Trier par longueur de nom décroissante pour matcher les noms composés en priorité */
    list.sort((x, y) => y.name.length - x.name.length);
    const found = new Map();
    list.forEach(({ id, name }) => {
      if (!name) return;
      const re = new RegExp('@' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (re.test(text)) found.set(id, name);
    });
    return [...found.entries()].map(([id, name]) => ({ id, name }));
  }

  /* Transforme le texte brut en HTML avec les @mentions mises en évidence (et déjà échappé) */
  function renderTextWithMentions(text) {
    const escaped = nl2br(text);
    const mentions = extractMentions(text);
    if (!mentions.length) return escaped;
    let out = escaped;
    mentions.forEach(({ id, name }) => {
      const safeName = esc(name);
      const re = new RegExp('@' + safeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      out = out.replace(re, `<span class="gsc-mention" data-action="view-profile" data-uid="${esc(id)}">@${safeName}</span>`);
    });
    return out;
  }

  /* Notifie chaque membre mentionné dans un post ou un commentaire :
     "X a publié/commenté sur vous" — une seule notification par mention, via pushNotif
     (qui retombe lui-même sur Firestore si GSCNotif n'est pas chargé). */
  function notifyMentions(text, { authorProfile, action, excludeUid }) {
    const mentions = extractMentions(text);
    const verb = action === 'comment' ? 'a commenté sur vous' : 'a publié sur vous';
    mentions.forEach(({ id }) => {
      if (!id || id === excludeUid) return;
      pushNotif({
        type: 'mention', recipientId: id, personal: true,
        title: `${authorName(authorProfile)} ${verb}`,
        body: (text || '').slice(0, 100),
        link: 'fil:' + (excludeUid || 'all')
      });
    });
  }

  async function withAuth(fn) {
    if (typeof window.ensureFirebaseAuthViaSupabase === 'function') {
      try { await window.ensureFirebaseAuthViaSupabase(); } catch (e) {}
    }
    return fn();
  }

  async function getExtraFns() {
    if (_extraFns) return _extraFns;
    try {
      const fs = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      _extraFns = { arrayUnion: fs.arrayUnion, increment: fs.increment, deleteField: fs.deleteField };
    } catch (e) { _extraFns = {}; }
    return _extraFns;
  }

  /* ═══ STYLES ═══ */
  function injectStyles() {
    if (document.getElementById('gsc-community-styles')) return;
    const s = document.createElement('style');
    s.id = 'gsc-community-styles';
    s.textContent = `
#gsc-community-root{margin-top:0;}
#gsc-feed-tabs{overflow:visible !important;}
#gsc-feed-tabs .card{overflow:visible;}
.gsc-cat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(86px,1fr));gap:6px;margin-bottom:12px;padding:0 4px;}
.gsc-cat-row .news-filter-btn{font-size:11.5px;padding:6px 8px;white-space:normal;line-height:1.25;text-align:center;}
.gsc-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--green),var(--yellow));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;flex-shrink:0;overflow:hidden;font-family:var(--font-display);}
.gsc-avatar img{width:100%;height:100%;object-fit:cover;}
.gsc-avatar.sm{width:30px;height:30px;font-size:11px;}
.gsc-composer{background:var(--white);border-radius:var(--radius-md);border:1px solid var(--gray-bd);box-shadow:var(--shadow-sm);padding:14px;margin-bottom:14px;}
.gsc-composer-head{display:flex;gap:10px;align-items:flex-start;}
.gsc-composer textarea{flex:1;border:1.5px solid var(--gray-bd);border-radius:var(--radius-sm);padding:10px 12px;font-family:var(--font-body);font-size:13.5px;resize:vertical;min-height:54px;outline:none;transition:border-color .2s;}
.gsc-composer textarea:focus{border-color:var(--green);}
.gsc-composer-selects{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;}
.gsc-composer-cat,.gsc-composer-target{border:1.5px solid var(--gray-bd);border-radius:var(--radius-sm);padding:7px 8px;font-size:11.5px;font-weight:600;color:var(--navy);background:var(--white);width:100%;min-width:0;}
.gsc-composer-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;}
.gsc-composer-imgbtn{border:1.5px solid var(--gray-bd);border-radius:var(--radius-sm);padding:7px 12px;font-size:12px;font-weight:600;background:var(--white);color:var(--gray-txt);cursor:pointer;}
.gsc-composer-imgbtn:hover{border-color:var(--green);color:var(--green);}
.gsc-composer-publish{background:var(--green);color:#fff;border:none;border-radius:20px;padding:8px 20px;font-size:13px;font-weight:700;cursor:pointer;transition:background .2s;}
.gsc-composer-publish:hover{background:var(--green-dk);}
.gsc-composer-publish:disabled{opacity:.6;cursor:default;}
.gsc-composer-preview{position:relative;margin-top:10px;display:inline-block;}
.gsc-composer-preview img{max-height:140px;border-radius:var(--radius-sm);display:block;}
.gsc-composer-preview button{position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:50%;background:var(--danger);color:#fff;border:2px solid #fff;cursor:pointer;font-size:12px;line-height:1;}
.gsc-cta-login{background:var(--green-lt);border:1px solid rgba(0,158,96,.25);border-radius:var(--radius-md);padding:14px 16px;text-align:center;margin-bottom:14px;font-size:13px;color:var(--green-dk);font-weight:600;}
.gsc-cta-login button{margin-top:8px;background:var(--green);color:#fff;border:none;border-radius:18px;padding:7px 18px;font-size:12.5px;font-weight:700;cursor:pointer;}
.gsc-post{background:var(--white);border-radius:var(--radius-md);border:1px solid var(--gray-bd);box-shadow:var(--shadow-sm);padding:14px;margin-bottom:12px;}
.gsc-post.gsc-flagged{border-color:rgba(245,158,11,.5);background:#fffaf0;}
.gsc-post-head{display:flex;align-items:flex-start;gap:10px;}
.gsc-post-meta{flex:1;min-width:0;}
.gsc-post-name{font-weight:800;font-size:13.5px;color:var(--navy);font-family:var(--font-display);}
.gsc-post-sub{font-size:11px;color:var(--gray-txt);margin-top:1px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.gsc-post-cat-tag{background:var(--green-lt);color:var(--green-dk);border-radius:10px;padding:1px 8px;font-weight:700;}
.gsc-flag-tag{background:#fef3c7;color:#92400e;border-radius:10px;padding:1px 8px;font-weight:700;}
.gsc-post-menu-wrap{position:relative;flex-shrink:0;}
.gsc-post-menu-btn{background:none;border:none;font-size:18px;color:var(--gray-txt);cursor:pointer;padding:2px 6px;border-radius:6px;}
.gsc-post-menu-btn:hover{background:var(--gray-bg);}
.gsc-post-menu{position:absolute;top:28px;right:0;background:#fff;border:1px solid var(--gray-bd);border-radius:10px;box-shadow:var(--shadow-md);min-width:170px;z-index:20;display:none;overflow:hidden;}
.gsc-post-menu.open{display:block;}
.gsc-post-menu button{display:block;width:100%;text-align:left;padding:9px 14px;background:none;border:none;font-size:12.5px;color:var(--navy);cursor:pointer;}
.gsc-post-menu button:hover{background:var(--gray-bg);}
.gsc-post-menu button.danger{color:var(--danger);}
.gsc-post-text{font-size:13.5px;color:var(--navy);line-height:1.5;margin-top:10px;white-space:pre-wrap;word-break:break-word;}
.gsc-post-img{margin-top:10px;border-radius:var(--radius-sm);max-width:100%;max-height:380px;width:100%;object-fit:cover;}
.gsc-react-row{display:flex;gap:4px;margin-top:12px;flex-wrap:wrap;}
.gsc-react-btn{display:flex;align-items:center;gap:4px;border:1.5px solid var(--gray-bd);border-radius:16px;background:var(--white);padding:5px 10px;font-size:12.5px;cursor:pointer;transition:all .15s;color:var(--gray-txt);font-weight:700;}
.gsc-react-btn:hover{border-color:var(--green);}
.gsc-react-btn.mine{background:var(--green-lt);border-color:var(--green);color:var(--green-dk);}
.gsc-post-actions{display:flex;align-items:center;gap:16px;margin-top:10px;padding-top:10px;border-top:1px solid var(--gray-bd);}
.gsc-post-action{display:flex;align-items:center;gap:5px;background:none;border:none;font-size:12.5px;color:var(--gray-txt);font-weight:700;cursor:pointer;}
.gsc-post-action:hover{color:var(--green);}
.gsc-comments{margin-top:10px;border-top:1px dashed var(--gray-bd);padding-top:10px;}
.gsc-comment{display:flex;gap:8px;margin-bottom:10px;align-items:flex-start;}
.gsc-comment-body{flex:1;background:var(--gray-bg);border-radius:12px;padding:7px 12px;min-width:0;}
.gsc-comment-name{font-size:12px;font-weight:800;color:var(--navy);}
.gsc-comment-text{font-size:12.5px;color:var(--navy);white-space:pre-wrap;word-break:break-word;}
.gsc-comment-time{font-size:10px;color:var(--gray-txt);margin-top:2px;}
.gsc-comment-del{background:none;border:none;color:var(--gray-txt);cursor:pointer;font-size:11px;flex-shrink:0;}
.gsc-comment-del:hover{color:var(--danger);}
.gsc-comment-composer{display:flex;gap:8px;align-items:center;margin-top:6px;}
.gsc-comment-composer input{flex:1;border:1.5px solid var(--gray-bd);border-radius:18px;padding:7px 14px;font-size:12.5px;outline:none;}
.gsc-comment-composer input:focus{border-color:var(--green);}
.gsc-comment-composer button{background:var(--green);color:#fff;border:none;border-radius:50%;width:32px;height:32px;flex-shrink:0;cursor:pointer;font-size:14px;}
#gsc-report-modal,#gsc-block-confirm-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9998;align-items:center;justify-content:center;padding:16px;}
#gsc-report-modal.open,#gsc-block-confirm-modal.open{display:flex;}
.gsc-report-card{background:#fff;border-radius:var(--radius-md);max-width:380px;width:100%;padding:20px;max-height:90vh;overflow-y:auto;}
.gsc-report-card h3{font-family:var(--font-display);font-size:16px;color:var(--navy);margin-bottom:4px;}
.gsc-report-card p{font-size:12px;color:var(--gray-txt);margin-bottom:12px;}
.gsc-report-reason{display:flex;align-items:center;gap:8px;padding:8px 4px;font-size:13px;color:var(--navy);cursor:pointer;border-bottom:1px solid var(--gray-bg);}
.gsc-report-card textarea{width:100%;border:1.5px solid var(--gray-bd);border-radius:var(--radius-sm);padding:8px 10px;font-size:12.5px;margin-top:10px;min-height:60px;outline:none;}
.gsc-report-btns{display:flex;gap:10px;margin-top:14px;}
.gsc-report-btns button{flex:1;border-radius:18px;padding:9px;font-size:12.5px;font-weight:700;cursor:pointer;}
.gsc-report-btns .gsc-btn-cancel{background:var(--gray-bg);border:none;color:var(--gray-txt);}
.gsc-report-btns .gsc-btn-submit{background:var(--danger);border:none;color:#fff;}
.gsc-empty{text-align:center;padding:40px 16px;color:var(--gray-txt);}
.gsc-empty .e-icon{font-size:42px;margin-bottom:10px;}
/* Profils & photos cliquables */
.gsc-avatar.clickable{cursor:pointer;}
.gsc-post-name.clickable,.gsc-comment-name.clickable{cursor:pointer;}
.gsc-post-name.clickable:hover,.gsc-comment-name.clickable:hover{text-decoration:underline;color:var(--green-dk);}
.gsc-post-img{cursor:zoom-in;}
/* Mentions @Nom dans le texte */
.gsc-mention{color:var(--green-dk);font-weight:700;cursor:pointer;}
.gsc-mention:hover{text-decoration:underline;}
/* Rangée secondaire : filtre par type d'acteur — grille 2 colonnes stricte */
.gsc-role-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;padding:0 4px;align-items:stretch;}
.gsc-role-row .news-filter-btn{font-size:11px;padding:7px 6px;white-space:normal;line-height:1.3;text-align:center;width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:4px;min-height:36px;border-radius:18px;}
.gsc-role-row-label{grid-column:1 / -1;text-align:center;font-size:11px;color:var(--gray-txt);font-weight:700;margin-bottom:2px;}
/* "Tous les acteurs" occupe toute la largeur, centré */
.gsc-role-btn-all{grid-column:1 / -1;justify-self:stretch;}
/* Couleur unique par rôle */
.gsc-role-btn{border:2px solid var(--role-color, var(--gray-bd))!important;color:var(--role-color-dk, var(--gray-txt))!important;background:color-mix(in srgb, var(--role-color, #fff) 8%, #fff)!important;font-weight:700;}
.gsc-role-btn:hover{background:color-mix(in srgb, var(--role-color, #fff) 18%, #fff)!important;}
.gsc-role-btn.active{background:linear-gradient(135deg, var(--role-color, var(--navy)), var(--role-color-dk, var(--navy-md)))!important;color:#fff!important;border-color:transparent!important;box-shadow:0 2px 8px rgba(0,0,0,.18);}
.gsc-role-btn[data-role="all"]{border:2px solid var(--navy)!important;color:var(--navy)!important;background:#fff!important;}
.gsc-role-btn[data-role="all"].active{background:linear-gradient(135deg,var(--navy),var(--navy-md))!important;color:#fff!important;border-color:transparent!important;}
.gsc-post-target-tag{border-radius:10px;padding:1px 8px;font-weight:700;}
/* Autocomplete @mention */
.gsc-mention-pop{position:absolute;z-index:30;background:#fff;border:1px solid var(--gray-bd);border-radius:10px;box-shadow:var(--shadow-md);max-height:220px;overflow-y:auto;min-width:200px;display:none;}
.gsc-mention-pop.open{display:block;}
.gsc-mention-item{display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;font-size:12.5px;color:var(--navy);}
.gsc-mention-item:hover,.gsc-mention-item.active{background:var(--gray-bg);}
.gsc-mention-item .gsc-avatar{width:24px;height:24px;font-size:10px;}
.gsc-mention-item small{color:var(--gray-txt);font-weight:600;margin-left:auto;}
.gsc-composer-head,.gsc-comment-composer{position:relative;}
`;
    document.head.appendChild(s);
  }

  /* ═══ INJECTION DE L'UI DANS #view-actualites ═══ */
  function mountUI() {
    const view = document.getElementById('view-actualites');
    if (!view || document.getElementById('gsc-community-root')) return;

    injectStyles();

    const existingChildren = Array.from(view.children);
    const actuWrap = document.createElement('div');
    actuWrap.id = 'gsc-actu-pane';
    existingChildren.forEach(ch => actuWrap.appendChild(ch));

    const tabsWrap = document.createElement('div');
    tabsWrap.className = 'card fade-up mb-16';
    tabsWrap.id = 'gsc-feed-tabs';
    tabsWrap.innerHTML = `
      <div style="display:flex;gap:8px;padding:12px 14px;justify-content:center;align-items:center;flex-wrap:nowrap;">
        <button class="news-filter-btn active" id="gsc-tab-community" type="button" style="flex:1;max-width:200px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative;">💬 Fil communautaire</button>
        <button class="news-filter-btn" id="gsc-tab-actu" type="button" style="flex:1;max-width:200px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📰 Actualités officielles</button>
      </div>`;

    const communityPane = document.createElement('div');
    communityPane.id = 'gsc-community-root';
    communityPane.innerHTML = `
      <div class="gsc-cat-row" id="gsc-cat-row">
        ${CATS.map(c => `<button class="news-filter-btn${c.key === 'all' ? ' active' : ''}" data-cat="${c.key}" type="button">${c.icon} ${esc(c.label)}</button>`).join('')}
      </div>
      <div class="gsc-role-row" id="gsc-role-row">
        <div class="gsc-role-row-label">🎯 Filtrer par type d'acteur</div>
        <button class="news-filter-btn gsc-role-btn gsc-role-btn-all active" data-role="all" type="button">👥 Tous les acteurs</button>
        ${ROLE_CATS.map(c => `<button class="news-filter-btn gsc-role-btn" data-role="${c.key}" type="button" style="--role-color:${c.color};--role-color-dk:${c.colorDk};">${c.icon} ${esc(c.label)}</button>`).join('')}
      </div>
      <div id="gsc-composer-zone"></div>
      <div id="gsc-feed-list"></div>`;

    /* Fil communautaire affiché par défaut — Actualités officielles masquées au départ */
    actuWrap.style.display = 'none';

    view.appendChild(tabsWrap);
    view.appendChild(actuWrap);
    view.appendChild(communityPane);

    tabsWrap.querySelector('#gsc-tab-actu').addEventListener('click', () => {
      actuWrap.style.display = '';
      communityPane.style.display = 'none';
      tabsWrap.querySelector('#gsc-tab-actu').classList.add('active');
      tabsWrap.querySelector('#gsc-tab-community').classList.remove('active');
    });
    tabsWrap.querySelector('#gsc-tab-community').addEventListener('click', () => {
      actuWrap.style.display = 'none';
      communityPane.style.display = '';
      tabsWrap.querySelector('#gsc-tab-community').classList.add('active');
      tabsWrap.querySelector('#gsc-tab-actu').classList.remove('active');
      ensureSubscribed();
    });

    communityPane.querySelector('#gsc-cat-row').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      _currentCat = btn.dataset.cat;
      communityPane.querySelectorAll('#gsc-cat-row .news-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderFeed();
    });

    communityPane.querySelector('#gsc-role-row').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-role]');
      if (!btn) return;
      _currentRoleCat = btn.dataset.role;
      communityPane.querySelectorAll('#gsc-role-row .news-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderFeed();
    });

    communityPane.querySelector('#gsc-feed-list').addEventListener('click', onFeedClick);

    mountReportModal();

    /* Le fil communautaire étant affiché par défaut, on s'abonne immédiatement */
    ensureSubscribed();
  }

  function mountReportModal() {
    if (document.getElementById('gsc-report-modal')) return;
    const m = document.createElement('div');
    m.id = 'gsc-report-modal';
    m.innerHTML = `
      <div class="gsc-report-card">
        <h3>⚠️ Signaler ce contenu</h3>
        <p>Choisissez le motif qui correspond le mieux. Notre équipe examinera ce signalement.</p>
        <div id="gsc-report-reasons">
          ${REPORT_REASONS.map(r => `
            <label class="gsc-report-reason"><input type="radio" name="gsc-report-reason" value="${r.key}">${esc(r.label)}</label>`).join('')}
        </div>
        <textarea id="gsc-report-detail" placeholder="Précisions (optionnel)…"></textarea>
        <div class="gsc-report-btns">
          <button class="gsc-btn-cancel" id="gsc-report-cancel" type="button">Annuler</button>
          <button class="gsc-btn-submit" id="gsc-report-submit" type="button">Envoyer le signalement</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m) closeReportModal(); });
    m.querySelector('#gsc-report-cancel').addEventListener('click', closeReportModal);
    m.querySelector('#gsc-report-submit').addEventListener('click', submitReport);
  }

  /* ═══ COMPOSER ═══ */
  function renderComposer() {
    const zone = document.getElementById('gsc-composer-zone');
    if (!zone) return;
    if (!isLogged()) {
      zone.innerHTML = `
        <div class="gsc-cta-login">
          🔒 Connectez-vous pour publier, réagir et commenter sur le fil communautaire.<br>
          <button type="button" id="gsc-cta-login-btn">Se connecter</button>
        </div>`;
      zone.querySelector('#gsc-cta-login-btn').addEventListener('click', () => {
        if (typeof window.goToAuth === 'function') window.goToAuth();
      });
      return;
    }
    const profile = window.userProfile || {};
    const photo = profile.photoURL;
    zone.innerHTML = `
      <div class="gsc-composer">
        <div class="gsc-composer-head">
          <div class="gsc-avatar clickable" id="gsc-composer-avatar">${photo ? `<img src="${esc(photo)}" alt="">` : esc(initials(authorName(profile)))}</div>
          <textarea id="gsc-composer-text" placeholder="Partagez une actualité, un résultat, une question avec la communauté… (utilisez @Nom pour mentionner quelqu'un)" maxlength="1000"></textarea>
          <div class="gsc-mention-pop" id="gsc-composer-mention-pop"></div>
        </div>
        <div id="gsc-composer-preview-zone"></div>
        <div class="gsc-composer-selects">
          <select class="gsc-composer-cat" id="gsc-composer-cat">
            ${CATS.filter(c => c.key !== 'all').map(c => `<option value="${c.key}">${c.icon} ${esc(c.label)}</option>`).join('')}
          </select>
          <select class="gsc-composer-target" id="gsc-composer-target">
            <option value="">🎯 Cible (optionnel)</option>
            ${ROLE_CATS.map(c => `<option value="${c.key}">${c.icon} ${esc(c.label)}</option>`).join('')}
          </select>
        </div>
        <div class="gsc-composer-foot">
          <label class="gsc-composer-imgbtn">📷 Photo<input type="file" accept="image/*" id="gsc-composer-file" style="display:none;"></label>
          <button class="gsc-composer-publish" id="gsc-composer-publish" type="button">Publier</button>
        </div>
      </div>`;
    zone.querySelector('#gsc-composer-avatar').addEventListener('click', () => { if (photo) openPhotoFullscreen(photo); });
    zone.querySelector('#gsc-composer-file').addEventListener('change', onComposerFile);
    zone.querySelector('#gsc-composer-publish').addEventListener('click', createPost);
    zone.querySelector('#gsc-composer-text').addEventListener('input', (e) => onMentionInput(e, 'composer'));
    zone.querySelector('#gsc-composer-text').addEventListener('keydown', (e) => onMentionKeydown(e, 'composer'));
  }

  function onComposerFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      _composerImage = { file, dataUrl: reader.result };
      const pz = document.getElementById('gsc-composer-preview-zone');
      if (pz) pz.innerHTML = `<div class="gsc-composer-preview"><img src="${reader.result}" alt=""><button type="button" id="gsc-composer-img-remove">✕</button></div>`;
      const rmBtn = document.getElementById('gsc-composer-img-remove');
      if (rmBtn) rmBtn.addEventListener('click', clearComposerImage);
    };
    reader.readAsDataURL(file);
  }
  function clearComposerImage() {
    _composerImage = null;
    const pz = document.getElementById('gsc-composer-preview-zone');
    if (pz) pz.innerHTML = '';
    const fi = document.getElementById('gsc-composer-file');
    if (fi) fi.value = '';
  }

  /* ═══ COMPRESSION IMAGE AVANT UPLOAD ═══ */
  function compressImageToBlob(file, maxPx, quality) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) { resolve(file); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxPx || h > maxPx) {
          const ratio = Math.min(maxPx / w, maxPx / h);
          w = Math.round(w * ratio); h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', quality || 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  /* ═══ UPLOAD CLOUDINARY (même config que uploadProfilePhoto dans index.html) ═══ */
  const GSC_CLOUD_NAME   = 'djvzc3vqp';
  const GSC_UPLOAD_PRESET = 'gsc_admin_uploads';

  async function uploadImageToCloudinary(file) {
    /* Compression : max 1200px, qualité 0.82 */
    const blob = await compressImageToBlob(file, 1200, 0.82);
    const fd = new FormData();
    fd.append('file', blob, 'community_' + Date.now() + '.jpg');
    fd.append('upload_preset', GSC_UPLOAD_PRESET);
    fd.append('folder', 'community');
    /* Progress via XHR pour afficher le % */
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${GSC_CLOUD_NAME}/image/upload`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setPublishBtnState(`⬆️ ${pct}%…`, true);
        }
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 200 && data.secure_url) {
            resolve(data.secure_url);
          } else {
            reject(new Error(data?.error?.message || `Cloudinary HTTP ${xhr.status}`));
          }
        } catch (e) { reject(e); }
      };
      xhr.onerror = () => reject(new Error('Erreur réseau Cloudinary'));
      xhr.send(fd);
    });
  }

  /* ═══ AUTOCOMPLETE @MENTION ═══ */
  function getMentionTarget(scope, postId) {
    if (scope === 'composer') return document.getElementById('gsc-composer-text');
    return document.getElementById('gsc-comment-input-' + postId);
  }
  function getMentionPopEl(scope, postId) {
    if (scope === 'composer') return document.getElementById('gsc-composer-mention-pop');
    return document.getElementById('gsc-mention-pop-' + postId);
  }

  function onMentionInput(e, scope, postId) {
    const input = e.target;
    const pop = getMentionPopEl(scope, postId);
    if (!pop) return;
    const caret = input.selectionStart;
    const value = input.value.slice(0, caret);
    const match = value.match(/@([^\s@]{0,30})$/);
    if (!match) { closeMentionPop(scope, postId); return; }
    const results = searchActorsForMention(match[1]);
    if (!results.length) { closeMentionPop(scope, postId); return; }
    _mentionState = { scope, postId, start: caret - match[0].length, query: match[1] };
    pop.innerHTML = results.map((r, i) => `
      <div class="gsc-mention-item${i === 0 ? ' active' : ''}" data-idx="${i}" data-id="${r.id}" data-name="${esc(r.name)}">
        <div class="gsc-avatar">${esc(initials(r.name))}</div>
        <span>${esc(r.name)}</span>
        <small>${esc(roleLabel(r.role))}</small>
      </div>`).join('');
    pop.classList.add('open');
    pop.querySelectorAll('.gsc-mention-item').forEach(item => {
      item.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        applyMention(scope, postId, item.dataset.name);
      });
    });
  }

  function onMentionKeydown(e, scope, postId) {
    const pop = getMentionPopEl(scope, postId);
    if (!pop || !pop.classList.contains('open')) return;
    const items = [...pop.querySelectorAll('.gsc-mention-item')];
    if (!items.length) return;
    let activeIdx = items.findIndex(i => i.classList.contains('active'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[activeIdx]?.classList.remove('active');
      activeIdx = (activeIdx + 1) % items.length;
      items[activeIdx].classList.add('active');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[activeIdx]?.classList.remove('active');
      activeIdx = (activeIdx - 1 + items.length) % items.length;
      items[activeIdx].classList.add('active');
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applyMention(scope, postId, items[activeIdx]?.dataset.name);
    } else if (e.key === 'Escape') {
      closeMentionPop(scope, postId);
    }
  }

  function applyMention(scope, postId, name) {
    if (!_mentionState || !name) return;
    const input = getMentionTarget(scope, postId);
    if (!input) return;
    const before = input.value.slice(0, _mentionState.start);
    const after = input.value.slice(input.selectionStart);
    const insert = '@' + name + ' ';
    input.value = before + insert + after;
    const newCaret = (before + insert).length;
    input.focus();
    input.setSelectionRange(newCaret, newCaret);
    closeMentionPop(scope, postId);
  }

  function closeMentionPop(scope, postId) {
    const pop = getMentionPopEl(scope, postId);
    if (pop) { pop.classList.remove('open'); pop.innerHTML = ''; }
    _mentionState = null;
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.gsc-mention-pop') && !e.target.closest('textarea, input[type="text"]')) {
      document.querySelectorAll('.gsc-mention-pop.open').forEach(p => { p.classList.remove('open'); p.innerHTML = ''; });
    }
  });

  function setPublishBtnState(label, disabled) {
    const btn = document.getElementById('gsc-composer-publish');
    if (!btn) return;
    btn.textContent = label;
    btn.disabled = !!disabled;
  }

  async function createPost() {
    if (!isLogged()) { toastMsg('Connectez-vous pour publier.', 'info'); return; }
    const ta = document.getElementById('gsc-composer-text');
    const text = (ta?.value || '').trim();
    const cat = document.getElementById('gsc-composer-cat')?.value || 'general';
    const targetRole = document.getElementById('gsc-composer-target')?.value || null;
    if (!text && !_composerImage) { toastMsg('Écrivez un message ou ajoutez une image.', 'info'); return; }

    setPublishBtnState('Publication…', true);

    try {
      let imageURL = null;

      if (_composerImage && _composerImage.file) {
        /* ── Upload Cloudinary (même système que uploadProfilePhoto) ── */
        setPublishBtnState('⚙️ Compression…', true);
        try {
          imageURL = await uploadImageToCloudinary(_composerImage.file);
        } catch (uploadErr) {
          console.warn('GSC Community: Cloudinary échoué —', uploadErr.message);
          /* Fallback : base64 compressé si Cloudinary indisponible */
          toastMsg('⚠️ Upload image échoué — publication sans image.', 'warn');
          imageURL = null;
        }
      }

      /* ── Écriture Firestore ── */
      setPublishBtnState('💾 Enregistrement…', true);
      const profile = window.userProfile || {};
      await withAuth(() => window.addDoc(window.collection(window.db, POSTS_COL), {
        authorId: window.currentUser.uid,
        authorName: authorName(profile),
        authorRole: profile.role || 'membre',
        authorPhoto: profile.photoURL || null,
        text,
        imageURL,
        category: cat,
        targetRole: targetRole || null,
        reactions: {},
        reportsCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        status: 'visible',
        createdAt: window.serverTimestamp()
      }));

      /* Notifier les membres mentionnés via @Nom : "X a publié sur vous" */
      notifyMentions(text, { authorProfile: profile, action: 'post', excludeUid: window.currentUser.uid });

      /* Notifier les membres ciblés ou tous (général) */
      const postRecipient = targetRole ? ('role:' + targetRole) : 'all';
      pushNotif({
        type: 'system',
        recipientId: postRecipient,
        personal: false,
        title: (authorName(profile) || 'Un membre') + ' a publié dans le fil communautaire',
        body: (cat ? '[' + cat + '] ' : '') + text.slice(0, 100),
        link: 'fil:new'
      });

      if (ta) ta.value = '';
      clearComposerImage();
      const targetSel = document.getElementById('gsc-composer-target');
      if (targetSel) targetSel.value = '';
      toastMsg('✅ Publication envoyée.', 'success');

    } catch (e) {
      console.error('GSC Community createPost:', e);
      toastMsg('Erreur : ' + (e.message || e), 'error');
    }

    setPublishBtnState('Publier', false);
  }
  let _retryTimer = null;
  function ensureSubscribed() {
    renderComposer();
    if (_subscribed) { renderFeed(); return; }
    if (!ready()) {
      // Firebase pas encore prêt — réessayer dans 800ms
      clearTimeout(_retryTimer);
      _retryTimer = setTimeout(ensureSubscribed, 800);
      renderFeed();
      return;
    }
    _subscribed = true;
    loadBlocked().then(() => {
      try {
        const q = window.query(window.collection(window.db, POSTS_COL), window.orderBy('createdAt', 'desc'), window.limit(60));
        _unsub = window.onSnapshot(q, (snap) => {
          _posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          renderFeed();
        }, (err) => { console.warn('GSC Community :', err); });
      } catch (e) { console.warn('GSC Community :', e); }
    });
  }

  async function loadBlocked() {
    _blockedIds = new Set();
    if (!isLogged() || !ready()) return;
    try {
      const snap = await window.getDocs(window.query(window.collection(window.db, BLOCKS_COL), window.where('blockerId', '==', window.currentUser.uid)));
      snap.docs.forEach(d => _blockedIds.add(d.data().blockedId));
    } catch (e) {}
  }

  /* ═══ RENDU DU FIL ═══ */
  function renderFeed() {
    const list = document.getElementById('gsc-feed-list');
    if (!list) return;
    const isAdmin = window.userProfile?.role === 'admin';
    let visible = _posts.filter(p => p.status !== 'removed' && !_blockedIds.has(p.authorId));
    visible = visible.filter(p => (p.status !== 'hidden') || isAdmin);
    if (_currentCat !== 'all') visible = visible.filter(p => (p.category || 'general') === _currentCat);
    if (_currentRoleCat !== 'all') visible = visible.filter(p => p.targetRole === _currentRoleCat);

    if (!ready()) {
      list.innerHTML = `<div class="gsc-empty"><div class="e-icon">📡</div>Fil communautaire indisponible hors connexion.</div>`;
      return;
    }
    if (!visible.length) {
      list.innerHTML = `<div class="gsc-empty"><div class="e-icon">💬</div>Aucune publication pour le moment.<br>Soyez le premier à partager quelque chose !</div>`;
      return;
    }
    list.innerHTML = visible.map(postCardHTML).join('');
  }

  function reactionSummary(post) {
    const reactions = post.reactions || {};
    const counts = {};
    let mine = null;
    Object.keys(reactions).forEach(uid => {
      const k = reactions[uid];
      counts[k] = (counts[k] || 0) + 1;
      if (window.currentUser && uid === window.currentUser.uid) mine = k;
    });
    return { counts, mine };
  }

  function postCardHTML(post) {
    const { counts, mine } = reactionSummary(post);
    const isOwner = window.currentUser && post.authorId === window.currentUser.uid;
    const isAdmin = window.userProfile?.role === 'admin';
    const flagged = post.status === 'hidden';
    const catInfo = CATS.find(c => c.key === (post.category || 'general'));
    const targetInfo = post.targetRole ? ROLE_CATS.find(c => c.key === post.targetRole) : null;
    const menuOpen = _openMenus.has(post.id);
    const commentsOpen = _openComments.has(post.id);
    const commentsCount = post.commentsCount || 0;
    const hasProfile = !!post.authorId;

    return `
    <div class="gsc-post${flagged ? ' gsc-flagged' : ''}" data-post-id="${post.id}">
      <div class="gsc-post-head">
        <div class="gsc-avatar${hasProfile ? ' clickable' : ''}" data-action="${post.authorPhoto ? 'view-photo' : 'view-profile'}" data-uid="${esc(post.authorId || '')}" data-photo="${esc(post.authorPhoto || '')}">${post.authorPhoto ? `<img src="${esc(post.authorPhoto)}" alt="">` : esc(initials(post.authorName))}</div>
        <div class="gsc-post-meta">
          <div class="gsc-post-name${hasProfile ? ' clickable' : ''}" data-action="view-profile" data-uid="${esc(post.authorId || '')}">${esc(post.authorName || 'Membre GSC')}</div>
          <div class="gsc-post-sub">
            <span>🕐 ${timeAgo(post.createdAt)}</span>
            ${catInfo ? `<span class="gsc-post-cat-tag">${catInfo.icon} ${esc(catInfo.label)}</span>` : ''}
            ${targetInfo ? `<span class="gsc-post-target-tag" title="Publication ciblée" style="background:color-mix(in srgb, ${targetInfo.color} 16%, #fff);color:${targetInfo.colorDk};">🎯 ${targetInfo.icon} ${esc(targetInfo.label)}</span>` : ''}
            ${flagged ? `<span class="gsc-flag-tag">⚠️ En attente de modération</span>` : ''}
          </div>
        </div>
        <div class="gsc-post-menu-wrap">
          <button class="gsc-post-menu-btn" data-action="menu-toggle" type="button">⋯</button>
          <div class="gsc-post-menu${menuOpen ? ' open' : ''}">
            <button data-action="share" type="button">🔗 Partager</button>
            ${!isOwner ? `<button data-action="report-post" type="button">🚩 Signaler</button>` : ''}
            ${!isOwner ? `<button data-action="block" type="button">🚫 Bloquer ${esc((post.authorName || 'ce membre').split(' ')[0])}</button>` : ''}
            ${(isOwner || isAdmin) ? `<button class="danger" data-action="delete-post" type="button">🗑️ Supprimer</button>` : ''}
          </div>
        </div>
      </div>
      ${post.text ? `<div class="gsc-post-text">${renderTextWithMentions(post.text)}</div>` : ''}
      ${post.imageURL ? `<img class="gsc-post-img" src="${esc(post.imageURL)}" alt="" loading="lazy" data-action="view-photo" data-photo="${esc(post.imageURL)}">` : ''}
      <div class="gsc-react-row">
        ${REACTIONS.map(r => `<button class="gsc-react-btn${mine === r.key ? ' mine' : ''}" data-action="react" data-key="${r.key}" type="button">${r.icon}${counts[r.key] ? ` ${counts[r.key]}` : ''}</button>`).join('')}
      </div>
      <div class="gsc-post-actions">
        <button class="gsc-post-action" data-action="toggle-comments" type="button">💬 ${commentsCount ? `${commentsCount} commentaire${commentsCount > 1 ? 's' : ''}` : 'Commenter'}</button>
        <button class="gsc-post-action" data-action="share" type="button">↗️ Partager${post.sharesCount ? ` (${post.sharesCount})` : ''}</button>
      </div>
      ${commentsOpen ? commentsHTML(post) : ''}
    </div>`;
  }

  function commentsHTML(post) {
    const list = _commentsCache[post.id];
    const isAdmin = window.userProfile?.role === 'admin';
    const itemsHtml = !list
      ? `<div style="font-size:12px;color:var(--gray-txt);padding:6px 0;">Chargement des commentaires…</div>`
      : (!list.length
        ? `<div style="font-size:12px;color:var(--gray-txt);padding:6px 0;">Aucun commentaire. Soyez le premier à répondre !</div>`
        : list.map(c => {
          const canDelete = isAdmin || (window.currentUser && c.authorId === window.currentUser.uid);
          const cHasProfile = !!c.authorId;
          return `
          <div class="gsc-comment" data-comment-id="${c.id}">
            <div class="gsc-avatar sm${cHasProfile ? ' clickable' : ''}" data-action="${c.authorPhoto ? 'view-photo' : 'view-profile'}" data-uid="${esc(c.authorId || '')}" data-photo="${esc(c.authorPhoto || '')}">${c.authorPhoto ? `<img src="${esc(c.authorPhoto)}" alt="">` : esc(initials(c.authorName))}</div>
            <div class="gsc-comment-body">
              <div class="gsc-comment-name${cHasProfile ? ' clickable' : ''}" data-action="view-profile" data-uid="${esc(c.authorId || '')}">${esc(c.authorName || 'Membre GSC')}</div>
              <div class="gsc-comment-text">${renderTextWithMentions(c.text || '')}</div>
              <div class="gsc-comment-time">${timeAgo(c.createdAt)}</div>
            </div>
            ${canDelete ? `<button class="gsc-comment-del" data-action="delete-comment" data-comment-id="${c.id}" type="button">🗑️</button>` : `<button class="gsc-comment-del" data-action="report-comment" data-comment-id="${c.id}" type="button" title="Signaler">🚩</button>`}
          </div>`;
        }).join(''));

    return `
      <div class="gsc-comments">
        ${itemsHtml}
        ${isLogged() ? `
        <div class="gsc-comment-composer">
          <input type="text" id="gsc-comment-input-${post.id}" maxlength="500" placeholder="Écrire un commentaire… (@Nom pour mentionner)">
          <button data-action="send-comment" type="button">➤</button>
          <div class="gsc-mention-pop" id="gsc-mention-pop-${post.id}"></div>
        </div>` : ''}
      </div>`;
  }

  /* ═══ DÉLÉGATION DES CLICS DU FIL ═══ */
  function onFeedClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const card = btn.closest('[data-post-id]');
    const postId = card?.dataset.postId;
    const action = btn.dataset.action;
    switch (action) {
      case 'menu-toggle':
        if (_openMenus.has(postId)) _openMenus.delete(postId); else { _openMenus.clear(); _openMenus.add(postId); }
        renderFeed();
        break;
      case 'react': reactToPost(postId, btn.dataset.key); break;
      case 'toggle-comments': toggleComments(postId); break;
      case 'share': sharePost(postId); break;
      case 'report-post': openReportModal('post', postId, postId); break;
      case 'report-comment': openReportModal('comment', btn.dataset.commentId, postId); break;
      case 'block': blockAuthor(postId); break;
      case 'delete-post': deletePost(postId); break;
      case 'send-comment': sendComment(postId); break;
      case 'delete-comment': deleteComment(postId, btn.dataset.commentId); break;
      case 'view-profile': openMemberProfile(btn.dataset.uid); break;
      case 'view-photo': openPhotoFullscreen(btn.dataset.photo); break;
    }
  }

  /* Brancher l'autocomplete @mention sur les champs de commentaire (créés dynamiquement) */
  document.addEventListener('focusin', (e) => {
    const input = e.target.closest('[id^="gsc-comment-input-"]');
    if (!input || input._gscMentionBound) return;
    input._gscMentionBound = true;
    const postId = input.id.replace('gsc-comment-input-', '');
    input.addEventListener('input', (ev) => onMentionInput(ev, 'comment', postId));
    input.addEventListener('keydown', (ev) => onMentionKeydown(ev, 'comment', postId));
  });

  /* Fermer les menus "⋯" au clic ailleurs */
  document.addEventListener('click', (e) => {
    if (_openMenus.size && !e.target.closest('.gsc-post-menu-wrap')) { _openMenus.clear(); renderFeed(); }
  });

  /* ═══ RÉACTIONS ═══ */
  async function reactToPost(postId, key) {
    if (!isLogged()) { toastMsg('Connectez-vous pour réagir.', 'info'); return; }
    const post = _posts.find(p => p.id === postId); if (!post) return;
    const uid = window.currentUser.uid;
    const current = (post.reactions || {})[uid];
    const fns = await getExtraFns();
    try {
      const patch = {};
      if (current === key) {
        patch['reactions.' + uid] = fns.deleteField ? fns.deleteField() : null;
        if (post.reactions) delete post.reactions[uid];
      } else {
        patch['reactions.' + uid] = key;
        post.reactions = post.reactions || {}; post.reactions[uid] = key;
      }
      renderFeed();
      await withAuth(() => window.updateDoc(window.doc(window.db, POSTS_COL, postId), patch));
      if (current !== key && post.authorId && post.authorId !== uid) {
        const reactionMeta = REACTIONS.find(r => r.key === key);
        pushNotif({
          type: 'like', recipientId: post.authorId, personal: true,
          title: `${authorName(window.userProfile || {})} a réagi à votre publication`,
          body: `${reactionMeta ? reactionMeta.icon : '👍'} sur « ${(post.text || '').slice(0, 60)} »`,
          link: 'fil:' + postId
        });
      }
    } catch (e) { toastMsg('Erreur lors de la réaction.', 'error'); }
  }

  /* ═══ COMMENTAIRES ═══ */
  async function toggleComments(postId) {
    if (_openComments.has(postId)) { _openComments.delete(postId); renderFeed(); return; }
    _openComments.add(postId);
    renderFeed();
    if (!_commentsCache[postId]) {
      try {
        const snap = await window.getDocs(window.query(window.collection(window.db, POSTS_COL, postId, COMMENTS_SUB), window.orderBy('createdAt', 'asc'), window.limit(200)));
        _commentsCache[postId] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { _commentsCache[postId] = []; }
      renderFeed();
    }
  }

  async function sendComment(postId) {
    if (!isLogged()) { toastMsg('Connectez-vous pour commenter.', 'info'); return; }
    const input = document.getElementById('gsc-comment-input-' + postId);
    const text = (input?.value || '').trim();
    if (!text) return;
    const profile = window.userProfile || {};
    const commentData = { authorId: window.currentUser.uid, authorName: authorName(profile), authorPhoto: profile.photoURL || null, text, createdAt: window.serverTimestamp() };
    try {
      const ref = await withAuth(() => window.addDoc(window.collection(window.db, POSTS_COL, postId, COMMENTS_SUB), commentData));
      const fns = await getExtraFns();
      const post = _posts.find(p => p.id === postId);
      await withAuth(() => window.updateDoc(window.doc(window.db, POSTS_COL, postId), { commentsCount: fns.increment ? fns.increment(1) : ((post?.commentsCount || 0) + 1) }));
      if (!_commentsCache[postId]) _commentsCache[postId] = [];
      _commentsCache[postId].push({ id: ref.id, ...commentData, createdAt: Date.now() });
      if (post) post.commentsCount = (post.commentsCount || 0) + 1;
      if (input) input.value = '';
      renderFeed();
      if (post && post.authorId && post.authorId !== window.currentUser.uid) {
        pushNotif({
          type: 'comment', recipientId: post.authorId, personal: true,
          title: `${authorName(profile)} a commenté votre publication`,
          body: text.slice(0, 100),
          link: 'fil:' + postId
        });
      }
      /* Notifier les membres mentionnés via @Nom : "X a commenté sur vous" */
      notifyMentions(text, { authorProfile: profile, action: 'comment', excludeUid: window.currentUser.uid });
    } catch (e) { toastMsg('Erreur lors de l\'envoi du commentaire.', 'error'); }
  }

  async function deleteComment(postId, commentId) {
    if (!confirm('Supprimer ce commentaire ?')) return;
    try {
      await withAuth(() => window.deleteDoc(window.doc(window.db, POSTS_COL, postId, COMMENTS_SUB, commentId)));
      if (_commentsCache[postId]) _commentsCache[postId] = _commentsCache[postId].filter(c => c.id !== commentId);
      const fns = await getExtraFns();
      const post = _posts.find(p => p.id === postId);
      await withAuth(() => window.updateDoc(window.doc(window.db, POSTS_COL, postId), { commentsCount: fns.increment ? fns.increment(-1) : Math.max(0, (post?.commentsCount || 1) - 1) }));
      if (post) post.commentsCount = Math.max(0, (post.commentsCount || 1) - 1);
      renderFeed();
      toastMsg('🗑️ Commentaire supprimé.', 'success');
    } catch (e) { toastMsg('Erreur lors de la suppression.', 'error'); }
  }

  /* ═══ PARTAGE ═══ */
  async function sharePost(postId) {
    const post = _posts.find(p => p.id === postId); if (!post) return;
    const url = location.origin + location.pathname + '?post=' + postId;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Gabon Sport Connect', text: (post.text || '').slice(0, 120), url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toastMsg('🔗 Lien copié dans le presse-papiers.', 'success');
      }
      const fns = await getExtraFns();
      post.sharesCount = (post.sharesCount || 0) + 1;
      renderFeed();
      await withAuth(() => window.updateDoc(window.doc(window.db, POSTS_COL, postId), { sharesCount: fns.increment ? fns.increment(1) : post.sharesCount }));
    } catch (e) { /* partage annulé par l'utilisateur — silencieux */ }
  }

  /* ═══ BLOCAGE ═══ */
  async function blockAuthor(postId) {
    const post = _posts.find(p => p.id === postId); if (!post) return;
    if (!isLogged()) { toastMsg('Connectez-vous pour bloquer un membre.', 'info'); return; }
    if (post.authorId === window.currentUser.uid) { toastMsg('Vous ne pouvez pas vous bloquer vous-même.', 'info'); return; }
    if (!confirm(`Bloquer ${post.authorName || 'ce membre'} ? Vous ne verrez plus ses publications.`)) return;
    try {
      const id = window.currentUser.uid + '_' + post.authorId;
      await withAuth(() => window.setDoc(window.doc(window.db, BLOCKS_COL, id), {
        blockerId: window.currentUser.uid, blockedId: post.authorId, blockedName: post.authorName || '', createdAt: window.serverTimestamp()
      }));
      _blockedIds.add(post.authorId);
      toastMsg('🚫 Membre bloqué.', 'success');
      renderFeed();
    } catch (e) { toastMsg('Erreur lors du blocage.', 'error'); }
  }

  /* ═══ SUPPRESSION D'UNE PUBLICATION ═══ */
  async function deletePost(postId) {
    const post = _posts.find(p => p.id === postId); if (!post) return;
    const isOwner = window.currentUser && post.authorId === window.currentUser.uid;
    const isAdmin = window.userProfile?.role === 'admin';
    if (!isOwner && !isAdmin) return;
    if (!confirm('Supprimer définitivement cette publication ?')) return;
    try {
      await withAuth(() => window.updateDoc(window.doc(window.db, POSTS_COL, postId), { status: 'removed', removedAt: window.serverTimestamp(), removedBy: window.currentUser?.uid || null }));
      toastMsg('🗑️ Publication supprimée.', 'success');
    } catch (e) { toastMsg('Erreur lors de la suppression.', 'error'); }
  }

  /* ═══ SIGNALEMENT ═══ */
  function openReportModal(type, targetId, postId) {
    if (!isLogged()) { toastMsg('Connectez-vous pour signaler un contenu.', 'info'); return; }
    _reportCtx = { type, targetId, postId: postId || targetId };
    document.getElementById('gsc-report-detail').value = '';
    document.querySelectorAll('input[name="gsc-report-reason"]').forEach(r => r.checked = false);
    document.getElementById('gsc-report-modal')?.classList.add('open');
  }
  function closeReportModal() { document.getElementById('gsc-report-modal')?.classList.remove('open'); _reportCtx = null; }

  async function submitReport() {
    if (!_reportCtx) return;
    const reasonEl = document.querySelector('input[name="gsc-report-reason"]:checked');
    const reason = reasonEl?.value || 'autre';
    const detail = document.getElementById('gsc-report-detail')?.value.trim() || '';
    const ctx = _reportCtx;
    try {
      const profile = window.userProfile || {};
      await withAuth(() => window.addDoc(window.collection(window.db, REPORTS_COL), {
        type: ctx.type, targetId: ctx.targetId, postId: ctx.postId, reason, detail,
        reporterId: window.currentUser.uid, reporterName: authorName(profile),
        status: 'pending', createdAt: window.serverTimestamp()
      }));
      if (ctx.type === 'post') {
        const post = _posts.find(p => p.id === ctx.targetId);
        if (post) {
          post.reportsCount = (post.reportsCount || 0) + 1;
          const fns = await getExtraFns();
          const patch = { reportsCount: fns.increment ? fns.increment(1) : post.reportsCount };
          if (post.reportsCount >= REPORT_THRESHOLD && post.status === 'visible') {
            patch.status = 'hidden'; post.status = 'hidden';
            if (post.authorId) {
              pushNotif({
                type: 'alert', recipientId: post.authorId, personal: true,
                title: 'Votre publication a été masquée',
                body: 'Suite à plusieurs signalements, votre publication est en attente de revue par un modérateur.',
                link: 'fil:' + post.id
              });
            }
          }
          await withAuth(() => window.updateDoc(window.doc(window.db, POSTS_COL, post.id), patch));
        }
      }
      closeReportModal();
      renderFeed();
      toastMsg('✅ Signalement envoyé. Merci, notre équipe va l\'examiner.', 'success');
    } catch (e) { toastMsg('Erreur lors du signalement.', 'error'); }
  }

  /* ═══ INITIALISATION ═══ */
  function init() {
    mountUI();
  }

  if (document.getElementById('view-actualites')) init();
  else document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('firebase-ready', () => { renderComposer(); });

  window.GSCCommunity = { refresh: renderFeed, ensureSubscribed, refreshComposer: renderComposer };

})(window);
