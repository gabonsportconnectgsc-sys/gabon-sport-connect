/**
 * ══════════════════════════════════════════════════════════════════════
 *  GED-IMPRESSION.JS — Module d'impression &amp; export (GED)
 *  Gabon Sport Connect · Module Admin 3/4 · 2026
 *
 *  Impression : document individuel, catégorie documentaire, tous les
 *  documents d'un club, ou de plusieurs clubs — avec filtres (sport,
 *  ville/province, badge, catégorie, période, statut) et export PDF
 *  (impression directe via fenêtre navigateur, comme gsc-structures-
 *  archiving.js) — aucune dépendance externe ajoutée.
 *
 *  Dépendances : window.GEDValidation, window.GEDCatalogue,
 *  window.GSCDisciplines.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const D = () => window.GSCDisciplines;
  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmtDate(d) { try { return d ? new Date(d.toDate ? d.toDate() : d).toLocaleDateString('fr-FR') : '—'; } catch (e) { return '—'; } }

  const STATUT_LABELS = { en_attente: 'En attente', valide: 'Validé', refuse: 'Refusé', correction: 'Correction demandée' };

  function openPrintWindow(title, bodyHtml) {
    const w = window.open('', '_blank');
    if (!w) { alert('Autorisez les fenêtres pop-up pour générer la version imprimable.'); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#1a2942;}
      h1{font-size:18px;border-bottom:2px solid #009E60;padding-bottom:8px;}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px;}
      td,th{border:1px solid #ddd;padding:6px;text-align:left;}
      .ged-print-meta{font-size:11px;color:#64748b;margin-bottom:14px;}
      </style></head><body><h1>${esc(title)}</h1>${bodyHtml}
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  }

  function rowsToTable(rows) {
    const trs = rows.map(r => `
      <tr>
        <td>${esc(r.structureNom)}</td>
        <td>${esc(r.discipline)}</td>
        <td>${esc(r.ville || '—')}</td>
        <td>${esc(r.docNom)}</td>
        <td>${esc(STATUT_LABELS[r.statut] || r.statut)}</td>
        <td>${fmtDate(r.uploadedAt)}</td>
      </tr>
    `).join('');
    return `<table><thead><tr><th>Structure</th><th>Discipline</th><th>Ville</th><th>Document</th><th>Statut</th><th>Déposé le</th></tr></thead><tbody>${trs}</tbody></table>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * FILTRES DÉDIÉS À L'IMPRESSION
   * ══════════════════════════════════════════════════════════════════ */
  function renderFilters() {
    const structures = (window.GEDValidation && window.GEDValidation.getStructures()) || [];
    const disciplines = D().list();
    const villes = [...new Set(structures.map(s => s.ville).filter(Boolean))].sort();
    const noms = structures.map(s => `<option value="${esc(s.id)}">${esc(s.nom)}</option>`).join('');

    return `
      <div class="ged-filters">
        <select id="gedp-sport"><option value="">Tous sports</option>${disciplines.map(name => `<option value="${esc(name)}">${D().getIcon(name) || ''} ${esc(name)}</option>`).join('')}</select>
        <select id="gedp-ville"><option value="">Toutes villes/provinces</option>${villes.map(v => `<option>${esc(v)}</option>`).join('')}</select>
        <select id="gedp-cat"><option value="">Toutes catégories</option><option value="administratif">Administratif</option><option value="juridique">Juridique</option><option value="financier">Financier</option><option value="sportif">Sportif</option></select>
        <select id="gedp-statut"><option value="">Tous statuts</option><option value="en_attente">En attente</option><option value="valide">Validé</option><option value="refuse">Refusé</option><option value="correction">Correction</option></select>
        <select id="gedp-structures" multiple size="4" style="min-width:180px;">${noms}</select>
      </div>
      <p class="ged-panel-sub">Astuce : sélectionnez une ou plusieurs structures dans la liste pour restreindre l'impression multi-club (laissez vide = toutes les structures filtrées).</p>
      <div class="ged-filters">
        <button class="btn btn-secondary" onclick="GEDImpression.printFiltered()">🖨️ Imprimer la sélection filtrée</button>
        <button class="btn btn-secondary" onclick="GEDImpression.printByCategory()">🖨️ Imprimer par catégorie</button>
        <button class="btn btn-secondary" onclick="GEDImpression.exportCSV()">⬇️ Export Excel (CSV)</button>
      </div>
    `;
  }

  function getFilteredRows() {
    const rows = (window.GEDValidation && window.GEDValidation.getRows()) || [];
    const sport = document.getElementById('gedp-sport')?.value;
    const ville = document.getElementById('gedp-ville')?.value;
    const cat = document.getElementById('gedp-cat')?.value;
    const statut = document.getElementById('gedp-statut')?.value;
    const selEl = document.getElementById('gedp-structures');
    const selected = selEl ? Array.from(selEl.selectedOptions).map(o => o.value) : [];

    return rows.filter(r =>
      (!sport || r.discipline === sport) &&
      (!ville || r.ville === ville) &&
      (!cat || r.categorie === cat) &&
      (!statut || r.statut === statut) &&
      (!selected.length || selected.includes(r.structureId))
    );
  }

  function printFiltered() {
    const rows = getFilteredRows();
    if (!rows.length) { alert('Aucun document à imprimer pour ces filtres.'); return; }
    openPrintWindow('Rapport de conformité — GED', `<div class="ged-print-meta">Généré le ${fmtDate(new Date())} · ${rows.length} document(s)</div>${rowsToTable(rows)}`);
  }

  function printByCategory() {
    const rows = getFilteredRows();
    if (!rows.length) { alert('Aucun document à imprimer pour ces filtres.'); return; }
    const byCat = {};
    rows.forEach(r => { byCat[r.categorie] = byCat[r.categorie] || []; byCat[r.categorie].push(r); });
    const html = Object.entries(byCat).map(([cat, list]) => `<h2 style="font-size:14px;margin-top:18px;">${esc(cat)}</h2>${rowsToTable(list)}`).join('');
    openPrintWindow('Rapport de conformité par catégorie — GED', html);
  }

  function exportCSV() {
    const rows = getFilteredRows();
    if (!rows.length) { alert('Aucune donnée à exporter.'); return; }
    let csv = 'Structure,Discipline,Ville,Document,Categorie,Statut,Date de depot\n';
    rows.forEach(r => {
      csv += `"${r.structureNom}","${r.discipline}","${r.ville || ''}","${r.docNom}","${r.categorie}","${STATUT_LABELS[r.statut] || r.statut}","${fmtDate(r.uploadedAt)}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ged_conformite_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  /* ══════════════════════════════════════════════════════════════════
   * INJECTION UI
   * ══════════════════════════════════════════════════════════════════ */
  function injectPanel() {
    if (document.getElementById('ged-impression-panel')) return;
    const host = document.getElementById('conformite');
    if (!host) return;

    const panel = document.createElement('div');
    panel.id = 'ged-impression-panel';
    panel.className = 'dash-card ged-panel';
    panel.innerHTML = `
      <div class="dash-card-title">🖨️ Impression &amp; export</div>
      ${renderFilters()}
    `;
    host.appendChild(panel);
  }

  function boot() {
    const target = document.getElementById('conformite');
    if (target) { injectPanel(); return; }
    const obs = new MutationObserver(() => {
      if (document.getElementById('conformite')) injectPanel();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GEDImpression = { printFiltered, printByCategory, exportCSV };

})(window);
