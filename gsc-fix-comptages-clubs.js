/**
 * GSC FIX COMPTAGES CLUBS — Synchronise index.html ↔ admin.html
 */
(function() {
  'use strict';

  function injectClubsInfoPanel() {
    const dashboard = document.querySelector('.main-content') || document.body;
    if (!dashboard) return;

    const panel = document.createElement('div');
    panel.id = 'clubs-sync-info';
    panel.style.cssText = `
      background: linear-gradient(135deg, #fff3cd 0%, #fffaec 100%);
      border-left: 4px solid #ff9800;
      padding: 16px;
      margin: 16px 0;
      border-radius: 8px;
      font-size: 14px;
      color: #333;
    `;
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <strong>⚠️ Synchronisation clubs</strong>
          <br><small>Comptes: <span id="sync-active">—</span> | Liées: <span id="sync-linked">—</span> | À activer: <span id="sync-orphaned">—</span></small>
        </div>
      </div>
    `;

    const existingPanel = document.getElementById('clubs-sync-info');
    if (existingPanel) existingPanel.replaceWith(panel);
    else dashboard.insertBefore(panel, dashboard.firstChild);
  }

  function updateDisplay(users) {
    if (!window.structuresManager) return;
    
    const clubUsers = users.filter(u => ['club', 'association'].includes(u.role));
    const allStructures = window.structuresManager.list();
    
    if (!allStructures || allStructures.length === 0) return;
    
    const linkedIds = new Set(clubUsers.map(u => u.structureId).filter(Boolean));
    
    const linked = allStructures.filter(s => 
      s.status !== 'deleted' && ['Club', 'Association'].includes(s.type) && linkedIds.has(s.id)
    ).length;
    
    const orphaned = allStructures.filter(s =>
      s.status !== 'deleted' && ['Club', 'Association'].includes(s.type) && !linkedIds.has(s.id)
    ).length;

    const activeEl = document.getElementById('sync-active');
    const linkedEl = document.getElementById('sync-linked');
    const orphanedEl = document.getElementById('sync-orphaned');

    if (activeEl) activeEl.textContent = clubUsers.length;
    if (linkedEl) linkedEl.textContent = linked;
    if (orphanedEl) orphanedEl.textContent = orphaned;

    console.log(`[GSC FIX] Clubs: ${clubUsers.length} comptes, ${linked} liées, ${orphaned} orphelines`);
  }

  function waitForStructures() {
    if (!window.structuresManager) {
      setTimeout(waitForStructures, 100);
      return;
    }

    // S'abonner aux mises à jour
    if (typeof window.structuresManager.onUpdate === 'function') {
      window.structuresManager.onUpdate(() => {
        const users = (window.realtimeSync && window.realtimeSync.getCache && window.realtimeSync.getCache('users')) || [];
        updateDisplay(users);
      });
    }

    // Aussi s'abonner aux utilisateurs
    if (window.realtimeSync && typeof window.realtimeSync.onUpdate === 'function') {
      window.realtimeSync.onUpdate('users', (users) => {
        updateDisplay(users);
      });
    }
  }

  function init() {
    injectClubsInfoPanel();
    waitForStructures();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Fallback si les événements n'arrivent pas
  setTimeout(() => {
    const users = (window.realtimeSync && window.realtimeSync.getCache && window.realtimeSync.getCache('users')) || [];
    updateDisplay(users);
  }, 2000);

  console.log('[GSC FIX] Synchronisation clubs chargée');
})();
