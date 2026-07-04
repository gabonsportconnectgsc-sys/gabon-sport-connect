/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC-STRUCTURES-ARCHIVING.JS — Module Archivage
 *  Gabon Sport Connect · Module 5/7 · 2026
 *
 *  Historisation centralisée et individuelle par saison/année/période
 *  des structures, dirigeants, joueurs et athlètes.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const D = () => window.GSCDisciplines;

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmtDate(ts) { try { return ts && ts.toDate ? ts.toDate().toLocaleDateString('fr-FR') : ts || '—'; } catch (e) { return '—'; } }

  /* ══════════════════════════════════════════════════════════════════
   * 1. ARCHIVAGE PAR SAISON
   * ══════════════════════════════════════════════════════════════════ */
  function getArchiveRef(type) {
    if (!window.db) return null;
    // type: 'structures' | 'players' | 'coaches' | 'referees'
    return window.db.collection(`archive_${type}`);
  }

  async function archiveStructureSeason(structureId, saison) {
    try {
      if (!window.db) return { success: false, error: 'DB non disponible' };

      // ⚠️ FIX (juillet 2026) : collection canonique = 'structuresSportives'.
      const structureRef = window.db.collection('structuresSportives').doc(structureId);
      const snap = await structureRef.get();
      const structure = snap.data();

      if (!structure) return { success: false, error: 'Structure non trouvée' };

      const saisonData = (structure.saisons && structure.saisons[saison]) || null;
      if (!saisonData) return { success: false, error: 'Données saison non trouvée' };

      const archiveRef = getArchiveRef('structures');
      if (archiveRef) {
        const archiveId = `${structureId}_${saison}`;
        await archiveRef.doc(archiveId).set({
          structureId,
          saison,
          nom: structure.nom,
          discipline: structure.discipline,
          type: structure.type,
          ville: structure.ville,
          saisonData,
          archivedAt: new Date(),
          archiveVersion: 1
        });

        return { success: true, message: 'Structure archivée pour la saison' };
      }
    } catch (err) {
      console.error('Archive structure erreur:', err);
      return { success: false, error: err.message };
    }
  }

  async function archivePlayerSeason(playerId, saison) {
    try {
      if (!window.db) return { success: false, error: 'DB non disponible' };

      const playerRef = window.db.collection('users').doc(playerId);
      const snap = await playerRef.get();
      const player = snap.data();

      if (!player) return { success: false, error: 'Joueur non trouvé' };

      const archiveRef = getArchiveRef('players');
      if (archiveRef) {
        const archiveId = `${playerId}_${saison}`;
        await archiveRef.doc(archiveId).set({
          playerId,
          saison,
          nom: player.nom,
          prenom: player.prenom,
          role: player.role,
          sport: player.sport || '',
          club: player.club,
          email: player.email,
          telephone: player.telephone,
          stats: {
            matchsJoues: player.matchsJoues,
            buts: player.buts,
            passes: player.passes,
            cartonsJaunes: player.cartonsJaunes,
            cartonsRouges: player.cartonsRouges
          },
          archivedAt: new Date(),
          archiveVersion: 1
        });

        return { success: true, message: 'Joueur archivé pour la saison' };
      }
    } catch (err) {
      console.error('Archive player erreur:', err);
      return { success: false, error: err.message };
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. RÉCUPÉRATION DES ARCHIVES
   * ══════════════════════════════════════════════════════════════════ */
  async function getStructureArchives(structureId) {
    try {
      if (!window.db) return [];
      const archiveRef = getArchiveRef('structures');
      if (!archiveRef) return [];

      const snap = await archiveRef.where('structureId', '==', structureId).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('Get archives erreur:', err);
      return [];
    }
  }

  async function getPlayerArchives(playerId) {
    try {
      if (!window.db) return [];
      const archiveRef = getArchiveRef('players');
      if (!archiveRef) return [];

      const snap = await archiveRef.where('playerId', '==', playerId).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('Get player archives erreur:', err);
      return [];
    }
  }

  /* ── Historique global (toutes structures / tous joueurs confondus) ──
     Utilisé par l'onglet "📚 Archivage" pour afficher la liste complète
     des archivages déjà effectués (au lieu de laisser #archives-timeline
     vide comme c'était le cas jusqu'ici). */
  async function getAllArchives() {
    try {
      if (!window.db) return [];
      const [structSnap, playerSnap] = await Promise.all([
        getArchiveRef('structures') ? getArchiveRef('structures').get() : Promise.resolve({ docs: [] }),
        getArchiveRef('players') ? getArchiveRef('players').get() : Promise.resolve({ docs: [] })
      ]);
      const structures = structSnap.docs.map(d => ({ id: d.id, kind: 'structure', ...d.data() }));
      const players = playerSnap.docs.map(d => ({ id: d.id, kind: 'player', ...d.data() }));
      return structures.concat(players);
    } catch (err) {
      console.error('Get all archives erreur:', err);
      return [];
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. RENDU TIMELINE ARCHIVES
   * ══════════════════════════════════════════════════════════════════ */
  function renderArchiveTimeline(archives, opts) {
    opts = opts || {};
    if (!Array.isArray(archives) || archives.length === 0) {
      return '<p style="text-align:center;color:var(--gray-txt);padding:20px;">Aucune archive.</p>';
    }

    const sorted = archives.slice().sort((a, b) => {
      const aDate = new Date(a.saison + '-01-01');
      const bDate = new Date(b.saison + '-01-01');
      return bDate - aDate;
    });

    const html = `
      <div style="position:relative;padding:20px 0;">
        <div style="position:absolute;left:20px;top:0;bottom:0;width:2px;background:var(--green);"></div>
        ${sorted.map((arc) => {
          const isPlayer = arc.kind === 'player' || (arc.playerId !== undefined && arc.saisonData === undefined);
          const icon = isPlayer ? '👤' : '🏢';
          const title = isPlayer ? `${arc.prenom || ''} ${arc.nom || ''}`.trim() : (arc.nom || 'Archive');
          return `
          <div style="margin-bottom:20px;margin-left:60px;padding:12px 14px;background:#fff;border-radius:10px;border-left:3px solid var(--green);box-shadow:var(--shadow-sm);">
            <div style="font-weight:700;color:var(--navy);margin-bottom:4px;">${icon} Saison ${esc(arc.saison)}</div>
            <div style="font-size:12px;color:var(--gray-txt);margin-bottom:8px;">Archivé le ${fmtDate(arc.archivedAt)}</div>
            <p style="font-size:13px;margin-bottom:10px;color:var(--navy);">
              <strong>${esc(title)}</strong>
              ${arc.discipline ? ` — ${D() ? D().getIcon(arc.discipline) : ''} ${esc(arc.discipline)}` : ''}
              ${arc.club ? ` — ${esc(arc.club)}` : ''}
            </p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn-sm" onclick="GSCArchivingModule.viewArchive('${esc(arc.id)}','${isPlayer ? 'players' : 'structures'}')">👁️ Consulter</button>
              <button class="btn-sm" onclick="GSCArchivingModule.printArchive('${esc(arc.id)}','${isPlayer ? 'players' : 'structures'}')">🖨️ Imprimer</button>
              <button class="btn-sm" onclick="GSCArchivingModule.downloadArchive('${esc(arc.id)}','${isPlayer ? 'players' : 'structures'}','json')">⬇️ JSON</button>
              ${!isPlayer ? `<button class="btn-sm" onclick="GSCArchivingModule.downloadArchive('${esc(arc.id)}','structures','csv')">⬇️ CSV</button>` : ''}
              ${opts.allowDelete !== false ? `<button class="btn-sm danger" onclick="GSCArchivingModule.deleteArchive('${esc(arc.id)}','${isPlayer ? 'players' : 'structures'}')">🗑️ Supprimer</button>` : ''}
            </div>
          </div>
        `; }).join('')}
      </div>
    `;

    return html;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. APERÇU ARCHIVE
   * ══════════════════════════════════════════════════════════════════ */
  function renderArchivePreview(archive) {
    if (!archive) return '<p>Archive non trouvée.</p>';

    const isStructure = archive.saisonData !== undefined;

    if (isStructure) {
      const seasonData = archive.saisonData || {};
      const effectifs = seasonData.effectifs || {};
      const roster = seasonData.roster || {};

      return `
        <div class="dash-card">
          <div class="dash-card-title">📋 Structure</div>
          <div class="detail-grid">
            <div><strong>Nom</strong><br>${esc(archive.nom)}</div>
            <div><strong>Discipline</strong><br>${D().getIcon(archive.discipline)} ${esc(archive.discipline)}</div>
            <div><strong>Type</strong><br>${esc(archive.type)}</div>
            <div><strong>Ville</strong><br>${esc(archive.ville)}</div>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-title">👥 Effectifs Saison ${archive.saison}</div>
          <div class="detail-grid">
            <div><strong>Hommes</strong><br>${effectifs.hommes || 0}</div>
            <div><strong>Femmes</strong><br>${effectifs.femmes || 0}</div>
            <div><strong>Total</strong><br>${(effectifs.hommes || 0) + (effectifs.femmes || 0)}</div>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-title">📊 Roster par catégorie</div>
          <div style="overflow-x:auto;">
            <table class="users-table">
              <thead><tr><th>Catégorie</th><th>Nombre</th></tr></thead>
              <tbody>
                ${Object.entries(roster).map(([cat, players]) => `
                  <tr><td>${esc(cat)}</td><td>${Array.isArray(players) ? players.length : 0}</td></tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      const stats = archive.stats || {};
      const BALL_TEAM_SPORTS_ARC = ['Football','Basketball','Handball','Volleyball','Rugby'];
      const CARD_SPORTS_ARC = ['Football','Handball','Rugby'];
      const isBallArchive = BALL_TEAM_SPORTS_ARC.includes(archive.sport);

      return `
        <div class="dash-card">
          <div class="dash-card-title">👤 Joueur</div>
          <div class="detail-grid">
            <div><strong>Nom</strong><br>${esc(archive.prenom)} ${esc(archive.nom)}</div>
            <div><strong>Club</strong><br>${esc(archive.club) || '—'}</div>
            <div><strong>Rôle</strong><br>${esc(archive.role)}</div>
            ${archive.sport ? `<div><strong>Discipline</strong><br>${D() ? D().getIcon(archive.sport) : ''} ${esc(archive.sport)}</div>` : ''}
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-title">📊 Statistiques ${archive.saison}</div>
          <div class="detail-grid">
            <div><strong>Matchs</strong><br>${stats.matchsJoues || 0}</div>
            ${isBallArchive ? `<div><strong>${archive.sport==='Basketball'?'Points':'Buts'}</strong><br>${stats.buts || 0}</div>` : ''}
            ${isBallArchive ? `<div><strong>Passes</strong><br>${stats.passes || 0}</div>` : ''}
            ${isBallArchive && CARD_SPORTS_ARC.includes(archive.sport) ? `
            <div><strong>Cartons J.</strong><br>${stats.cartonsJaunes || 0}</div>
            <div><strong>Cartons R.</strong><br>${stats.cartonsRouges || 0}</div>` : ''}
          </div>
        </div>
      `;
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. GESTION ARCHIVES
   * ══════════════════════════════════════════════════════════════════ */
  async function deleteArchive(archiveId, type) {
    if (!confirm('Supprimer cette archive ?')) return;

    try {
      if (!window.db) return;
      // ⚠️ FIX : on supprime désormais dans la collection explicitement
      // désignée par `type` ('structures' par défaut) au lieu de boucler
      // sur toutes les collections et de s'arrêter à la première trouvée
      // (ce qui pouvait "réussir" silencieusement sans jamais supprimer
      // le bon document si son type n'était pas 'structures').
      const ref = getArchiveRef(type || 'structures');
      if (ref) {
        await ref.doc(archiveId).delete();
        alert('✅ Archive supprimée');
        location.reload();
      }
    } catch (err) {
      console.error('Delete archive erreur:', err);
      alert('❌ Erreur suppression');
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5bis. CONSULTATION / IMPRESSION D'UNE ARCHIVE
   * ══════════════════════════════════════════════════════════════════ */
  async function fetchArchive(archiveId, type) {
    const ref = getArchiveRef(type || 'structures');
    if (!ref) return null;
    const doc = await ref.doc(archiveId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async function viewArchive(archiveId, type) {
    const archive = await fetchArchive(archiveId, type);
    if (!archive) { alert('Archive introuvable.'); return; }

    const html = `
      <div class="modal-overlay open" id="archive-view-modal" onclick="this.classList.remove('open')">
        <div class="modal" style="max-width:640px;max-height:90vh;overflow-y:auto;" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">📚 Archive — Saison ${esc(archive.saison)}</div>
              <div class="modal-subtitle">Archivé le ${fmtDate(archive.archivedAt)}</div>
            </div>
            <button class="modal-close" onclick="document.getElementById('archive-view-modal').classList.remove('open')">✕</button>
          </div>
          <div class="modal-content">
            ${renderArchivePreview(archive)}
            <div class="modal-actions">
              <button class="btn btn-secondary" onclick="GSCArchivingModule.printArchive('${esc(archiveId)}','${type || 'structures'}')">🖨️ Imprimer</button>
              <button class="btn btn-secondary" onclick="GSCArchivingModule.downloadArchive('${esc(archiveId)}','${type || 'structures'}','json')">⬇️ Télécharger JSON</button>
              <button class="btn btn-secondary" onclick="document.getElementById('archive-view-modal').classList.remove('open')">Fermer</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function openPrintWindow(title, bodyHtml) {
    const w = window.open('', '_blank');
    if (!w) { alert('Autorisez les fenêtres pop-up pour générer la version imprimable.'); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#1a2942;}
      h1{font-size:18px;border-bottom:2px solid #009E60;padding-bottom:8px;}
      .dash-card{margin-bottom:16px;} .dash-card-title{font-weight:700;margin-bottom:6px;}
      .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;}
      table{width:100%;border-collapse:collapse;font-size:12px;} td,th{border:1px solid #ddd;padding:6px;text-align:left;}
      </style></head><body><h1>${esc(title)}</h1>${bodyHtml}
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  }

  async function printArchive(archiveId, type) {
    const archive = await fetchArchive(archiveId, type);
    if (!archive) { alert('Archive introuvable.'); return; }
    const title = (type === 'players')
      ? `Archive — ${archive.prenom || ''} ${archive.nom || ''} (${archive.saison})`
      : `Archive — ${archive.nom || 'Structure'} (${archive.saison})`;
    openPrintWindow(title, renderArchivePreview(archive));
  }

  async function downloadArchive(archiveId, type, format) {
    const archive = await fetchArchive(archiveId, type);
    if (!archive) { alert('Archive introuvable.'); return; }
    if (format === 'csv') exportArchiveCSV(archive);
    else exportArchiveJSON(archive);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5ter. RAPPORT IMPRIMABLE GLOBAL — HISTORIQUE COMPLET
   * ══════════════════════════════════════════════════════════════════ */
  async function printAllArchives() {
    const archives = await getAllArchives();
    if (!archives.length) { alert('Aucune archive à imprimer.'); return; }
    const sorted = archives.sort((a, b) => new Date(b.saison + '-01-01') - new Date(a.saison + '-01-01'));
    const rows = sorted.map(a => {
      const isPlayer = a.kind === 'player';
      const title = isPlayer ? `${a.prenom || ''} ${a.nom || ''}`.trim() : (a.nom || '—');
      return `<tr><td>${isPlayer ? '👤 Joueur' : '🏢 Structure'}</td><td>${esc(title)}</td><td>${esc(a.saison)}</td><td>${fmtDate(a.archivedAt)}</td></tr>`;
    }).join('');
    const html = `<table><thead><tr><th>Type</th><th>Nom</th><th>Saison</th><th>Date d'archivage</th></tr></thead><tbody>${rows}</tbody></table>`;
    openPrintWindow('Historique complet des archivages', html);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 6. EXPORT ET TÉLÉCHARGEMENT
   * ══════════════════════════════════════════════════════════════════ */
  function exportArchiveJSON(archive) {
    const json = JSON.stringify(archive, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archive_${archive.saison}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportArchiveCSV(archive) {
    if (archive.saisonData && archive.saisonData.roster) {
      const roster = archive.saisonData.roster;
      let csv = 'Catégorie,Nom,Âge,Poste\n';

      Object.entries(roster).forEach(([cat, players]) => {
        if (Array.isArray(players)) {
          players.forEach(p => {
            csv += `"${cat}","${p.nom || ''}","${p.age || ''}","${p.poste || ''}"\n`;
          });
        }
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive_${archive.saison}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 7. RAPPORT ARCHIVAGE (Admin)
   * ══════════════════════════════════════════════════════════════════ */
  async function renderArchivingReport(allStructures) {
    try {
      if (!window.db) return '<p>DB non disponible</p>';

      const structRef = getArchiveRef('structures');
      const playerRef = getArchiveRef('players');

      let structCount = 0, playerCount = 0;

      if (structRef) {
        const snap = await structRef.get();
        structCount = snap.size;
      }

      if (playerRef) {
        const snap = await playerRef.get();
        playerCount = snap.size;
      }

      return `
        <div class="stats-grid">
          <div class="stat-card c1">
            <div class="stat-icon">🏢</div>
            <div class="stat-data">
              <div class="stat-value">${structCount}</div>
              <div class="stat-label">Structures archivées</div>
            </div>
          </div>
          <div class="stat-card c2">
            <div class="stat-icon">👥</div>
            <div class="stat-data">
              <div class="stat-value">${playerCount}</div>
              <div class="stat-label">Joueurs archivés</div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      return '<p>Erreur chargement rapport</p>';
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 8. EXPORT PUBLIC API
   * ══════════════════════════════════════════════════════════════════ */
  window.GSCArchivingModule = {
    archiveStructureSeason,
    archivePlayerSeason,
    getStructureArchives,
    getPlayerArchives,
    getAllArchives,
    renderArchiveTimeline,
    renderArchivePreview,
    renderArchivingReport,
    deleteArchive,
    exportArchiveJSON,
    exportArchiveCSV,
    viewArchive,
    printArchive,
    downloadArchive,
    printAllArchives
  };

})();
