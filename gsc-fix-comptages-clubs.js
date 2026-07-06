/**
 * GSC FIX COMPTAGES CLUBS — Synchronise index.html ↔ admin.html
 */
(function() {
  'use strict';

  const originalUpdateStats = window.updateStats;
  
  window.updateStats = function(users) {
    if (originalUpdateStats) originalUpdateStats(users);
    
    const clubUsers = users.filter(u => ['club', 'association'].includes(u.role));
    
    if (window.structuresManager && typeof window.structuresManager.list === 'function') {
      const allStructures = window.structuresManager.list();
      const linkedStructIds = new Set(clubUsers.map(u => u.structureId).filter(Boolean));
      
      const linkedStructures = allStructures.filter(s => 
        s.status !== 'deleted' && 
        ['Club', 'Association'].includes(s.type) && 
        linkedStructIds.has(s.id)
      );
      
      const orphanedStructures = allStructures.filter(s =>
        s.status !== 'deleted' && 
        ['Club', 'Association'].includes(s.type) && 
        !linkedStructIds.has(s.id)
      );

      const clubStatEl = document.getElementById('stat-clubs-active');
      if (clubStatEl) clubStatEl.textContent = clubUsers.length;

      const clubFichesEl = document.getElementById('stat-clubs-fiches');
      if (clubFichesEl) clubFichesEl.textContent = linkedStructures.length;

      const orphanedEl = document.getElementById('stat-clubs-orphaned');
      if (orphanedEl) orphanedEl.textContent = orphanedStructures.length;

      console.log(`[GSC FIX] Clubs: ${clubUsers.length} comptes, ${linkedStructures.length} liées, ${orphanedStructures.length} orphelines`);
    }
  };

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

  window.fixClubSync = {
    updateDisplay(users) {
      if (window.structuresManager && typeof window.structuresManager.list === 'function') {
        const clubUsers = users.filter(u => ['club', 'association'].includes(u.role));
        const allStructures = window.structuresManager.list();
        const linkedIds = new Set(clubUsers.map(u => u.structureId).filter(Boolean));
        
        const linked = allStructures.filter(s => 
          s.status !== 'deleted' && ['Club', 'Association'].includes(s.type) && linkedIds.has(s.id)
        ).length;
        const orphaned = allStructures.filter(s =>
          s.status !== 'deleted' && ['Club', 'Association'].includes(s.type) && !linkedIds.has(s.id)
        ).length;

        document.getElementById('sync-active').textContent = clubUsers.length;
        document.getElementById('sync-linked').textContent = linked;
        document.getElementById('sync-orphaned').textContent = orphaned;
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectClubsInfoPanel);
  } else {
    injectClubsInfoPanel();
  }

  console.log('[GSC FIX] Synchronisation clubs chargée');
})();
