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

  /* ══════════════════════════════════════════════════════════════════
   * 3. RENDU TIMELINE ARCHIVES
   * ══════════════════════════════════════════════════════════════════ */
  function renderArchiveTimeline(archives) {
    if (!Array.isArray(archives) || archives.length === 0) {
      return '<p style="text-align:center;color:var(--gray-txt);padding:20px;">Aucune archive.</p>';
    }

    const sorted = archives.sort((a, b) => {
      const aDate = new Date(a.saison + '-01-01');
      const bDate = new Date(b.saison + '-01-01');
      return bDate - aDate;
    });

    const html = `
      <div style="position:relative;padding:20px 0;">
        <div style="position:absolute;left:20px;top:0;bottom:0;width:2px;background:var(--green);"></div>
        ${sorted.map((arc, idx) => `
          <div style="margin-bottom:20px;margin-left:60px;padding:12px 14px;background:#fff;border-radius:10px;border-left:3px solid var(--green);box-shadow:var(--shadow-sm);">
            <div style="font-weight:700;color:var(--navy);margin-bottom:4px;">Saison ${arc.saison}</div>
            <div style="font-size:12px;color:var(--gray-txt);margin-bottom:8px;">${fmtDate(arc.archivedAt)}</div>
            <p style="font-size:13px;margin-bottom:10px;color:var(--navy);">
              ${arc.nom || 'Archive'}
              ${arc.discipline ? ` — ${D().getIcon(arc.discipline)} ${arc.discipline}` : ''}
              ${arc.club ? ` — ${arc.club}` : ''}
            </p>
            <button class="btn-sm" onclick="GSCArchivingModule.viewArchive('${esc(arc.id)}')">👁️ Consulter</button>
            <button class="btn-sm danger" onclick="GSCArchivingModule.deleteArchive('${esc(arc.id)}')">🗑️ Supprimer</button>
          </div>
        `).join('')}
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

      return `
        <div class="dash-card">
          <div class="dash-card-title">👤 Joueur</div>
          <div class="detail-grid">
            <div><strong>Nom</strong><br>${esc(archive.prenom)} ${esc(archive.nom)}</div>
            <div><strong>Club</strong><br>${esc(archive.club) || '—'}</div>
            <div><strong>Rôle</strong><br>${esc(archive.role)}</div>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-title">⚽ Statistiques ${archive.saison}</div>
          <div class="detail-grid">
            <div><strong>Matchs</strong><br>${stats.matchsJoues || 0}</div>
            <div><strong>Buts</strong><br>${stats.buts || 0}</div>
            <div><strong>Passes</strong><br>${stats.passes || 0}</div>
            <div><strong>Cartons J.</strong><br>${stats.cartonsJaunes || 0}</div>
            <div><strong>Cartons R.</strong><br>${stats.cartonsRouges || 0}</div>
          </div>
        </div>
      `;
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. GESTION ARCHIVES
   * ══════════════════════════════════════════════════════════════════ */
  async function deleteArchive(archiveId) {
    if (!confirm('Supprimer cette archive ?')) return;

    try {
      if (!window.db) return;

      // Chercher dans quelle collection
      const collections = ['structures', 'players', 'coaches', 'referees'];
      for (const coll of collections) {
        const ref = getArchiveRef(coll);
        if (ref) {
          await ref.doc(archiveId).delete();
          alert('✅ Archive supprimée');
          location.reload();
          return;
        }
      }
    } catch (err) {
      console.error('Delete archive erreur:', err);
      alert('❌ Erreur suppression');
    }
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
    renderArchiveTimeline,
    renderArchivePreview,
    renderArchivingReport,
    deleteArchive,
    exportArchiveJSON,
    exportArchiveCSV,
    viewArchive(archiveId) {
      // À implémenter : ouvrir modale avec aperçu
      alert('Archive: ' + archiveId);
    }
  };

})();
