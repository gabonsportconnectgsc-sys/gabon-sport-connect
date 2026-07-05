/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC STRUCTURES SEED — Import des structures sportives réelles
 *  Gabon Sport Connect · 2026
 *
 *  Injecte dans la VRAIE collection Firestore `structuresSportives`
 *  (celle gérée par structures-manager.js / structures-form-builder.js)
 *  les fédérations gabonaises et les 14 clubs du National Foot 1,
 *  saison 2025-2026, au format exact attendu par ces modules.
 *
 *  Idempotent : ne recrée jamais un doublon (comparaison par nom/sigle
 *  normalisés) — peut être relancé sans risque pour "rafraîchir" la
 *  saison en cours des clubs déjà existants.
 *
 *  Utilisation (une fois connecté en admin, avec structures-manager.js
 *  et gsc-gabon-sports-data.js déjà chargés) :
 *
 *    GSCStructuresSeed.run()          // importe/actualise tout
 *    GSCStructuresSeed.preview()      // liste ce qui serait créé/modifié, sans écrire
 *
 *  Un bouton est aussi injecté dans l'onglet "Validations clubs"
 *  d'admin.html (voir gsc-club-validation-admin.js) si ce module est
 *  présent, pour lancer l'import sans toucher au code.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  function normalize(s) {
    return (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function existingList() {
    return (window.structuresManager && window.structuresManager.list && window.structuresManager.list()) || [];
  }

  function findExisting(nom, sigle) {
    const list = existingList();
    const n = normalize(nom), sg = normalize(sigle);
    return list.find(s => normalize(s.nom) === n || (sg && normalize(s.sigle) === sg)) || null;
  }

  /* Construit le payload structuresSportives pour un club D1 réel */
  function clubPayload(c) {
    return {
      nom: c.nom,
      sigle: c.sigle || '',
      discipline: c.sport,
      type: 'Club',
      ville: c.ville || '',
      lat: null, lng: null,
      statutJuridique: {},
      gouvernance: { bureau: [] },
      affiliations: [
        { organisme: 'FEGAFOOT', numeroAffiliation: '', dateAffiliation: '' },
        { organisme: 'LINAFP', numeroAffiliation: '', dateAffiliation: '' },
      ],
      adresse: c.ville || '',
      telephone: '', contact: '', email: '',
      capacite: 0,
      saisonCourante: c.saison || '2025-2026',
      saisons: {
        [c.saison || '2025-2026']: {
          effectifs: { hommes: 0, femmes: 0, parCategorie: {} },
          roster: {},
          encadrement: [],
          division: c.division || 'National Foot 1 (D1)',
        },
      },
      status: 'active',
    };
  }

  function federationPayload(f) {
    return {
      nom: f.nom,
      sigle: f.sigle,
      discipline: f.sport,
      type: 'Fédération',
      ville: 'Libreville',
      lat: null, lng: null,
      statutJuridique: {},
      gouvernance: { bureau: [] },
      affiliations: [],
      adresse: '', telephone: '', contact: '', email: '',
      capacite: 0,
      saisonCourante: '2025-2026',
      saisons: {},
      status: 'active',
    };
  }

  function buildPlan() {
    const d = window.GSC_GABON_SPORTS_DATA;
    if (!d) throw new Error('gsc-gabon-sports-data.js non chargé.');
    if (!window.structuresManager) throw new Error('structuresManager (structures-manager.js) non chargé.');

    const toCreate = [];
    const toRefresh = []; // déjà présent : on met juste à jour discipline/division/saison courante, on ne touche pas au reste (bureau, effectifs saisis manuellement, etc.)

    d.FEDERATIONS.forEach(f => {
      const existing = findExisting(f.nom, f.sigle);
      if (!existing) toCreate.push({ payload: federationPayload(f), label: `🏛️ ${f.nom}` });
    });

    d.CLUBS_D1_FOOTBALL_2025_2026.concat(d.AUTRES_STRUCTURES.filter(s => s.type === 'club')).forEach(c => {
      const existing = findExisting(c.nom, c.sigle);
      if (!existing) {
        toCreate.push({ payload: clubPayload(c), label: `⚽ ${c.nom} (${c.ville || '—'})` });
      } else if (existing.discipline !== c.sport || existing.saisonCourante !== (c.saison || '2025-2026')) {
        toRefresh.push({
          id: existing.id,
          label: `🔄 ${c.nom} — mise à jour saison/discipline`,
          payload: { discipline: c.sport, saisonCourante: c.saison || '2025-2026' },
        });
      }
    });

    return { toCreate, toRefresh };
  }

  function preview() {
    const { toCreate, toRefresh } = buildPlan();
    console.log(`[GSCStructuresSeed] À créer (${toCreate.length}) :`, toCreate.map(x => x.label));
    console.log(`[GSCStructuresSeed] À actualiser (${toRefresh.length}) :`, toRefresh.map(x => x.label));
    return { toCreate: toCreate.map(x => x.label), toRefresh: toRefresh.map(x => x.label) };
  }

  async function run(onProgress) {
    const { toCreate, toRefresh } = buildPlan();
    const total = toCreate.length + toRefresh.length;
    let done = 0;
    const report = { created: [], refreshed: [], errors: [] };

    for (const item of toCreate) {
      try {
        await window.structuresManager.create(item.payload);
        report.created.push(item.label);
      } catch (err) {
        console.error('[GSCStructuresSeed] création échouée pour', item.label, err);
        report.errors.push(`${item.label} : ${err.message || err}`);
      }
      done++; if (typeof onProgress === 'function') onProgress(done, total);
    }
    for (const item of toRefresh) {
      try {
        await window.structuresManager.update(item.id, item.payload);
        report.refreshed.push(item.label);
      } catch (err) {
        console.error('[GSCStructuresSeed] mise à jour échouée pour', item.label, err);
        report.errors.push(`${item.label} : ${err.message || err}`);
      }
      done++; if (typeof onProgress === 'function') onProgress(done, total);
    }
    console.log('[GSCStructuresSeed] Terminé :', report);
    return report;
  }

  window.GSCStructuresSeed = { run, preview, buildPlan };

})(window);
