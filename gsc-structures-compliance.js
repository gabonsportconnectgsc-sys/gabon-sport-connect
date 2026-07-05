/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC-STRUCTURES-COMPLIANCE.JS — Module Conformité Administrative
 *  Gabon Sport Connect · Module 3/7 · 2026
 *
 *  Gestion des documents exigés par discipline et organisme (Ministère,
 *  Fédération, Ligue, FIFA, CAF, etc.). Badge automatique Bronze/Argent/Or.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const D = () => window.GSCDisciplines;
  const P = () => window.GSCStructureProfile;
  const SM = () => window.structuresManager;

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* Libellés lisibles pour les codes organisme (affichage uniquement,
     n'affecte pas la logique de calcul). 'federation_feminine' est le
     code utilisé par disciplines-config-feminin.js pour les documents
     propres au championnat/registre des joueuses licenciées. */
  const ORG_LABELS = {
    ministere: 'Ministère',
    federation: 'Fédération',
    ligue: 'Ligue',
    fifa: 'FIFA',
    caf: 'CAF',
    federation_feminine: 'Fédération — Secteur Féminin 🚺',
    autre: 'Autre'
  };
  function orgLabel(code) { return ORG_LABELS[code] || code; }

  /**
   * Une structure est considérée "à effectif féminin" pour une saison
   * donnée si son roster de joueuses (saisons[saison].effectifs.femmes)
   * est > 0. ⚠️ Ceci ne concerne QUE les effectifs de joueuses inscrites
   * dans une équipe/catégorie féminine d'une structure — pas les actrices
   * individuelles (arbitres, entraîneures, officielles) qui peuvent très
   * bien exercer au sein d'une structure ou d'une compétition de secteur
   * masculin (ex. une arbitre officiant des matchs de football masculin).
   * Ces actrices sont comptabilisées ailleurs (voir admin-secteur-feminin.js,
   * répartition par rôle) et ne déclenchent PAS d'exigence de documents
   * "féminin" pour la structure masculine à laquelle elles sont rattachées.
   */
  function hasFeminineRoster(structure, saison) {
    const saisons = structure.saisons || {};
    const saisonData = saisons[saison] || {};
    const eff = saisonData.effectifs || {};
    return (eff.femmes || 0) > 0;
  }

  /**
   * Documents requis pour une structure donnée : documents génériques de
   * la discipline + documents spécifiques "secteur féminin" UNIQUEMENT si
   * la structure a un roster de joueuses féminin déclaré pour la saison.
   * Fonctionne même si disciplines-config-feminin.js n'est pas chargé
   * (retombe alors sur les documents génériques uniquement).
   */
  function getDocumentsForStructure(structure, saison) {
    const base = D().getDocuments(structure.discipline);
    if (hasFeminineRoster(structure, saison) && typeof D().getFeminineDocuments === 'function') {
      return base.concat(D().getFeminineDocuments(structure.discipline));
    }
    return base;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 1. MODÈLE CONFORMITÉ
   * ══════════════════════════════════════════════════════════════════ */
  const DEFAULT_COMPLIANCE = {
    saisonCourante: '2025-2026',
    documents: {},
    modeles: {},
    archive: {}
  };

  function getComplianceRef(structureId) {
    if (!window.db) return null;
    // ⚠️ FIX (juillet 2026) : collection canonique = 'structuresSportives'
    // (alignée sur structures-manager.js). Voir aussi gsc-structures-infrastructures.js.
    return window.db.collection('structuresSportives').doc(structureId).collection('conformite');
  }

  function getModelsRef() {
    if (!window.db) return null;
    return window.db.collection('conformite-modeles');
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. CALCUL DU BADGE
   * ══════════════════════════════════════════════════════════════════ */
  function computeBadge(structure, saison) {
    if (!structure || !structure.discipline) return { badge: '—', color: '#ccc', pct: 0 };

    const docs = getDocumentsForStructure(structure, saison);
    const mandatory = docs.filter(d => d.obligatoire).length;

    const saisons = structure.saisons || {};
    const saisonData = saisons[saison] || {};
    const compl = saisonData.conformite || {};
    const uploaded = docs.filter(d => d.obligatoire && compl[d.id] && compl[d.id].uploadedAt).length;

    // Réutilise la logique officielle de badge définie dans disciplines-config.js
    const result = D().computeComplianceBadge(uploaded, mandatory);
    const emoji = result.level === 'or' ? '✅' : result.level === 'argent' ? '📌' : '🥉';
    return { badge: `${result.label} ${emoji}`, color: result.color, pct: result.pct };
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. RENDU ADMIN — TABLEAU CONFORMITÉ
   * ══════════════════════════════════════════════════════════════════ */
  function renderComplianceTable(structures) {
    if (!Array.isArray(structures) || structures.length === 0) {
      return '<p style="text-align:center;color:var(--gray-txt);padding:20px;">Aucune structure trouvée.</p>';
    }

    const rows = structures.map(s => {
      const saison = s.saisonCourante || '2025-2026';
      const badge = computeBadge(s, saison);
      const femBadge = hasFeminineRoster(s, saison) ? ' <span title="Roster féminin déclaré — documents secteur féminin inclus" style="font-size:11px;">🚺</span>' : '';
      return `
        <tr onclick="GSCComplianceModule.openStructure('${esc(s.id)}')">
          <td>${esc(s.nom)}</td>
          <td>${D().getIcon(s.discipline)} ${esc(s.discipline)}${femBadge}</td>
          <td>${esc(s.type)}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:80px;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${badge.pct}%;background:${badge.color};transition:width 0.3s;"></div>
              </div>
              <span style="font-size:11px;font-weight:700;color:${badge.color};">${badge.badge}</span>
            </div>
          </td>
          <td><button class="btn-sm" onclick="event.stopPropagation();GSCComplianceModule.openStructure('${esc(s.id)}')">📋 Voir</button></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="users-table-wrap">
        <table class="users-table">
          <thead><tr><th>Structure</th><th>Discipline</th><th>Type</th><th>Conformité</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. RENDU DÉTAIL — DOCUMENTS D'UNE STRUCTURE
   * ══════════════════════════════════════════════════════════════════ */
  function renderDocumentChecklist(structure, saison) {
    if (!structure || !structure.discipline) return '<p>Structure invalide.</p>';

    const docs = getDocumentsForStructure(structure, saison);
    const saisons = structure.saisons || {};
    const saisonData = saisons[saison] || {};
    const compl = saisonData.conformite || {};

    const byOrganism = {};
    docs.forEach(d => {
      const org = d.organisme || 'autre';
      byOrganism[org] = byOrganism[org] || [];
      byOrganism[org].push(d);
    });

    const sections = Object.entries(byOrganism).map(([org, docList]) => {
      const mandatory = docList.filter(d => d.obligatoire).length;
      const uploaded = docList.filter(d => compl[d.id] && compl[d.id].uploadedAt).length;
      const pct = Math.round((uploaded / mandatory) * 100) || 0;

      const rows = docList.map(d => {
        const item = compl[d.id] || {};
        const status = item.uploadedAt ? '✅' : '❌';
        const date = item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString('fr-FR') : '—';
        return `
          <tr>
            <td>${status}</td>
            <td><strong>${esc(d.label)}</strong> ${d.obligatoire ? '<span style="color:var(--danger);font-weight:700;">*</span>' : ''}</td>
            <td>${date}</td>
            <td>
              ${item.url ? `<a href="${esc(item.url)}" target="_blank" class="btn-sm">📄 Voir</a>` : '<span style="color:var(--gray-txt);">—</span>'}
              <button class="btn-sm" onclick="GSCComplianceModule.uploadDocument('${esc(structure.id)}','${esc(d.id)}','${esc(saison)}')">📤 Upload</button>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div class="dash-card" style="margin-bottom:16px;">
          <div class="dash-card-title">${esc(orgLabel(org))} — ${uploaded}/${mandatory} documents</div>
          <div style="margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ea580c'};"></div>
              </div>
              <span style="font-size:11px;font-weight:700;">${pct}%</span>
            </div>
          </div>
          <div class="users-table-wrap">
            <table class="users-table">
              <thead><tr><th style="width:30px;">Status</th><th>Document</th><th style="width:100px;">Date</th><th style="width:180px;">Actions</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    return sections || '<p>Aucun document configuré pour cette discipline.</p>';
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. UPLOAD DOCUMENT (Structures)
   * ══════════════════════════════════════════════════════════════════ */
  async function uploadDocument(structureId, documentId, saison) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png,.xlsx';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        if (!window.firebase || !window.firebase.storage) {
          alert('Firebase Storage non disponible');
          return;
        }

        const path = `structures/${structureId}/conformite/${saison}/${documentId}`;
        const ref = window.firebase.storage().ref(path);
        const snapshot = await ref.put(file);
        const url = await snapshot.ref.getDownloadURL();

        const compRef = getComplianceRef(structureId);
        if (compRef) {
          await compRef.doc(saison).set({
            [documentId]: {
              uploadedAt: new Date(),
              url,
              fileName: file.name,
              size: file.size
            }
          }, { merge: true });

          alert('✅ Document uploadé avec succès');
          location.reload();
        }
      } catch (err) {
        console.error('Upload erreur:', err);
        alert('❌ Erreur upload: ' + (err.message || err));
      }
    };
    input.click();
  }

  /* ══════════════════════════════════════════════════════════════════
   * 6. GESTION MODÈLES (Admin)
   * ══════════════════════════════════════════════════════════════════ */
  async function uploadTemplate(documentId, discipline) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xlsx';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        if (!window.firebase || !window.firebase.storage) {
          alert('Firebase Storage non disponible');
          return;
        }

        const path = `conformite-modeles/${discipline}/${documentId}`;
        const ref = window.firebase.storage().ref(path);
        const snapshot = await ref.put(file);
        const url = await snapshot.ref.getDownloadURL();

        const modelsRef = getModelsRef();
        if (modelsRef) {
          await modelsRef.doc(`${discipline}_${documentId}`).set({
            discipline,
            documentId,
            url,
            fileName: file.name,
            uploadedAt: new Date()
          });

          alert('✅ Modèle uploadé');
          location.reload();
        }
      } catch (err) {
        console.error('Template upload erreur:', err);
        alert('❌ Erreur: ' + (err.message || err));
      }
    };
    input.click();
  }

  /* Récupère les modèles déjà uploadés pour une discipline donnée,
     indexés par documentId, pour savoir quelles cases sont déjà pourvues. */
  async function getTemplatesForDiscipline(discipline) {
    const modelsRef = getModelsRef();
    if (!modelsRef) return {};
    try {
      const snap = await modelsRef.where('discipline', '==', discipline).get();
      const byDoc = {};
      snap.docs.forEach(d => { const data = d.data(); byDoc[data.documentId] = { docId: d.id, ...data }; });
      return byDoc;
    } catch (err) {
      console.error('[ComplianceModule] getTemplatesForDiscipline erreur:', err);
      return {};
    }
  }

  async function deleteTemplate(discipline, documentId) {
    if (!confirm('Supprimer ce modèle officiel ?')) return;
    try {
      const modelsRef = getModelsRef();
      if (modelsRef) {
        await modelsRef.doc(`${discipline}_${documentId}`).delete();
        alert('✅ Modèle supprimé');
        renderTemplatesInto('conformite-modeles-gallery', discipline);
      }
    } catch (err) {
      alert('❌ Erreur suppression : ' + (err && err.message ? err.message : ''));
    }
  }

  /* Cadre (frame) par document requis de la discipline : affiche l'état
     "déjà fourni" (avec aperçu, remplacement, suppression) ou "à ajouter"
     (upload). C'est ce qui manquait pour que l'admin voie d'un coup d'œil
     quels modèles restent à charger, discipline par discipline. */
  function renderTemplateCards(discipline, existing, editable) {
    const docs = (typeof D().getCombinedDocuments === 'function')
      ? D().getCombinedDocuments(discipline)
      : D().getDocuments(discipline);
    if (!docs.length) return '<p style="text-align:center;color:var(--gray-txt);padding:20px;">Aucun document requis configuré pour cette discipline.</p>';

    const cards = docs.map(d => {
      const model = existing[d.id];
      if (model) {
        return `
          <div class="dash-card" style="text-align:center;padding:16px;border:1.5px solid var(--green,#009E60);">
            <div style="font-size:32px;margin-bottom:8px;">✅</div>
            <div style="font-size:12px;font-weight:700;margin-bottom:4px;">${esc(d.label)}</div>
            <div style="font-size:10px;color:var(--gray-txt);margin-bottom:10px;">${esc(model.fileName || 'Modèle disponible')}</div>
            <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
              <a class="btn-sm" href="${esc(model.url)}" target="_blank">📄 Voir</a>
              ${editable ? `
                <button class="btn-sm" onclick="GSCComplianceModule.uploadTemplate('${esc(d.id)}','${esc(discipline)}')">🔄 Remplacer</button>
                <button class="btn-sm danger" onclick="GSCComplianceModule.deleteTemplate('${esc(discipline)}','${esc(d.id)}')">🗑️</button>
              ` : ''}
            </div>
          </div>`;
      }
      return `
        <div class="dash-card" style="text-align:center;padding:16px;">
          <div style="font-size:32px;margin-bottom:8px;">📄</div>
          <div style="font-size:12px;font-weight:700;margin-bottom:6px;">${esc(d.label)}</div>
          <div style="font-size:11px;color:var(--gray-txt);margin-bottom:10px;">${editable ? 'Modèle officiel manquant' : 'Non disponible pour le moment'}</div>
          ${editable ? `<button class="btn-sm" onclick="GSCComplianceModule.uploadTemplate('${esc(d.id)}','${esc(discipline)}')">📤 Ajouter modèle</button>` : ''}
        </div>`;
    }).join('');

    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">${cards}</div>`;
  }

  /* Vue Admin (éditable : upload/remplacement/suppression) */
  function renderTemplateGallery(discipline) {
    // Rendu synchrone immédiat en état "chargement", complété par renderTemplatesInto().
    return '<p style="text-align:center;color:var(--gray-txt);padding:20px;">Chargement des modèles…</p>';
  }

  async function renderTemplatesInto(containerId, discipline) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<p style="text-align:center;color:var(--gray-txt);padding:20px;">Chargement des modèles…</p>';
    const existing = await getTemplatesForDiscipline(discipline);
    el.innerHTML = renderTemplateCards(discipline, existing, true);
  }

  /* Vue Structures (lecture seule) : liste des modèles officiels
     téléchargeables, filtrés automatiquement par la discipline/secteur de
     la structure connectée. Utilisable depuis l'onglet Conformité d'une
     fiche structure, ou depuis l'espace public d'une structure. */
  async function renderStructureTemplatesList(discipline) {
    const existing = await getTemplatesForDiscipline(discipline);
    return `
      <div class="dash-card-title" style="margin:14px 0 8px;">📄 Modèles officiels — ${D() ? D().getIcon(discipline) : ''} ${esc(discipline)}</div>
      ${renderTemplateCards(discipline, existing, false)}
    `;
  }

  async function renderStructureTemplatesInto(containerId, discipline) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = await renderStructureTemplatesList(discipline);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 7. ARCHIVAGE PAR SAISON
   * ══════════════════════════════════════════════════════════════════ */
  async function archiveSeasonCompliance(structureId, saison) {
    if (!confirm(`Archiver la conformité pour ${saison} ?`)) return;

    try {
      const compRef = getComplianceRef(structureId);
      if (compRef) {
        const snap = await compRef.doc(saison).get();
        const data = snap.data() || {};

        await compRef.doc('archive').set({
          [saison]: {
            data,
            archivedAt: new Date()
          }
        }, { merge: true });

        alert('✅ Saison archivée');
        location.reload();
      }
    } catch (err) {
      console.error('Archive erreur:', err);
      alert('❌ Erreur archivage');
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 8. EXPORT PUBLIC API
   * ══════════════════════════════════════════════════════════════════ */
  window.GSCComplianceModule = {
    renderComplianceTable,
    renderDocumentChecklist,
    renderTemplateGallery,
    renderTemplatesInto,
    renderStructureTemplatesList,
    renderStructureTemplatesInto,
    getTemplatesForDiscipline,
    deleteTemplate,
    computeBadge,
    hasFeminineRoster,
    getDocumentsForStructure,
    uploadDocument,
    uploadTemplate,
    archiveSeasonCompliance,
    openStructure(id) {
      if (typeof window.gscOpenStructure === 'function') {
        window.gscOpenStructure(id);
      }
    }
  };

})();
