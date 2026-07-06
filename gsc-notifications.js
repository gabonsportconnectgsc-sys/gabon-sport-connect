/* ═══════════════════════════════════════════════════════════════════════════
   GSC-NOTIFICATIONS.JS — Système Global de Notifications Gabon Sport Connect
   Version 2.0 — Badge PWA temps réel + Centre de notifications professionnel
   ═══════════════════════════════════════════════════════════════════════════ */

(function(window){
  'use strict';

  /* ── CONFIGURATION ── */
  const NOTIF_COLLECTION = 'notifications';
  const PREFS_COLLECTION = 'notif_preferences';
  const NOTIF_TYPES = {
    mention:     { label:'Mention',          icon:'🏷️',  color:'#3b82f6' },
    message:     { label:'Message',          icon:'💬',  color:'#8b5cf6' },
    follow:      { label:'Abonnement',       icon:'👤',  color:'#06b6d4' },
    like:        { label:'J\'aime',          icon:'❤️',  color:'#ef4444' },
    comment:     { label:'Commentaire',      icon:'💭',  color:'#f59e0b' },
    transfer:    { label:'Transfert',        icon:'🔄',  color:'#10b981' },
    match:       { label:'Match',            icon:'⚽',  color:'#009E60' },
    event:       { label:'Événement',        icon:'📅',  color:'#f97316' },
    news:        { label:'Actualité',        icon:'📰',  color:'#64748b' },
    system:      { label:'Système',          icon:'🔔',  color:'#FFD700' },
    achievement: { label:'Réalisation',      icon:'🏆',  color:'#d97706' },
    alert:       { label:'Alerte admin',     icon:'⚠️',  color:'#dc2626' },
  };

  /* ── WORKER PUSH URL ── */
  const WORKER_URL = 'https://solitary-dew-0560gsc-push-worker.gabonsportconnectgsc.workers.dev';

  /* FIX : relance le pont d'authentification Firebase (ensureFirebaseAuthViaSupabase,
     défini dans index.html/admin.html) avant CHAQUE écriture Firestore de ce module.
     Sans ça, dès que la session Firebase Auth établie au login expire ou devient
     invalide, toute écriture (prefs, read, dismiss, push) échoue avec
     "Missing or insufficient permissions" — même avec des règles Firestore correctes. */
  async function withAuth(fn) {
    try {
      if (typeof window.ensureFirebaseAuthViaSupabase === 'function') {
        await window.ensureFirebaseAuthViaSupabase();
      }
    } catch (e) {
      console.warn('[GSCNotif] pont Firebase Auth indisponible avant écriture —', e);
    }
    return fn();
  }

  /* ── ÉTAT INTERNE ── */
  let _notifications   = [];
  let _unreadCount     = 0;
  let _prefs           = null;
  let _firestoreUnsub  = null;
  let _panelOpen       = false;
  let _currentUserId   = null;
  let _badgeSW         = null;  // référence SW pour badgeAPI

  /* ── PRÉFÉRENCES PAR DÉFAUT ── */
  const DEFAULT_PREFS = {
    mention:true, message:true, follow:true, like:false,
    comment:true, transfer:true, match:true, event:true,
    news:false, system:true, achievement:true, alert:true,
    pushEnabled: false, soundEnabled: true, vibrationEnabled: true
  };

  /* ═══════════════════════════════════════════════════════════════
     INJECTION CSS
  ══════════════════════════════════════════════════════════════════ */
  function injectStyles(){
    if(document.getElementById('gsc-notif-styles')) return;
    const s = document.createElement('style');
    s.id = 'gsc-notif-styles';
    s.textContent = `
/* ── CLOCHE HEADER ── */
.notif-bell-wrap{position:relative;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.notif-bell-btn{
  width:38px;height:38px;display:flex;align-items:center;justify-content:center;
  background:transparent;border:none;cursor:pointer;border-radius:50%;
  transition:background .2s,transform .2s;color:#fff;padding:0;
  position:relative;flex-shrink:0;
}
.notif-bell-btn:hover{background:rgba(255,255,255,.1);}
.notif-bell-btn svg{width:22px;height:22px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .3s;}
.notif-bell-btn.ringing svg{animation:bellRing .6s ease;}
@keyframes bellRing{
  0%{transform:rotate(0)}15%{transform:rotate(14deg)}30%{transform:rotate(-12deg)}
  45%{transform:rotate(10deg)}60%{transform:rotate(-8deg)}75%{transform:rotate(5deg)}
  85%{transform:rotate(-4deg)}92%{transform:rotate(2deg)}100%{transform:rotate(0)}
}
/* Badge cloche */
.notif-bell-badge{
  position:absolute;top:-3px;right:-3px;
  min-width:17px;height:17px;padding:0 4px;
  background:#ef4444;color:#fff;font-size:10px;font-weight:800;
  border-radius:9px;display:none;align-items:center;justify-content:center;
  border:2px solid #0A1628;line-height:1;pointer-events:none;
  animation:badgePop .3s cubic-bezier(.36,.07,.19,.97);
}
.notif-bell-badge.visible{display:flex;}
@keyframes badgePop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}

/* ── PANEL NOTIFICATIONS ── */
#gsc-notif-panel{
  position:fixed;top:72px;right:12px;width:min(380px, calc(100vw - 24px));
  max-height:calc(100vh - 90px);background:#fff;border-radius:16px;
  box-shadow:0 20px 60px rgba(0,0,0,.18),0 4px 16px rgba(0,0,0,.08);
  z-index:9999;display:none;flex-direction:column;overflow:hidden;
  border:1px solid rgba(0,0,0,.06);
  animation:panelSlideIn .25s cubic-bezier(.16,1,.3,1);
}
#gsc-notif-panel.open{display:flex;}
@keyframes panelSlideIn{
  from{opacity:0;transform:translateY(-12px) scale(.97)}
  to{opacity:1;transform:translateY(0) scale(1)}
}
.notif-panel-head{
  display:flex;align-items:center;padding:16px 16px 12px;
  border-bottom:1px solid #f1f5f9;gap:10px;flex-shrink:0;
}
.notif-panel-title{font-size:16px;font-weight:800;color:#0A1628;flex:1;font-family:'Syne',sans-serif;}
.notif-panel-count{
  font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;
  background:#ef4444;color:#fff;display:none;
}
.notif-panel-count.visible{display:inline-block;}
.notif-panel-actions{display:flex;gap:6px;}
.notif-panel-btn{
  font-size:11px;font-weight:600;padding:5px 10px;border-radius:8px;
  border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;cursor:pointer;
  transition:all .15s;white-space:nowrap;
}
.notif-panel-btn:hover{background:#e2e8f0;color:#0A1628;}
.notif-panel-btn.primary{background:#009E60;color:#fff;border-color:#009E60;}
.notif-panel-btn.primary:hover{background:#007a47;}

/* Onglets */
.notif-tabs{display:flex;border-bottom:1px solid #f1f5f9;flex-shrink:0;padding:0 6px;}
.notif-tab{
  flex:1;padding:10px 8px;font-size:12px;font-weight:700;text-align:center;
  border:none;background:none;cursor:pointer;color:#94a3b8;
  border-bottom:2px solid transparent;transition:all .15s;font-family:'Inter',sans-serif;
}
.notif-tab.active{color:#009E60;border-bottom-color:#009E60;}
.notif-tab:hover:not(.active){color:#475569;}

/* Liste */
.notif-list{overflow-y:auto;flex:1;padding:8px 0;}
.notif-list::-webkit-scrollbar{width:4px;}
.notif-list::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:2px;}

/* Item notification */
.notif-item{
  display:flex;align-items:flex-start;gap:12px;padding:12px 16px;
  cursor:pointer;transition:background .15s;border-bottom:1px solid #f8fafc;
  position:relative;
}
.notif-item:hover{background:#f8fafc;}
.notif-item.unread{background:#f0fdf4;}
.notif-item.unread::before{
  content:'';position:absolute;left:6px;top:50%;transform:translateY(-50%);
  width:5px;height:5px;border-radius:50%;background:#009E60;
}
.notif-item-icon{
  width:38px;height:38px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:18px;flex-shrink:0;background:#f1f5f9;
}
.notif-item-body{flex:1;min-width:0;}
.notif-item-title{font-size:13px;font-weight:700;color:#0A1628;margin-bottom:2px;line-height:1.3;}
.notif-item.unread .notif-item-title{color:#007a47;}
.notif-item-text{font-size:12px;color:#64748b;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.notif-item-time{font-size:10px;color:#94a3b8;margin-top:4px;font-weight:500;}
.notif-item-actions{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;}
.notif-action-btn{
  font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;
  border:1px solid #e2e8f0;background:#fff;color:#475569;cursor:pointer;transition:all .15s;
}
.notif-action-btn.primary{background:#009E60;color:#fff;border-color:#009E60;}
.notif-action-btn:hover{opacity:.85;}
.notif-item-dismiss{
  position:absolute;top:8px;right:8px;width:20px;height:20px;
  display:none;align-items:center;justify-content:center;
  background:#f1f5f9;border:none;border-radius:50%;cursor:pointer;
  font-size:10px;color:#94a3b8;transition:all .15s;
}
.notif-item:hover .notif-item-dismiss{display:flex;}
.notif-item-dismiss:hover{background:#fee2e2;color:#ef4444;}

/* États vide / chargement */
.notif-empty{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:40px 20px;color:#94a3b8;text-align:center;gap:12px;
}
.notif-empty-icon{font-size:40px;opacity:.5;}
.notif-empty-text{font-size:13px;font-weight:600;}
.notif-empty-sub{font-size:12px;color:#cbd5e1;}

/* Footer panel */
.notif-panel-footer{
  border-top:1px solid #f1f5f9;padding:10px 16px;flex-shrink:0;
  display:flex;align-items:center;gap:8px;
}
.notif-footer-link{
  font-size:12px;font-weight:600;color:#009E60;background:none;
  border:none;cursor:pointer;flex:1;text-align:center;
}
.notif-footer-link:hover{text-decoration:underline;}

/* ── PANNEAU PRÉFÉRENCES ── */
#gsc-notif-prefs{
  position:fixed;top:72px;right:12px;width:min(360px, calc(100vw - 24px));
  max-height:calc(100vh - 90px);background:#fff;border-radius:16px;
  box-shadow:0 20px 60px rgba(0,0,0,.18);z-index:10000;
  display:none;flex-direction:column;overflow:hidden;
  border:1px solid rgba(0,0,0,.06);
  animation:panelSlideIn .25s cubic-bezier(.16,1,.3,1);
}
#gsc-notif-prefs.open{display:flex;}
.prefs-head{
  display:flex;align-items:center;padding:16px;border-bottom:1px solid #f1f5f9;
  font-size:15px;font-weight:800;color:#0A1628;gap:10px;font-family:'Syne',sans-serif;
}
.prefs-head button{
  margin-left:auto;background:none;border:none;cursor:pointer;
  font-size:18px;color:#94a3b8;width:28px;height:28px;
  display:flex;align-items:center;justify-content:center;border-radius:6px;
}
.prefs-head button:hover{background:#f1f5f9;}
.prefs-body{overflow-y:auto;flex:1;padding:12px 16px;}
.prefs-section{margin-bottom:16px;}
.prefs-section-title{
  font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;
  color:#94a3b8;margin-bottom:8px;
}
.prefs-row{
  display:flex;align-items:center;padding:8px 0;
  border-bottom:1px solid #f8fafc;gap:10px;
}
.prefs-row-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;}
.prefs-row-label{flex:1;font-size:13px;font-weight:600;color:#334155;}
.prefs-row-sub{font-size:11px;color:#94a3b8;display:block;}
/* Toggle switch */
.toggle-switch{position:relative;width:42px;height:24px;flex-shrink:0;}
.toggle-switch input{opacity:0;width:0;height:0;}
.toggle-slider{
  position:absolute;cursor:pointer;inset:0;background:#e2e8f0;
  border-radius:24px;transition:background .2s;
}
.toggle-slider::before{
  content:'';position:absolute;left:3px;bottom:3px;
  width:18px;height:18px;background:#fff;border-radius:50%;
  transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);
}
.toggle-switch input:checked + .toggle-slider{background:#009E60;}
.toggle-switch input:checked + .toggle-slider::before{transform:translateX(18px);}
.prefs-footer{padding:12px 16px;border-top:1px solid #f1f5f9;display:flex;gap:8px;}
.prefs-save-btn{
  flex:1;padding:10px;background:#009E60;color:#fff;border:none;
  border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;
  transition:background .15s;
}
.prefs-save-btn:hover{background:#007a47;}

/* ── OVERLAY ── */
#gsc-notif-overlay{
  position:fixed;inset:0;z-index:9998;display:none;
}
#gsc-notif-overlay.open{display:block;}

/* ── TOAST NOTIFICATION ── */
.gsc-notif-toast{
  position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);
  background:#0A1628;color:#fff;border-radius:12px;padding:12px 16px;
  display:flex;align-items:center;gap:10px;max-width:min(340px, calc(100vw - 32px));
  box-shadow:0 8px 30px rgba(0,0,0,.2);z-index:99999;opacity:0;
  transition:all .3s cubic-bezier(.16,1,.3,1);pointer-events:none;
  border-left:4px solid #009E60;
}
.gsc-notif-toast.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto;}
.gsc-notif-toast-icon{font-size:20px;flex-shrink:0;}
.gsc-notif-toast-body{flex:1;min-width:0;}
.gsc-notif-toast-title{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gsc-notif-toast-text{font-size:11px;color:rgba(255,255,255,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gsc-notif-toast-close{background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:16px;padding:0;flex-shrink:0;}
.gsc-notif-toast-close:hover{color:#fff;}

/* ── BADGE SUR ZONES ── */
[data-notif-zone]{position:relative;}
.zone-badge{
  position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;
  padding:0 4px;background:#ef4444;color:#fff;font-size:9px;font-weight:800;
  border-radius:8px;display:none;align-items:center;justify-content:center;
  border:2px solid #fff;pointer-events:none;z-index:10;line-height:1;
}
.zone-badge.visible{display:flex;}

/* Responsive mobile */
@media(max-width:640px){
  #gsc-notif-panel,#gsc-notif-prefs{
    top:auto;bottom:70px;right:8px;left:8px;width:auto;
    max-height:calc(100vh - 160px);border-radius:20px 20px 16px 16px;
  }
}
@media(max-width:480px){
  .notif-bell-btn{width:34px;height:34px;}
  .notif-bell-btn svg{width:19px;height:19px;}
}
@media(max-width:360px){
  .notif-bell-btn{width:30px;height:30px;}
  .notif-bell-btn svg{width:17px;height:17px;}
}
`;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════════════
     INJECTION HTML : CLOCHE + PANEL + PRÉFS
  ══════════════════════════════════════════════════════════════════ */
  function injectBell(){
    if(document.getElementById('gsc-notif-bell')) return;

    /* Cloche dans le header — insérée avant l'oeil visiteur */
    const visitorBanner = document.getElementById('nav-visitor-banner');
    if(!visitorBanner) return;

    const bellWrap = document.createElement('div');
    bellWrap.className = 'notif-bell-wrap btn-icon';
    bellWrap.id = 'gsc-notif-bell';
    bellWrap.title = 'Notifications';
    bellWrap.setAttribute('aria-label', 'Notifications');
    bellWrap.innerHTML = `
      <button class="notif-bell-btn" id="gsc-notif-bell-btn" onclick="GSCNotif.togglePanel(event)">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </button>
      <span class="notif-bell-badge" id="gsc-notif-badge">0</span>
    `;
    visitorBanner.parentNode.insertBefore(bellWrap, visitorBanner);

    /* Panel principal */
    const panel = document.createElement('div');
    panel.id = 'gsc-notif-panel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','Notifications');
    panel.innerHTML = `
      <div class="notif-panel-head">
        <span class="notif-panel-title">🔔 Notifications</span>
        <span class="notif-panel-count" id="gsc-np-count">0</span>
        <div class="notif-panel-actions">
          <button class="notif-panel-btn" onclick="GSCNotif.markAllRead()" title="Tout marquer comme lu">✓ Tout lire</button>
          <button class="notif-panel-btn" onclick="GSCNotif.openPrefs()" title="Préférences">⚙️</button>
        </div>
      </div>
      <div class="notif-tabs">
        <button class="notif-tab active" data-tab="all" onclick="GSCNotif.switchTab('all',this)">Toutes</button>
        <button class="notif-tab" data-tab="unread" onclick="GSCNotif.switchTab('unread',this)">Non lues</button>
        <button class="notif-tab" data-tab="personal" onclick="GSCNotif.switchTab('personal',this)">Perso.</button>
        <button class="notif-tab" data-tab="general" onclick="GSCNotif.switchTab('general',this)">Général</button>
      </div>
      <div class="notif-list" id="gsc-notif-list"></div>
      <div class="notif-panel-footer">
        <button class="notif-footer-link" onclick="GSCNotif.clearAll()">🗑️ Vider tout</button>
        <button class="notif-footer-link" onclick="GSCNotif.openPrefs()">⚙️ Préférences</button>
      </div>
    `;
    document.body.appendChild(panel);

    /* Panel préférences */
    const prefs = document.createElement('div');
    prefs.id = 'gsc-notif-prefs';
    prefs.innerHTML = `
      <div class="prefs-head">
        🔔 Préférences de notifications
        <button onclick="GSCNotif.closePrefs()">✕</button>
      </div>
      <div class="prefs-body" id="gsc-prefs-body"></div>
      <div class="prefs-footer">
        <button class="prefs-save-btn" onclick="GSCNotif.savePrefs()">💾 Enregistrer</button>
      </div>
    `;
    document.body.appendChild(prefs);

    /* Overlay */
    const overlay = document.createElement('div');
    overlay.id = 'gsc-notif-overlay';
    overlay.onclick = () => GSCNotif.closeAll();
    document.body.appendChild(overlay);

    /* Toast container */
    if(!document.getElementById('gsc-notif-toast-el')){
      const toast = document.createElement('div');
      toast.id = 'gsc-notif-toast-el';
      toast.className = 'gsc-notif-toast';
      toast.innerHTML = `
        <span class="gsc-notif-toast-icon" id="gsc-nt-icon">🔔</span>
        <div class="gsc-notif-toast-body">
          <div class="gsc-notif-toast-title" id="gsc-nt-title"></div>
          <div class="gsc-notif-toast-text" id="gsc-nt-text"></div>
        </div>
        <button class="gsc-notif-toast-close" onclick="GSCNotif.hideToast()">✕</button>
      `;
      document.body.appendChild(toast);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     PANEL TOGGLE
  ══════════════════════════════════════════════════════════════════ */
  function togglePanel(e){
    if(e) e.stopPropagation();
    const panel = document.getElementById('gsc-notif-panel');
    const overlay = document.getElementById('gsc-notif-overlay');
    if(!panel) return;
    _panelOpen = !_panelOpen;
    if(_panelOpen){
      panel.classList.add('open');
      overlay.classList.add('open');
      renderList('all');
    } else {
      panel.classList.remove('open');
      overlay.classList.remove('open');
    }
  }

  function closeAll(){
    _panelOpen = false;
    const p = document.getElementById('gsc-notif-panel');
    const pr = document.getElementById('gsc-notif-prefs');
    const o = document.getElementById('gsc-notif-overlay');
    if(p) p.classList.remove('open');
    if(pr) pr.classList.remove('open');
    if(o) o.classList.remove('open');
  }

  /* ═══════════════════════════════════════════════════════════════
     ONGLETS
  ══════════════════════════════════════════════════════════════════ */
  let _currentTab = 'all';
  function switchTab(tab, btn){
    _currentTab = tab;
    document.querySelectorAll('.notif-tab').forEach(t=>t.classList.remove('active'));
    if(btn) btn.classList.add('active');
    renderList(tab);
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDU LISTE
  ══════════════════════════════════════════════════════════════════ */
  function renderList(tab){
    const list = document.getElementById('gsc-notif-list');
    if(!list) return;

    let items = [..._notifications];

    if(tab === 'unread') items = items.filter(n=>!n.read);
    else if(tab === 'personal') items = items.filter(n=>n.personal);
    else if(tab === 'general') items = items.filter(n=>!n.personal);

    items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));

    if(!items.length){
      list.innerHTML = `
        <div class="notif-empty">
          <div class="notif-empty-icon">🔕</div>
          <div class="notif-empty-text">${tab==='unread'?'Aucune notification non lue':'Aucune notification'}</div>
          <div class="notif-empty-sub">${tab==='all'?'Les nouvelles notifications apparaîtront ici':''}</div>
        </div>`;
      return;
    }

    list.innerHTML = items.map(n => renderItem(n)).join('');
  }

  function renderItem(n){
    const type = NOTIF_TYPES[n.type] || NOTIF_TYPES.system;
    const ts = n.createdAt ? timeAgo(n.createdAt) : '';
    const unreadCls = n.read ? '' : 'unread';
    const actionsHtml = (n.actions||[]).map(a=>
      `<button class="notif-action-btn${a.primary?' primary':''}" onclick="GSCNotif.handleAction('${n.id}','${a.key}')">${a.label}</button>`
    ).join('');
    return `
      <div class="notif-item ${unreadCls}" id="ni-${n.id}" onclick="GSCNotif.readItem('${n.id}')">
        <div class="notif-item-icon" style="background:${type.color}22">${type.icon}</div>
        <div class="notif-item-body">
          <div class="notif-item-title">${escHtml(n.title||type.label)}</div>
          <div class="notif-item-text">${escHtml(n.body||'')}</div>
          ${actionsHtml ? `<div class="notif-item-actions">${actionsHtml}</div>` : ''}
          <div class="notif-item-time">${ts}</div>
        </div>
        <button class="notif-item-dismiss" onclick="GSCNotif.dismiss('${n.id}',event)" title="Supprimer">✕</button>
      </div>`;
  }

  /* ═══════════════════════════════════════════════════════════════
     LECTURE / SUPPRESSION
  ══════════════════════════════════════════════════════════════════ */
  function readItem(id){
    const n = _notifications.find(x=>x.id===id);
    if(!n) return;
    if(!n.read){
      n.read = true;
      persistRead(id);
      updateBadge();
      const el = document.getElementById('ni-'+id);
      if(el) el.classList.remove('unread');
      // Marque aussi les badges zones concernées
      updateZoneBadges();
    }
    closeAll();
    if(n.link){
      /* FIX : cette navigation dupliquait (en plus simple, sans ouvrir les
         commentaires ni gérer un commentId précis) la logique déjà écrite pour
         le clic sur notification push. On délègue maintenant à handleNotifLink
         (défini dans index.html), identique que le clic vienne de la cloche
         in-app ou d'une notification système reçue via le service worker. */
      if(typeof window.handleNotifLink === 'function'){
        window.handleNotifLink(n.link);
      } else if(typeof window.showView === 'function'){
        const parts = n.link.split(':');
        const view = parts[0] === 'fil' ? 'actualites' : parts[0];
        window.showView(view);
      } else {
        window.dispatchEvent(new CustomEvent('gsc-navigate', { detail: { link: n.link } }));
      }
    }
  }

  function markAllRead(){
    _notifications.forEach(n=>{ n.read=true; persistRead(n.id); });
    updateBadge();
    renderList(_currentTab);
    updateZoneBadges();
  }

  function dismiss(id, e){
    if(e){ e.stopPropagation(); }
    _notifications = _notifications.filter(x=>x.id!==id);
    persistDismiss(id);
    updateBadge();
    renderList(_currentTab);
    updateZoneBadges();
  }

  function clearAll(){
    if(!confirm('Vider toutes les notifications ?')) return;
    const ids = _notifications.map(n=>n.id);
    _notifications = [];
    ids.forEach(persistDismiss);
    updateBadge();
    renderList(_currentTab);
    updateZoneBadges();
  }

  function handleAction(notifId, actionKey){
    const n = _notifications.find(x=>x.id===notifId);
    if(!n) return;
    readItem(notifId);
    if(n.actionCallbacks && n.actionCallbacks[actionKey]){
      n.actionCallbacks[actionKey]();
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     BADGE CLOCHE + PWA BADGE API
  ══════════════════════════════════════════════════════════════════ */
  function updateBadge(){
    _unreadCount = _notifications.filter(n=>!n.read).length;
    const badge = document.getElementById('gsc-notif-badge');
    const panelCount = document.getElementById('gsc-np-count');

    if(badge){
      if(_unreadCount > 0){
        badge.textContent = _unreadCount > 99 ? '99+' : _unreadCount;
        badge.classList.add('visible');
        // Animation cloche si nouvelles notifs
        const btn = document.getElementById('gsc-notif-bell-btn');
        if(btn){ btn.classList.add('ringing'); setTimeout(()=>btn.classList.remove('ringing'),700); }
      } else {
        badge.classList.remove('visible');
      }
    }

    if(panelCount){
      if(_unreadCount > 0){
        panelCount.textContent = _unreadCount;
        panelCount.classList.add('visible');
      } else {
        panelCount.classList.remove('visible');
      }
    }

    /* PWA Badge API — badge sur l'icône de l'appli */
    if('setAppBadge' in navigator){
      if(_unreadCount > 0) navigator.setAppBadge(_unreadCount).catch(()=>{});
      else navigator.clearAppBadge().catch(()=>{});
    }
    /* Fallback via SW (postMessage) */
    if('serviceWorker' in navigator && navigator.serviceWorker.controller){
      navigator.serviceWorker.controller.postMessage({
        type:'SET_BADGE', count: _unreadCount
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     BADGES SUR ZONES (bnav, boutons, sections)
  ══════════════════════════════════════════════════════════════════ */
  function updateZoneBadges(){
    /* Par type → zone mapping */
    const zoneMap = {
      message:  ['bnav-profil','side-menu-profil'],
      mention:  ['bnav-profil'],
      follow:   ['bnav-profil'],
      match:    ['bnav-sport'],
      event:    ['bnav-stades'],
      news:     ['bnav-actualites'],
      alert:    ['bnav-admin','side-menu-admin'],
      transfer: ['bnav-profil','bnav-sport'],
    };

    /* Compter par zone */
    const zoneCounts = {};
    _notifications.filter(n=>!n.read).forEach(n=>{
      const zones = zoneMap[n.type] || [];
      zones.forEach(z=>{ zoneCounts[z]=(zoneCounts[z]||0)+1; });
    });

    /* Mettre à jour chaque bouton de nav */
    Object.keys({...zoneMap,...{}}).forEach(()=>{});
    const allZones = new Set(Object.values(zoneMap).flat());
    allZones.forEach(zoneId=>{
      const el = document.getElementById(zoneId);
      if(!el) return;
      el.style.position = 'relative';
      let b = el.querySelector('.zone-badge');
      if(!b){
        b = document.createElement('span');
        b.className = 'zone-badge';
        el.appendChild(b);
      }
      const cnt = zoneCounts[zoneId]||0;
      if(cnt > 0){
        b.textContent = cnt > 9 ? '9+' : cnt;
        b.classList.add('visible');
      } else {
        b.classList.remove('visible');
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     TOAST IN-APP
  ══════════════════════════════════════════════════════════════════ */
  let _toastTimer = null;
  function showToast(notif){
    const el = document.getElementById('gsc-notif-toast-el');
    if(!el) return;
    const type = NOTIF_TYPES[notif.type] || NOTIF_TYPES.system;
    document.getElementById('gsc-nt-icon').textContent = type.icon;
    document.getElementById('gsc-nt-title').textContent = notif.title||type.label;
    document.getElementById('gsc-nt-text').textContent = notif.body||'';
    el.style.borderLeftColor = type.color;
    el.classList.add('show');
    if(_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(()=>hideToast(), 5000);
    /* Vibration */
    if(_prefs?.vibrationEnabled && 'vibrate' in navigator) navigator.vibrate([100,50,100]);
    /* Son */
    if(_prefs?.soundEnabled) playNotifSound();
  }

  function hideToast(){
    const el = document.getElementById('gsc-notif-toast-el');
    if(el) el.classList.remove('show');
  }

  function playNotifSound(){
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime+0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime+0.3);
    }catch(e){}
  }

  /* ═══════════════════════════════════════════════════════════════
     PRÉFÉRENCES
  ══════════════════════════════════════════════════════════════════ */
  function openPrefs(){
    closeAll();
    _panelOpen = false;
    const prefs = document.getElementById('gsc-notif-prefs');
    const overlay = document.getElementById('gsc-notif-overlay');
    renderPrefsBody();
    prefs.classList.add('open');
    overlay.classList.add('open');
  }

  function closePrefs(){
    const prefs = document.getElementById('gsc-notif-prefs');
    const overlay = document.getElementById('gsc-notif-overlay');
    prefs?.classList.remove('open');
    overlay?.classList.remove('open');
  }

  function renderPrefsBody(){
    const p = _prefs || {...DEFAULT_PREFS};
    const body = document.getElementById('gsc-prefs-body');
    if(!body) return;

    const typeRows = Object.entries(NOTIF_TYPES).map(([key,val])=>`
      <div class="prefs-row">
        <div class="prefs-row-icon" style="background:${val.color}22">${val.icon}</div>
        <div style="flex:1">
          <div class="prefs-row-label">${val.label}</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="pref-${key}" ${p[key]?'checked':''}>
          <span class="toggle-slider"></span>
        </label>
      </div>`).join('');

    body.innerHTML = `
      <div class="prefs-section">
        <div class="prefs-section-title">Types de notifications</div>
        ${typeRows}
      </div>
      <div class="prefs-section">
        <div class="prefs-section-title">Paramètres</div>
        <div class="prefs-row">
          <div class="prefs-row-icon" style="background:#10b98122">🔊</div>
          <div style="flex:1"><div class="prefs-row-label">Son</div></div>
          <label class="toggle-switch">
            <input type="checkbox" id="pref-soundEnabled" ${p.soundEnabled?'checked':''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="prefs-row">
          <div class="prefs-row-icon" style="background:#8b5cf622">📳</div>
          <div style="flex:1"><div class="prefs-row-label">Vibration</div></div>
          <label class="toggle-switch">
            <input type="checkbox" id="pref-vibrationEnabled" ${p.vibrationEnabled?'checked':''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="prefs-row">
          <div class="prefs-row-icon" style="background:#f9731622">📲</div>
          <div style="flex:1">
            <div class="prefs-row-label">Notifications push</div>
            <span class="prefs-row-sub">Notifications en arrière-plan</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="pref-pushEnabled" ${p.pushEnabled||Notification?.permission==='granted'?'checked':''} onchange="GSCNotif.togglePush(this)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>`;
  }

  async function togglePush(input){
    if(input.checked){
      try{
        if(!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)){
          input.checked = false;
          if(typeof toast === 'function') toast('Push non supporté sur ce navigateur.','error');
          return;
        }
        const perm = await Notification.requestPermission();
        if(perm !== 'granted'){
          input.checked = false;
          if(typeof toast === 'function') toast('Notifications push refusées.','error');
          return;
        }
        /* Récupérer la clé publique VAPID depuis le Worker */
        const keyResp = await fetch(WORKER_URL+'/vapid-public-key');
        const { publicKey } = await keyResp.json();
        /* Enregistrer l'abonnement Push */
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        /* Envoyer l'abonnement au Worker */
        const userId = _currentUserId || 'anonymous';
        await fetch(WORKER_URL+'/subscribe', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ subscription: sub, userId })
        });
        if(typeof toast === 'function') toast('\u2705 Notifications push activées !','success');
      }catch(err){
        console.error('Push subscribe error:', err);
        input.checked = false;
        if(typeof toast === 'function') toast('Erreur activation push : '+err.message,'error');
      }
    } else {
      try{
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if(sub){
          const userId = _currentUserId || 'anonymous';
          await fetch(WORKER_URL+'/unsubscribe', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ endpoint: sub.endpoint, userId })
          });
          await sub.unsubscribe();
        }
        if(typeof toast === 'function') toast('Notifications push désactivées.','info');
      }catch(err){ console.error('Push unsubscribe error:', err); }
    }
  }

  /* Convertit une clé VAPID base64url en Uint8Array */
  function urlBase64ToUint8Array(base64String){
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  function savePrefs(){
    const p = {};
    Object.keys(NOTIF_TYPES).forEach(k=>{
      const el = document.getElementById('pref-'+k);
      if(el) p[k] = el.checked;
    });
    ['soundEnabled','vibrationEnabled','pushEnabled'].forEach(k=>{
      const el = document.getElementById('pref-'+k);
      if(el) p[k] = el.checked;
    });
    _prefs = {...DEFAULT_PREFS, ...p};
    localStorage.setItem('gsc_notif_prefs', JSON.stringify(_prefs));
    /* Persiste sur Firestore si connecté */
    if(_currentUserId && window.db){
      try{
        const {doc, setDoc} = window;
        if(typeof setDoc === 'function'){
          withAuth(()=>setDoc(doc(window.db, PREFS_COLLECTION, _currentUserId), _prefs, {merge:true})).catch(()=>{});
        }
      }catch(e){}
    }
    closePrefs();
    if(typeof toast === 'function') toast('✅ Préférences enregistrées','success');
  }

  async function loadPrefs(uid){
    /* Local d'abord */
    try{
      const local = localStorage.getItem('gsc_notif_prefs');
      if(local) _prefs = {...DEFAULT_PREFS, ...JSON.parse(local)};
      else _prefs = {...DEFAULT_PREFS};
    }catch(e){ _prefs = {...DEFAULT_PREFS}; }
    /* Firestore si disponible */
    if(uid && window.db){
      try{
        const {doc, getDoc} = window;
        if(typeof getDoc === 'function'){
          const snap = await withAuth(()=>getDoc(doc(window.db, PREFS_COLLECTION, uid)));
          if(snap.exists()) _prefs = {...DEFAULT_PREFS, ...snap.data()};
        }
      }catch(e){}
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     FIRESTORE REALTIME LISTENER
  ══════════════════════════════════════════════════════════════════ */
  async function subscribeFirestore(uid){
    if(!window.db || !uid) return;
    if(_firestoreUnsub) { _firestoreUnsub(); _firestoreUnsub=null; }
    /* FIX : le listener temps réel a besoin d'un request.auth.uid valide dès
       l'ouverture, sinon Firestore refuse la requête entière avec
       "Missing or insufficient permissions". */
    try{ await withAuth(()=>Promise.resolve()); }catch(e){}
    try{
      const {collection, query, where, orderBy, limit, onSnapshot} = window;
      if(typeof onSnapshot !== 'function') return;
      /* Récupérer le rôle de l'utilisateur pour filtrer role:xxx */
      const userRole = (window.userProfile && window.userProfile.role) ? ('role:'+window.userProfile.role) : null;
      const recipientFilters = [uid,'all'];
      if(userRole) recipientFilters.push(userRole);
      const q = query(
        collection(window.db, NOTIF_COLLECTION),
        where('recipientId','in', recipientFilters),
        orderBy('createdAt','desc'),
        limit(50)
      );
      _firestoreUnsub = onSnapshot(q, (snap)=>{
        const prev = _notifications.length;
        /* Exclure les notifications que j'ai moi-même émises (ex: diffusion 'all' sur ma propre publication) */
        _notifications = snap.docs.map(d=>({id:d.id,...d.data()})).filter(n=>n.senderId !== _currentUserId);
        _notifications.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
        /* Convertir timestamps */
        _notifications.forEach(n=>{
          if(n.createdAt?.seconds) n.createdAt = n.createdAt.seconds*1000;
        });
        /* Nouvelles notifications — toast seulement si je suis le destinataire (pas l'expéditeur) */
        if(_notifications.length > prev){
          const newest = _notifications.find(n=>!n.read && n.senderId !== _currentUserId);
          if(newest && (_prefs?.[newest.type] !== false)) showToast(newest);
        }
        updateBadge();
        updateZoneBadges();
        if(_panelOpen) renderList(_currentTab);
      }, (err)=>{
        // FIX : cette erreur était silencieusement avalée. Elle se déclenche
        // systématiquement pour tout utilisateur ayant un rôle, tant que la
        // règle Firestore 'notifications' n'autorise pas recipientId de la
        // forme 'role:xxx' (voir requête ci-dessus : where('recipientId','in',
        // [uid,'all','role:xxx'])) — Firestore rejette alors la requête
        // ENTIÈRE, pas seulement les docs role:xxx. Voir firestore.rules.
        console.error('[GSCNotif] onSnapshot notifications refusé — vérifier la règle Firestore (recipientId role:xxx) :', err);
      });
    }catch(e){}
  }

  function unsubscribeFirestore(){
    if(_firestoreUnsub){ _firestoreUnsub(); _firestoreUnsub=null; }
  }

  /* ═══════════════════════════════════════════════════════════════
     PERSISTANCE (read/dismiss sur Firestore)
  ══════════════════════════════════════════════════════════════════ */
  function persistRead(id){
    if(!window.db || !_currentUserId) return;
    try{
      const {doc, updateDoc} = window;
      if(typeof updateDoc === 'function'){
        withAuth(()=>updateDoc(doc(window.db, NOTIF_COLLECTION, id),{read:true, readAt: new Date()})).catch(()=>{});
      }
    }catch(e){}
    /* localStorage fallback */
    try{
      const reads = JSON.parse(localStorage.getItem('gsc_notif_reads')||'[]');
      if(!reads.includes(id)){ reads.push(id); localStorage.setItem('gsc_notif_reads', JSON.stringify(reads)); }
    }catch(e){}
  }

  function persistDismiss(id){
    if(!window.db || !_currentUserId) return;
    try{
      const {doc, deleteDoc} = window;
      if(typeof deleteDoc === 'function'){
        withAuth(()=>deleteDoc(doc(window.db, NOTIF_COLLECTION, id))).catch(()=>{});
      }
    }catch(e){}
  }

  /* ═══════════════════════════════════════════════════════════════
     API PUBLIQUE — Créer une notification depuis n'importe où
  ══════════════════════════════════════════════════════════════════ */
  async function push(opts){
    /* opts: {type, title, body, recipientId, personal, link, actions, actionCallbacks} */
    const id = 'n_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    const recipientId = opts.recipientId || 'all';
    const n = {
      id,
      type: opts.type || 'system',
      title: opts.title || '',
      body: opts.body || '',
      personal: !!opts.personal,
      link: opts.link || null,
      actions: opts.actions || [],
      actionCallbacks: opts.actionCallbacks || {},
      read: false,
      createdAt: Date.now(),
      recipientId,
      senderId: _currentUserId || null,
    };

    /* Filtre selon préférences locales — seulement si destinataire = moi ET pas moi l'expéditeur */
    const isSelfSent = !!n.senderId && n.senderId === _currentUserId;
    const isMine = (recipientId === _currentUserId || recipientId === 'all') && !isSelfSent;
    if(isMine && _prefs?.[n.type] === false) return;

    /* Afficher localement SEULEMENT si je suis le destinataire ou c'est général */
    if(isMine){
      _notifications.unshift(n);
      updateBadge();
      updateZoneBadges();
      showToast(n);
      if(_panelOpen) renderList(_currentTab);
    }

    /* Persiste sur Firestore — pour que le destinataire le reçoive via onSnapshot */
    if(window.db){
      try{
        const {collection, addDoc, serverTimestamp} = window;
        if(typeof addDoc === 'function'){
          await withAuth(()=>addDoc(collection(window.db, NOTIF_COLLECTION),{
            ...n,
            createdAt: serverTimestamp(),
            id: undefined,
            actionCallbacks: undefined
          }));
        }
      }catch(e){ console.error('Notif Firestore error:', e); }
    }

    /* Envoyer push via Worker Cloudflare au(x) destinataire(s) */
    try{
      await fetch(WORKER_URL+'/send-notification', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          recipientId,
          senderId: _currentUserId,
          title: 'Gabon Sport Connect',
          body: n.title + (n.body ? ' — ' + n.body : ''),
          icon: 'icon-192.png',
          badge: 'icon-192.png',
          data: { link: n.link, type: n.type },
          adminSecret: window._GSC_ADMIN_SECRET || ''
        })
      });
    }catch(e){ console.warn('Worker push error:', e); }

    return id;
  }

  /* ═══════════════════════════════════════════════════════════════
     INIT / CONNEXION / DÉCONNEXION
  ══════════════════════════════════════════════════════════════════ */
  async function init(uid){
    _currentUserId = uid || null;
    injectStyles();
    injectBell();
    await loadPrefs(uid);
    if(uid) subscribeFirestore(uid);
    else loadLocalNotifs();
    updateBadge();
    updateZoneBadges();
  }

  function onLogin(uid){
    _currentUserId = uid;
    loadPrefs(uid).then(()=>{ subscribeFirestore(uid); });
  }

  function onLogout(){
    unsubscribeFirestore();
    _currentUserId = null;
    _notifications = _notifications.filter(n=>n.recipientId==='all');
    updateBadge();
    updateZoneBadges();
    if(_panelOpen) renderList(_currentTab);
  }

  /* Notifications locales de démo/système */
  function loadLocalNotifs(){
    const reads = JSON.parse(localStorage.getItem('gsc_notif_reads')||'[]');
    _notifications = _notifications.filter(n=>n.recipientId==='all').map(n=>({
      ...n, read: reads.includes(n.id)||n.read
    }));
  }

  /* ═══════════════════════════════════════════════════════════════
     UTILITAIRES
  ══════════════════════════════════════════════════════════════════ */
  function timeAgo(ts){
    const diff = Date.now() - ts;
    const s = Math.floor(diff/1000);
    if(s < 60) return 'À l\'instant';
    const m = Math.floor(s/60);
    if(m < 60) return `Il y a ${m} min`;
    const h = Math.floor(m/60);
    if(h < 24) return `Il y a ${h}h`;
    const d = Math.floor(h/24);
    if(d < 7) return `Il y a ${d}j`;
    return new Date(ts).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
  }

  function escHtml(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ═══════════════════════════════════════════════════════════════
     EXPORT PUBLIC
  ══════════════════════════════════════════════════════════════════ */
  window.GSCNotif = {
    init, onLogin, onLogout, push,
    togglePanel, closeAll, closePrefs, openPrefs,
    switchTab, markAllRead, dismiss, clearAll,
    readItem, handleAction, savePrefs, togglePush,
    hideToast, updateBadge, updateZoneBadges,
    get unreadCount(){ return _unreadCount; },
  };

})(window);
