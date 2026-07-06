/* ═══════════════════════════════════════════════════════════════════════════
   GSC-NAV-BADGES.JS — Badges de notifications contextuels
   Affiche le nombre de notifications non lues :
   • Sur le logo (topnav) — total global
   • Sur le bouton bnav-actualites — commentaires + réactions communautaires
   • Sur le bouton bnav-profil — alertes profil / mentions
   • Sur le bouton bnav-annuaire — nouvelles inscriptions (admin seulement)
   • Dans le menu latéral — sur chaque item concerné
   • Sur le bouton hamburger — si au moins 1 notif non lue
   Se retire automatiquement à la lecture (clic sur l'élément).
   ═══════════════════════════════════════════════════════════════════════════ */
(function (window) {
  'use strict';

  /* ── Config ── */
  const NOTIFS_COL   = 'notifications';
  const READ_KEY     = 'gsc_notif_read_ids';   // localStorage (IDs lus)
  const POLL_MS      = 30_000;                  // re-poll si pas de onSnapshot

  /* ── Mapping type → zone nav ── */
  const TYPE_TO_ZONE = {
    comment  : ['actualites', 'profil'],
    like     : ['actualites', 'profil'],
    react    : ['actualites', 'profil'],
    follow   : ['profil'],
    mention  : ['actualites', 'profil'],
    alert    : ['profil'],
    system   : [],          // global seulement
    pending  : ['admin'],   // pour les admins
    validate : ['profil'],
  };

  /* ── État interne ── */
  let _uid          = null;
  let _items        = [];   // toutes notifs de l'utilisateur
  let _readIds      = new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
  let _unsub        = null;
  let _pollTimer    = null;
  let _initialized  = false;

  /* ═══ STYLES ═══ */
  function injectStyles() {
    if (document.getElementById('gsc-nav-badge-styles')) return;
    const s = document.createElement('style');
    s.id = 'gsc-nav-badge-styles';
    s.textContent = `
/* Badge générique — superposé en haut-droite du parent */
.gsc-nb {
  position: absolute;
  top: -4px; right: -5px;
  min-width: 17px; height: 17px;
  background: #ef4444;
  color: #fff;
  border-radius: 99px;
  font-size: 10px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  padding: 0 4px;
  border: 2px solid var(--navy, #0A1628);
  pointer-events: none;
  z-index: 999;
  line-height: 1;
  animation: gsc-nb-pop .25s cubic-bezier(.34,1.56,.64,1) both;
  font-family: var(--font-body, sans-serif);
}
/* CRITIQUE : les parents du badge ne doivent pas couper le débordement */
#gsc-notif-bell,
.btn-icon,
.bnav-item,
.gsc-nb-wrap,
[id^="bnav-"] {
  overflow: visible !important;
}
/* Variante sur fond blanc (bottom-nav) */
.gsc-nb.light {
  border-color: #fff;
}
/* Sur le logo (fond foncé) — taille légèrement plus grande */
.gsc-nb.lg {
  min-width: 19px; height: 19px;
  font-size: 11px; top: -2px; right: -2px;
}
@keyframes gsc-nb-pop {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

/* Wrapper position:relative auto-injecté */
.gsc-nb-wrap { position: relative; display: inline-flex; }

/* Point rouge minimal quand count = 0 mais activité récente */
.gsc-nb.dot { min-width: 10px; width: 10px; height: 10px; padding: 0; font-size: 0; }

/* Badge sur side-menu-item (inline, à droite du texte) */
.gsc-smi-badge {
  margin-left: auto;
  background: #ef4444;
  color: #fff;
  border-radius: 99px;
  font-size: 10px; font-weight: 800;
  padding: 1px 6px;
  font-family: var(--font-body, sans-serif);
  animation: gsc-nb-pop .25s cubic-bezier(.34,1.56,.64,1) both;
}
`;
    document.head.appendChild(s);
  }

  /* ═══ LECTURE PERSISTANTE ═══ */
  function saveRead() {
    try { localStorage.setItem(READ_KEY, JSON.stringify([..._readIds])); } catch(e) {}
  }
  function markRead(id) {
    if (!id || _readIds.has(id)) return;
    _readIds.add(id);
    saveRead();
  }
  function markZoneRead(zone) {
    /* Marquer comme lues toutes les notifs de la zone donnée */
    _items.forEach(n => {
      if (!n.id || _readIds.has(n.id)) return;
      const zones = TYPE_TO_ZONE[n.type] || [];
      if (zones.includes(zone) || zone === 'all') markRead(n.id);
    });
    render();
  }
  function isRead(n) { return _readIds.has(n.id); }

  /* ═══ COMPTAGE PAR ZONE ═══ */
  function countForZone(zone) {
    return _items.filter(n => {
      if (isRead(n)) return false;
      if (zone === 'all') return true;
      return (TYPE_TO_ZONE[n.type] || []).includes(zone);
    }).length;
  }

  /* ═══ RENDU DES BADGES ═══ */
  function render() {
    const totalUnread = countForZone('all');

    /* 1. Logo topnav ── badge global */
    setBadgeOnEl('topnav-logo-badge-anchor', totalUnread, 'lg');

    /* 2. Bottom nav items */
    setBadgeOnBnav('bnav-actualites', countForZone('actualites'), 'light');
    setBadgeOnBnav('bnav-profil',     countForZone('profil'),     'light');
    setBadgeOnBnav('bnav-admin',      countForZone('admin'),      'light');

    /* 3. Bouton hamburger ── si des notifs non lues existent */
    setBadgeOnBnav('nav-menu-btn', totalUnread, '');

    /* 4. Side-menu items */
    setSideMenuBadge('side-menu-actualites', countForZone('actualites'));
    setSideMenuBadge('side-menu-profil',     countForZone('profil'));
    setSideMenuBadge('side-menu-admin',      countForZone('admin'));

    /* 5. Tab "💬 Fil communautaire" dans la vue Actu */
    setBadgeOnTabBtn('gsc-tab-community', countForZone('actualites'), 'light');
  }

  /* ── Badge sur un élément nav avec wrap automatique ── */
  function setBadgeOnEl(anchorId, count, cls) {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;
    let badge = anchor.querySelector('.gsc-nb');
    if (count <= 0) { if (badge) badge.remove(); return; }
    if (!badge) { badge = document.createElement('span'); badge.className = 'gsc-nb' + (cls ? ' ' + cls : ''); anchor.style.position = 'relative'; anchor.appendChild(badge); }
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.className   = 'gsc-nb' + (cls ? ' ' + cls : '');
  }

  /* ── Badge sur un bnav-item ou btn-icon ── */
  function setBadgeOnBnav(id, count, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    /* S'assurer que l'élément est en position relative */
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    let badge = el.querySelector(':scope > .gsc-nb');
    if (count <= 0) { if (badge) badge.remove(); return; }
    if (!badge) { badge = document.createElement('span'); badge.className = 'gsc-nb' + (cls ? ' ' + cls : ''); el.appendChild(badge); }
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.className   = 'gsc-nb' + (cls ? ' ' + cls : '');
  }

  /* ── Badge inline dans un side-menu-item ── */
  function setSideMenuBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    let badge = el.querySelector('.gsc-smi-badge');
    if (count <= 0) { if (badge) badge.remove(); return; }
    if (!badge) { badge = document.createElement('span'); badge.className = 'gsc-smi-badge'; el.appendChild(badge); }
    badge.textContent = count > 99 ? '99+' : String(count);
  }

  /* ── Badge sur un tab button (gsc-tab-btn) ── */
  function setBadgeOnTabBtn(id, count, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    let badge = el.querySelector(':scope > .gsc-nb');
    if (count <= 0) { if (badge) badge.remove(); return; }
    if (!badge) { badge = document.createElement('span'); badge.className = 'gsc-nb' + (cls ? ' ' + cls : ''); el.appendChild(badge); }
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.className   = 'gsc-nb' + (cls ? ' ' + cls : '');
  }

  /* ═══ ANCRAGE SUR LE LOGO ═══ */
  function ensureLogoAnchor() {
    /* Le logo est .topnav-logo — on lui ajoute un id d'ancre si absent */
    if (document.getElementById('topnav-logo-badge-anchor')) return;
    const logo = document.querySelector('.topnav-logo');
    if (!logo) return;
    logo.id = logo.id || 'topnav-logo-badge-anchor';
    if (!logo.id) logo.setAttribute('id', 'topnav-logo-badge-anchor');
    /* S'assurer position relative */
    logo.style.position = 'relative';
  }

  /* ═══ MARQUAGE AUTO AU CLIC ═══ */
  function bindClickHandlers() {
    /* Bottom nav → marque la zone correspondante */
    const bnavMap = {
      'bnav-actualites' : 'actualites',
      'bnav-profil'     : 'profil',
      'bnav-admin'      : 'admin',
      'bnav-dashboard'  : null,
      'bnav-annuaire'   : null,
      'bnav-sport'      : null,
      'bnav-stades'     : null,
      'bnav-legal'      : null,
    };
    Object.entries(bnavMap).forEach(([id, zone]) => {
      const el = document.getElementById(id);
      if (!el || el._gscBadgeBound) return;
      el._gscBadgeBound = true;
      el.addEventListener('click', () => { if (zone) markZoneRead(zone); });
    });

    /* Logo → marque tout */
    const logo = document.querySelector('.topnav-logo');
    if (logo && !logo._gscBadgeBound) {
      logo._gscBadgeBound = true;
      logo.addEventListener('click', () => markZoneRead('all'));
    }

    /* Tab "Fil communautaire" → marque zone actualites */
    const tabComm = document.getElementById('gsc-tab-community');
    if (tabComm && !tabComm._gscBadgeBound) {
      tabComm._gscBadgeBound = true;
      tabComm.addEventListener('click', () => markZoneRead('actualites'));
    }

    /* Side menu items */
    const sideMap = {
      'side-menu-actualites' : 'actualites',
      'side-menu-profil'     : 'profil',
      'side-menu-admin'      : 'admin',
    };
    Object.entries(sideMap).forEach(([id, zone]) => {
      const el = document.getElementById(id);
      if (!el || el._gscBadgeBound) return;
      el._gscBadgeBound = true;
      el.addEventListener('click', () => markZoneRead(zone));
    });
  }

  /* ═══ CHARGEMENT DES NOTIFICATIONS ═══ */

  /* Depuis Firestore (temps réel) */
  async function subscribeFirestore(uid) {
    if (!window.db || typeof window.query !== 'function') return false;
    /* FIX : sans pont Firebase Auth valide, ce listener échoue avec
       "Missing or insufficient permissions" (request.auth.uid absent). */
    try {
      if (typeof window.ensureFirebaseAuthViaSupabase === 'function') {
        await window.ensureFirebaseAuthViaSupabase();
      }
    } catch (e) { console.warn('[GSC NavBadges] pont Firebase Auth indisponible —', e); }
    try {
      const q = window.query(
        window.collection(window.db, NOTIFS_COL),
        window.where('recipientId', 'in', [uid, 'all']),
        window.orderBy('createdAt', 'desc'),
        window.limit(100)
      );
      _unsub = window.onSnapshot(q, (snap) => {
        /* Exclure mes propres notifications émises (ex: publication diffusée à 'all') */
        _items = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(n => n.senderId !== uid);
        render();
      }, (err) => {
        console.warn('GSC NavBadges Firestore:', err);
        fallbackFromGSCNotif();
      });
      return true;
    } catch(e) {
      console.warn('GSC NavBadges subscribe:', e);
      return false;
    }
  }

  /* Fallback : lire depuis window.GSCNotif si Firestore indisponible */
  function fallbackFromGSCNotif() {
    if (!window.GSCNotif) return;
    /* GSCNotif expose getItems() ou _items selon la version */
    const items = typeof window.GSCNotif.getItems === 'function'
      ? window.GSCNotif.getItems()
      : (window.GSCNotif._items || []);
    if (!Array.isArray(items)) return;
    _items = items.filter(n => (n.recipientId === _uid || n.recipientId === 'all') && n.senderId !== _uid);
    render();
  }

  /* Fallback polling léger */
  function startPolling() {
    clearInterval(_pollTimer);
    _pollTimer = setInterval(fallbackFromGSCNotif, POLL_MS);
    fallbackFromGSCNotif();
  }

  /* ═══ INIT ═══ */
  function init(uid) {
    if (_initialized && _uid === uid) return;
    _initialized = true;
    _uid = uid;

    if (_unsub) { _unsub(); _unsub = null; }
    clearInterval(_pollTimer);
    _items = [];

    injectStyles();
    ensureLogoAnchor();
    bindClickHandlers();

    if (!uid) { render(); return; }

    /* Essayer Firestore d'abord, sinon polling */
    subscribeFirestore(uid).then((firestoreOk) => {
      if (!firestoreOk) startPolling();
    });
  }

  function onLogout() {
    _uid = null; _items = []; _initialized = false;
    if (_unsub) { _unsub(); _unsub = null; }
    clearInterval(_pollTimer);
    render();
  }

  /* ═══ HOOK SUR SHOWVIEW (marque au changement de vue) ═══ */
  function hookShowView() {
    const orig = window.showView;
    if (!orig || orig._gscNavBadgesHooked) return;
    window.showView = function(name) {
      const result = orig.apply(this, arguments);
      const zoneMap = { actualites: 'actualites', profil: 'profil', admin: 'admin' };
      if (zoneMap[name]) setTimeout(() => markZoneRead(zoneMap[name]), 400);
      return result;
    };
    window.showView._gscNavBadgesHooked = true;
  }

  /* ═══ INTÉGRATION AVEC GSCNotif ═══ */
  /* GSCNotif appelle window.GSCNavBadges.onPush() à chaque nouvelle notif */
  function onPush(notif) {
    if (!notif || !notif.id) return;
    if (notif.recipientId !== _uid && notif.recipientId !== 'all') return;
    if (notif.senderId && notif.senderId === _uid) return;
    /* Éviter les doublons */
    if (!_items.find(n => n.id === notif.id)) _items.unshift(notif);
    render();
  }

  /* ═══ DÉMARRAGE ═══ */
  function boot() {
    injectStyles();
    ensureLogoAnchor();
    bindClickHandlers();
    hookShowView();

    /* Attendre firebase-ready */
    document.addEventListener('firebase-ready', () => {
      const uid = window.currentUser?.uid || null;
      init(uid);
    });

    /* Si déjà prêt */
    if (window.currentUser?.uid) init(window.currentUser.uid);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* ── Ré-init si le DOM du tab communautaire est injecté après ── */
  const _mo = new MutationObserver(() => {
    const tab = document.getElementById('gsc-tab-community');
    if (tab && !tab._gscBadgeBound) bindClickHandlers();
  });
  _mo.observe(document.body, { childList: true, subtree: true });

  /* ── API publique ── */
  window.GSCNavBadges = { init, onLogout, onPush, render, markZoneRead };

})(window);
