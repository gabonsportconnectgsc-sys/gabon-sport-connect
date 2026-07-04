/**
 * ══════════════════════════════════════════════════════════════════════
 *  STRUCTURES-FORM-BUILDER.JS — Formulaires dynamiques par discipline
 *  Gabon Sport Connect · Module 2/7 · 2026
 *
 *  Dépendances : disciplines-config.js, structures-profile-engine.js,
 *  structures-manager.js
 *
 *  Utilisation :
 *    GSCStructureForm.open(container, structureOuNull, sport, saison)
 *    GSCStructureForm.collect(sport, saison) -> objet structure complet
 *    GSCStructureForm.save(existingId, sport, saison) -> Promise<id>
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const D = () => window.GSCDisciplines;
  const P = () => window.GSCStructureProfile;

  const FORM_ROOT_ID = 'structure-form-body';
  let _currentStructure = null; // référence de travail (mutée pendant l'édition)

  function esc(s) { return (s || '').toString().replace(/"/g, '&quot;'); }
  function uid() { return 'r' + Math.random().toString(36).slice(2, 9); }

  /* ══════════════════════════════════════════════════════════════════
   * 1. SECTIONS STATIQUES
   * ══════════════════════════════════════════════════════════════════ */
  function sectionIdentity(s, sport, sportChosen) {
    const disciplines = D().list();
    const types = D().getStructureTypes(sport);
    return `
    <div class="form-section">
      <div class="section-divider">🪪 Identité</div>
      <div class="form-group"><label>Nom de la structure</label>
        <input type="text" id="sf-nom" value="${esc(s.nom)}" placeholder="AS Mangasport…"></div>
      <div class="form-group"><label>Sigle</label>
        <input type="text" id="sf-sigle" value="${esc(s.sigle)}" placeholder="ASM"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group"><label>Discipline principale</label>
          <select id="sf-discipline" onchange="GSCStructureForm.onDisciplineChange(this.value)">
            ${sportChosen ? '' : '<option value="" disabled selected>-- Choisir une discipline --</option>'}
            ${disciplines.map(d => `<option value="${esc(d)}" ${d === sportChosen ? 'selected' : ''}>${D().getIcon(d)} ${esc(d)}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Type de structure</label>
          <select id="sf-type">
            ${types.map(t => `<option value="${esc(t)}" ${t === s.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-group"><label>Ville</label>
        <select id="sf-ville">
          ${['Libreville','Port-Gentil','Franceville','Oyem','Moanda','Mouila','Lambaréné','Tchibanga','Koulamoutou','Bitam','Owendo','Lastoursville']
            .map(v => `<option ${v === s.ville ? 'selected' : ''}>${v}</option>`).join('')}
        </select></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group"><label>Latitude GPS</label><input type="number" id="sf-lat" step="any" value="${s.lat ?? ''}"></div>
        <div class="form-group"><label>Longitude GPS</label><input type="number" id="sf-lng" step="any" value="${s.lng ?? ''}"></div>
      </div>
      <div class="form-group" style="background:#f8fafc;border:1px solid var(--gray-bd,#e2e8f0);border-radius:10px;padding:10px 12px;margin-top:4px;">
        <label>📍 Localisation rapide</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0;">
          <button type="button" class="btn-sm" onclick="GSCStructureForm.useMyLocation()">📡 Utiliser ma position GPS</button>
          <button type="button" class="btn-sm" onclick="GSCStructureForm.openInMaps()">🗺️ Voir sur Google Maps</button>
          <button type="button" class="btn-sm" onclick="GSCStructureForm.shareLocationWhatsApp()">💬 Partager via WhatsApp</button>
        </div>
        <div style="display:flex;gap:8px;">
          <input type="text" id="sf-maps-link" placeholder="Coller un lien Google Maps ou WhatsApp (localisation partagée)…" style="flex:1;">
          <button type="button" class="btn-sm" onclick="GSCStructureForm.extractLatLngFromLink()">Extraire</button>
        </div>
        <div id="sf-geo-hint" style="font-size:11px;color:var(--gray-txt);margin-top:6px;">Astuce : sur WhatsApp, partagez la position du lieu, copiez le lien Google Maps généré, puis collez-le ci-dessus.</div>
      </div>
    </div>`;
  }

  function sectionLegal(s) {
    const j = s.statutJuridique || {};
    return `
    <div class="form-section">
      <div class="section-divider">⚖️ Statut administratif et juridique</div>
      <div class="form-group"><label>Forme juridique</label>
        <input type="text" id="sf-forme" value="${esc(j.formeJuridique)}" placeholder="Association loi 1901, Société sportive…"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group"><label>N° Récépissé</label><input type="text" id="sf-recepisse" value="${esc(j.numeroRecepisse)}"></div>
        <div class="form-group"><label>Date récépissé</label><input type="date" id="sf-recepisse-date" value="${esc(j.dateRecepisse)}"></div>
      </div>
      <div class="form-group"><label>Siège social</label><input type="text" id="sf-siege" value="${esc(j.siegeSocial)}"></div>
    </div>`;
  }

  function sectionContact(s) {
    return `
    <div class="form-section">
      <div class="section-divider">📞 Coordonnées</div>
      <div class="form-group"><label>Adresse</label><input type="text" id="sf-adresse" value="${esc(s.adresse)}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group"><label>Téléphone</label><input type="text" id="sf-telephone" value="${esc(s.telephone || s.contact)}" placeholder="+241…"></div>
        <div class="form-group"><label>Email</label><input type="email" id="sf-email" value="${esc(s.email)}"></div>
      </div>
      <div class="form-group"><label>Capacité (places)</label><input type="number" id="sf-capacite" min="0" value="${s.capacite ?? 0}"></div>
    </div>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. LISTES DYNAMIQUES (bureau, affiliations, encadrement)
   * ══════════════════════════════════════════════════════════════════ */
  function dynRow(fields, values) {
    const rowId = uid();
    const inputs = fields.map(f =>
      `<input type="text" data-field="${f.key}" placeholder="${esc(f.label)}" value="${esc((values || {})[f.key])}" style="flex:1;min-width:0;">`
    ).join('');
    return `<div class="dyn-row" id="${rowId}" style="display:flex;gap:6px;margin-bottom:6px;align-items:center;">
      ${inputs}
      <button type="button" class="btn-icon-danger" onclick="document.getElementById('${rowId}').remove()">✕</button>
    </div>`;
  }

  function sectionGovernance(s) {
    const bureau = (s.gouvernance && s.gouvernance.bureau) || [];
    const rows = bureau.map(b => dynRow(
      [{ key: 'role', label: 'Rôle' }, { key: 'nom', label: 'Nom' }, { key: 'telephone', label: 'Téléphone' }, { key: 'email', label: 'Email' }], b
    )).join('');
    const g = s.gouvernance || {};
    return `
    <div class="form-section">
      <div class="section-divider">🏛️ Gouvernance</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group"><label>Début du mandat</label><input type="date" id="sf-mandat-debut" value="${esc(g.mandatDebut)}"></div>
        <div class="form-group"><label>Fin du mandat</label><input type="date" id="sf-mandat-fin" value="${esc(g.mandatFin)}"></div>
      </div>
      <label style="font-size:12px;font-weight:600;">Membres du bureau</label>
      <div id="sf-bureau-rows" style="margin-top:6px;">${rows}</div>
      <button type="button" class="btn-sm" onclick="GSCStructureForm.addRow('sf-bureau-rows',['role','nom','telephone','email'])">+ Ajouter un membre</button>
    </div>`;
  }

  function sectionAffiliations(s, sportChosen) {
    const list = Array.isArray(s.affiliations) ? s.affiliations : [];
    const rows = list.map(a => dynRow(
      [{ key: 'organisme', label: 'Organisme' }, { key: 'numeroAffiliation', label: 'N° affiliation' }, { key: 'dateAffiliation', label: 'Date (AAAA-MM-JJ)' }], a
    )).join('');
    const disciplineForSuggestions = sportChosen || s.discipline || '';
    return `
    <div class="form-section">
      <div class="section-divider">🔗 Affiliations</div>
      ${disciplineForSuggestions ? `<p style="font-size:11px;color:var(--gray-txt);margin-bottom:6px;">Organismes suggérés : ${D().getOrganismes(disciplineForSuggestions).join(', ')}</p>` : `<p style="font-size:11px;color:var(--gray-txt);margin-bottom:6px;">Choisissez d'abord une discipline ci-dessus pour voir les organismes suggérés.</p>`}
      <div id="sf-affiliations-rows">${rows}</div>
      <button type="button" class="btn-sm" onclick="GSCStructureForm.addRow('sf-affiliations-rows',['organisme','numeroAffiliation','dateAffiliation'])">+ Ajouter une affiliation</button>
    </div>`;
  }

  function sectionEncadrement(saisonData, sport) {
    const list = Array.isArray(saisonData.encadrement) ? saisonData.encadrement : [];
    const roles = D().getEncadrementRoles(sport);
    const rows = list.map(e => dynRow(
      [{ key: 'role', label: 'Rôle' }, { key: 'nom', label: 'Nom' }, { key: 'telephone', label: 'Téléphone' }, { key: 'email', label: 'Email' }], e
    )).join('');
    return `
    <div class="form-section">
      <div class="section-divider">🎓 Encadrement (saison en cours)</div>
      <p style="font-size:11px;color:var(--gray-txt);margin-bottom:6px;">Rôles types : ${roles.join(', ')}</p>
      <div id="sf-encadrement-rows">${rows}</div>
      <button type="button" class="btn-sm" onclick="GSCStructureForm.addRow('sf-encadrement-rows',['role','nom','telephone','email'])">+ Ajouter un encadrant</button>
    </div>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. EFFECTIFS + ROSTER (dynamiques par catégorie selon discipline)
   * ══════════════════════════════════════════════════════════════════ */
  function sectionEffectifs(saisonData, sport) {
    const categories = D().getCategories(sport);
    const pc = (saisonData.effectifs && saisonData.effectifs.parCategorie) || {};
    const rows = categories.map(cat => {
      const v = pc[cat] || { hommes: 0, femmes: 0 };
      return `
      <div style="display:grid;grid-template-columns:100px 1fr 1fr;gap:8px;align-items:center;margin-bottom:6px;">
        <span style="font-size:12px;font-weight:600;">${esc(cat)}</span>
        <input type="number" min="0" data-cat-effectif="${esc(cat)}" data-sexe="hommes" value="${v.hommes || 0}" placeholder="Hommes">
        <input type="number" min="0" data-cat-effectif="${esc(cat)}" data-sexe="femmes" value="${v.femmes || 0}" placeholder="Femmes">
      </div>`;
    }).join('');
    return `
    <div class="form-section">
      <div class="section-divider">👥 Effectifs par catégorie et par sexe</div>
      <div style="display:grid;grid-template-columns:100px 1fr 1fr;gap:8px;margin-bottom:4px;">
        <span></span><span style="font-size:11px;color:var(--gray-txt);">Hommes</span><span style="font-size:11px;color:var(--gray-txt);">Femmes</span>
      </div>
      ${rows}
    </div>`;
  }

  function rosterRow(cat, p) {
    p = p || {};
    const rowId = uid();
    return `<tr id="${rowId}" data-cat="${esc(cat)}">
      <td><input type="text" data-r="nom" value="${esc(p.nom)}" placeholder="Nom complet"></td>
      <td><input type="number" min="0" data-r="age" value="${p.age ?? ''}" style="width:60px;"></td>
      <td><input type="date" data-r="dateNaissance" value="${esc(p.dateNaissance)}"></td>
      <td><input type="text" data-r="poste" value="${esc(p.poste)}" placeholder="Poste"></td>
      <td><input type="text" data-r="infos" value="${esc(p.infos)}" placeholder="Infos essentielles"></td>
      <td><button type="button" class="btn-icon-danger" onclick="document.getElementById('${rowId}').remove()">✕</button></td>
    </tr>`;
  }

  function sectionRoster(saisonData, sport, saison) {
    const categories = D().getCategories(sport);
    const roster = saisonData.roster || {};
    const blocks = categories.map(cat => {
      const rows = (roster[cat] || []).map(p => rosterRow(cat, p)).join('');
      return `
      <div style="margin-bottom:14px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${esc(cat)}</div>
        <table class="mini-table"><thead><tr><th>Nom</th><th>Âge</th><th>Naissance</th><th>Poste</th><th>Infos</th><th></th></tr></thead>
        <tbody id="sf-roster-${cssId(cat)}">${rows}</tbody></table>
        <button type="button" class="btn-sm" onclick="GSCStructureForm.addRosterRow('${esc(cat)}')">+ Ajouter dans ${esc(cat)}</button>
      </div>`;
    }).join('');
    return `
    <div class="form-section">
      <div class="section-divider">📋 Joueurs / Athlètes — Saison ${esc(saison)}</div>
      <p style="font-size:11px;color:var(--gray-txt);margin-bottom:8px;">
        Ces données constituent l'archive sportive de la saison. Chaque saison est conservée indépendamment.
      </p>
      ${blocks}
    </div>`;
  }

  function cssId(s) { return (s || '').toString().replace(/[^a-zA-Z0-9]/g, '_'); }

  /* ══════════════════════════════════════════════════════════════════
   * 4. ASSEMBLAGE DU FORMULAIRE
   * ══════════════════════════════════════════════════════════════════ */
  function build(structure, sport, saison) {
    const sportChosen = sport || structure.discipline || '';
    sport = sportChosen || 'Football'; // secours interne uniquement pour générer catégories/rôles/organismes
    saison = saison || structure.saisonCourante || P().getCurrentSeasonLabel();
    const saisonData = P().ensureSeason(structure, saison, sport);

    const seasons = P().listSeasons(structure);
    if (!seasons.includes(saison)) seasons.unshift(saison);
    const seasonOpts = seasons.map(sn => `<option value="${esc(sn)}" ${sn === saison ? 'selected' : ''}>${esc(sn)}</option>`).join('');

    return `
      <div class="form-group" style="display:flex;gap:8px;align-items:flex-end;">
        <div style="flex:1;">
          <label>Saison / Période éditée</label>
          <select id="sf-saison" onchange="GSCStructureForm.onSeasonChange(this.value)">${seasonOpts}</select>
        </div>
        <button type="button" class="btn-sm" onclick="GSCStructureForm.newSeason()">+ Nouvelle saison</button>
      </div>
      ${sectionIdentity(structure, sport, sportChosen)}
      ${sectionLegal(structure)}
      ${sectionGovernance(structure)}
      ${sectionAffiliations(structure, sportChosen)}
      ${sectionEffectifs(saisonData, sport)}
      ${sectionRoster(saisonData, sport, saison)}
      ${sectionEncadrement(saisonData, sport)}
      ${sectionContact(structure)}
    `;
  }

  function open(container, structure, sport, saison) {
    _currentStructure = structure ? JSON.parse(JSON.stringify(structure)) : {
      nom: '', sigle: '', type: '', discipline: sport || '',
      ville: 'Libreville', lat: null, lng: null, statutJuridique: {},
      gouvernance: { bureau: [] }, affiliations: [], saisons: {}, status: 'active'
    };
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    el.innerHTML = build(_currentStructure, sport || _currentStructure.discipline, saison || _currentStructure.saisonCourante);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. INTERACTIONS DYNAMIQUES
   * ══════════════════════════════════════════════════════════════════ */
  function addRow(containerId, fieldKeys) {
    const labels = { role: 'Rôle', nom: 'Nom', telephone: 'Téléphone', email: 'Email', organisme: 'Organisme', numeroAffiliation: 'N° affiliation', dateAffiliation: 'Date (AAAA-MM-JJ)' };
    const fields = fieldKeys.map(k => ({ key: k, label: labels[k] || k }));
    document.getElementById(containerId).insertAdjacentHTML('beforeend', dynRow(fields, {}));
  }

  function addRosterRow(cat) {
    const tbody = document.getElementById('sf-roster-' + cssId(cat));
    if (tbody) tbody.insertAdjacentHTML('beforeend', rosterRow(cat, {}));
  }

  function onDisciplineChange(newSport) {
    if (!_currentStructure) return;
    collectInto(_currentStructure);
    _currentStructure.discipline = newSport;
    const saison = document.getElementById('sf-saison')?.value || _currentStructure.saisonCourante;
    open(document.getElementById(FORM_ROOT_ID) ? FORM_ROOT_ID : document.querySelector('.structure-form-container'), _currentStructure, newSport, saison);
  }

  function onSeasonChange(newSaison) {
    if (!_currentStructure) return;
    collectInto(_currentStructure);
    const sport = document.getElementById('sf-discipline')?.value || _currentStructure.discipline;
    P().ensureSeason(_currentStructure, newSaison, sport);
    open(document.getElementById(FORM_ROOT_ID) ? FORM_ROOT_ID : document.querySelector('.structure-form-container'), _currentStructure, sport, newSaison);
  }

  function newSeason() {
    const label = prompt('Nouvelle saison (ex : 2026-2027) :', P().getCurrentSeasonLabel());
    if (!label) return;
    onSeasonChange(label.trim());
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5bis. GÉOLOCALISATION — GPS natif, lien Google Maps / WhatsApp
   * ══════════════════════════════════════════════════════════════════ */
  function setGeoHint(msg, isError) {
    const el = document.getElementById('sf-geo-hint');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? '#dc2626' : 'var(--gray-txt)';
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setGeoHint('⚠️ Géolocalisation non disponible sur cet appareil/navigateur.', true); return; }
    setGeoHint('📡 Récupération de la position en cours…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latEl = document.getElementById('sf-lat');
        const lngEl = document.getElementById('sf-lng');
        if (latEl) latEl.value = pos.coords.latitude.toFixed(6);
        if (lngEl) lngEl.value = pos.coords.longitude.toFixed(6);
        setGeoHint('✅ Position GPS récupérée et remplie automatiquement.');
      },
      (err) => setGeoHint('❌ Impossible de récupérer la position : ' + (err.message || 'accès refusé.'), true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Extrait lat/lng d'un lien Google Maps (formats @lat,lng / ?q=lat,lng / ?ll=lat,lng /
  // !3dlat!4dlng) — c'est aussi le format que WhatsApp génère quand on partage une position
  // et que le destinataire copie le lien "Voir la position" dans son navigateur.
  function extractLatLngFromLink() {
    const link = document.getElementById('sf-maps-link')?.value?.trim() || '';
    if (!link) { setGeoHint('⚠️ Collez d\'abord un lien Google Maps ou WhatsApp.', true); return; }
    const m = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      || link.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
      || link.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
      || link.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (!m) {
      setGeoHint('⚠️ Coordonnées introuvables dans ce lien. Si c\'est un lien court (maps.app.goo.gl ou lien WhatsApp raccourci), ouvrez-le d\'abord dans le navigateur puis collez l\'adresse complète qui s\'affiche.', true);
      return;
    }
    const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
    const latEl = document.getElementById('sf-lat');
    const lngEl = document.getElementById('sf-lng');
    if (latEl) latEl.value = lat;
    if (lngEl) lngEl.value = lng;
    setGeoHint(`✅ Coordonnées extraites du lien : ${lat}, ${lng}`);
  }

  function openInMaps() {
    const lat = document.getElementById('sf-lat')?.value;
    const lng = document.getElementById('sf-lng')?.value;
    if (!lat || !lng) { setGeoHint('⚠️ Renseignez d\'abord la latitude/longitude (ou utilisez le GPS).', true); return; }
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }

  function shareLocationWhatsApp() {
    const lat = document.getElementById('sf-lat')?.value;
    const lng = document.getElementById('sf-lng')?.value;
    if (!lat || !lng) { setGeoHint('⚠️ Renseignez d\'abord la latitude/longitude (ou utilisez le GPS).', true); return; }
    const nom = document.getElementById('sf-nom')?.value?.trim() || 'Structure GSC';
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const text = encodeURIComponent(`📍 ${nom} — Localisation : ${mapsUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  /* ══════════════════════════════════════════════════════════════════
   * 6. COLLECTE DES DONNÉES DU DOM
   * ══════════════════════════════════════════════════════════════════ */
  function collectRows(containerId) {
    const c = document.getElementById(containerId);
    if (!c) return [];
    return Array.from(c.querySelectorAll('.dyn-row')).map(row => {
      const o = {};
      row.querySelectorAll('[data-field]').forEach(inp => { o[inp.dataset.field] = inp.value.trim(); });
      return o;
    }).filter(o => Object.values(o).some(v => v));
  }

  function collectRoster(sport) {
    const categories = D().getCategories(sport);
    const roster = {};
    categories.forEach(cat => {
      const tbody = document.getElementById('sf-roster-' + cssId(cat));
      roster[cat] = tbody ? Array.from(tbody.querySelectorAll('tr')).map(tr => {
        const o = { id: tr.id };
        tr.querySelectorAll('[data-r]').forEach(inp => {
          o[inp.dataset.r] = inp.type === 'number' ? (parseInt(inp.value) || null) : inp.value.trim();
        });
        return o;
      }).filter(o => o.nom) : [];
    });
    return roster;
  }

  function collectEffectifs(sport) {
    const categories = D().getCategories(sport);
    const parCategorie = {};
    categories.forEach(cat => {
      const h = document.querySelector(`[data-cat-effectif="${cssEsc(cat)}"][data-sexe="hommes"]`);
      const f = document.querySelector(`[data-cat-effectif="${cssEsc(cat)}"][data-sexe="femmes"]`);
      parCategorie[cat] = { hommes: parseInt(h?.value) || 0, femmes: parseInt(f?.value) || 0 };
    });
    const totals = Object.values(parCategorie).reduce((acc, v) => ({ hommes: acc.hommes + v.hommes, femmes: acc.femmes + v.femmes }), { hommes: 0, femmes: 0 });
    return { ...totals, parCategorie };
  }

  function cssEsc(s) { return (s || '').replace(/"/g, '\\"'); }

  function val(id) { return document.getElementById(id)?.value ?? ''; }

  function collectInto(target) {
    const sport = val('sf-discipline') || target.discipline || 'Football';
    const saison = val('sf-saison') || target.saisonCourante || P().getCurrentSeasonLabel();

    target.nom = val('sf-nom').trim();
    target.sigle = val('sf-sigle').trim();
    target.discipline = sport;
    target.type = val('sf-type');
    target.ville = val('sf-ville');
    target.lat = parseFloat(val('sf-lat')) || null;
    target.lng = parseFloat(val('sf-lng')) || null;

    target.statutJuridique = {
      formeJuridique: val('sf-forme').trim(),
      numeroRecepisse: val('sf-recepisse').trim(),
      dateRecepisse: val('sf-recepisse-date'),
      siegeSocial: val('sf-siege').trim()
    };

    target.gouvernance = {
      mandatDebut: val('sf-mandat-debut'),
      mandatFin: val('sf-mandat-fin'),
      bureau: collectRows('sf-bureau-rows')
    };

    target.affiliations = collectRows('sf-affiliations-rows');

    target.adresse = val('sf-adresse').trim();
    target.telephone = val('sf-telephone').trim();
    target.contact = target.telephone;
    target.email = val('sf-email').trim();
    target.capacite = parseInt(val('sf-capacite')) || 0;

    target.saisons = target.saisons || {};
    target.saisons[saison] = {
      effectifs: collectEffectifs(sport),
      roster: collectRoster(sport),
      encadrement: collectRows('sf-encadrement-rows')
    };
    target.saisonCourante = saison;

    return target;
  }

  function collect(sport, saison) {
    const target = _currentStructure || {};
    return collectInto(target);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 7. SAUVEGARDE (via structures-manager.js)
   * ══════════════════════════════════════════════════════════════════ */
  async function save(existingId) {
    if (!window.structuresManager) throw new Error('structuresManager indisponible');
    const data = collect();
    if (!data.nom) throw new Error('Le nom de la structure est obligatoire');
    if (existingId) {
      await window.structuresManager.update(existingId, data);
      return existingId;
    }
    return window.structuresManager.create(data);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 8. EXPOSITION GLOBALE
   * ══════════════════════════════════════════════════════════════════ */
  window.GSCStructureForm = {
    open, build, addRow, addRosterRow,
    onDisciplineChange, onSeasonChange, newSeason,
    useMyLocation, extractLatLngFromLink, openInMaps, shareLocationWhatsApp,
    collect, save
  };

})(window);
