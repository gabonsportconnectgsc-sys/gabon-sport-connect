/* ==========================================================
   GSC — Gabonais sportifs à l’étranger (rôle : gabonais_diaspora)
   Données de référence (zones, pays, championnats, divisions,
   clubs) + formulaire du profil spécifique.
   Les listes de clubs sont indicatives (saison 2025-2026) :
   le formulaire accepte toujours une saisie libre.
   ========================================================== */
(function (global) {
  'use strict';

  var FB = 'Football', BB = 'Basketball', RG = 'Rugby', HB = 'Handball';
  function L(nom, division, sport, clubs) {
    return { nom: nom, division: division, sport: sport || FB, clubs: clubs || [] };
  }

  var ZONES = [
    { nom: 'Europe', pays: [
      { nom: 'France', championnats: [
        L('Ligue 1', 'Division 1', FB, ['Paris Saint-Germain', 'Marseille', 'Monaco', 'Nice', 'Lille', 'Lyon', 'Lens', 'Rennes', 'Strasbourg', 'Nantes', 'Toulouse', 'Brest', 'Auxerre', 'Angers', 'Le Havre', 'Metz', 'Lorient', 'Paris FC']),
        L('Ligue 2', 'Division 2', FB),
        L('National', 'Division 3', FB),
        L('Betclic Élite', 'Division 1', BB),
        L('Pro B', 'Division 2', BB),
        L('Top 14', 'Division 1', RG),
        L('Pro D2', 'Division 2', RG),
        L('Starligue', 'Division 1', HB)
      ] },
      { nom: 'Belgique', championnats: [
        L('Jupiler Pro League', 'Division 1', FB, ['Anderlecht', 'Club Brugge', 'Union Saint-Gilloise', 'Genk', 'Gent', 'Antwerp', 'Standard Liège', 'Cercle Brugge', 'Mechelen', 'Charleroi', 'Westerlo', 'OH Leuven', 'Sint-Truiden', 'Zulte Waregem', 'Dender', 'RAAL La Louvière']),
        L('Challenger Pro League', 'Division 2', FB)
      ] },
      { nom: 'Portugal', championnats: [
        L('Liga Portugal', 'Division 1', FB, ['Benfica', 'Porto', 'Sporting CP', 'Braga', 'Vitória SC', 'Famalicão', 'Estoril', 'Gil Vicente', 'Moreirense', 'Casa Pia', 'Rio Ave', 'Arouca', 'Santa Clara', 'Nacional', 'Estrela da Amadora', 'Alverca', 'Tondela', 'AVS']),
        L('Liga Portugal 2', 'Division 2', FB)
      ] },
      { nom: 'Espagne', championnats: [
        L('LaLiga', 'Division 1', FB, ['Alavés', 'Athletic Club', 'Atlético de Madrid', 'FC Barcelone', 'Celta Vigo', 'Elche', 'Espanyol', 'Getafe', 'Girone', 'Levante', 'Majorque', 'Osasuna', 'Rayo Vallecano', 'Real Betis', 'Real Madrid', 'Real Oviedo', 'Real Sociedad', 'Séville FC', 'Valence', 'Villarreal']),
        L('LaLiga Hypermotion', 'Division 2', FB),
        L('Primera Federación', 'Division 3', FB),
        L('Liga ACB', 'Division 1', BB)
      ] },
      { nom: 'Angleterre', championnats: [
        L('Premier League', 'Division 1', FB, ['Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 'Burnley', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Leeds United', 'Liverpool', 'Manchester City', 'Manchester United', 'Newcastle United', 'Nottingham Forest', 'Sunderland', 'Tottenham', 'West Ham', 'Wolverhampton']),
        L('Championship', 'Division 2', FB),
        L('League One', 'Division 3', FB),
        L('League Two', 'Division 4', FB)
      ] },
      { nom: 'Italie', championnats: [
        L('Serie A', 'Division 1', FB, ['Atalanta', 'Bologne', 'Cagliari', 'Côme', 'Cremonese', 'Fiorentina', 'Genoa', 'Hellas Vérone', 'Inter Milan', 'Juventus', 'Lazio', 'Lecce', 'AC Milan', 'Naples', 'Parme', 'Pise', 'AS Rome', 'Sassuolo', 'Torino', 'Udinese']),
        L('Serie B', 'Division 2', FB),
        L('Serie C', 'Division 3', FB)
      ] },
      { nom: 'Allemagne', championnats: [
        L('Bundesliga', 'Division 1', FB, ['Augsbourg', 'Bayer Leverkusen', 'Bayern Munich', 'Borussia Dortmund', 'Borussia Mönchengladbach', 'Eintracht Francfort', 'Fribourg', 'Hambourg', 'Heidenheim', 'Hoffenheim', '1. FC Cologne', 'Mayence 05', 'RB Leipzig', 'St. Pauli', 'Stuttgart', 'Union Berlin', 'Werder Brême', 'Wolfsburg']),
        L('2. Bundesliga', 'Division 2', FB),
        L('3. Liga', 'Division 3', FB)
      ] },
      { nom: 'Pays-Bas', championnats: [L('Eredivisie', 'Division 1', FB), L('Eerste Divisie', 'Division 2', FB)] },
      { nom: 'Suisse', championnats: [L('Super League', 'Division 1', FB), L('Challenge League', 'Division 2', FB)] },
      { nom: 'Turquie', championnats: [
        L('Süper Lig', 'Division 1', FB, ['Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor', 'Başakşehir', 'Samsunspor', 'Göztepe', 'Konyaspor', 'Alanyaspor', 'Çaykur Rizespor', 'Antalyaspor', 'Kasımpaşa', 'Gaziantep FK', 'Kocaelispor', 'Eyüpspor', 'Kayserispor', 'Fatih Karagümrük', 'Gençlerbirliği']),
        L('TFF 1. Lig', 'Division 2', FB)
      ] },
      { nom: 'Grèce', championnats: [L('Super League 1', 'Division 1', FB)] },
      { nom: 'Russie', championnats: [L('Premier-Liga', 'Division 1', FB)] },
      { nom: 'Pologne', championnats: [L('Ekstraklasa', 'Division 1', FB)] },
      { nom: 'Autriche', championnats: [L('Bundesliga autrichienne', 'Division 1', FB)] },
      { nom: 'Écosse', championnats: [L('Scottish Premiership', 'Division 1', FB)] },
      { nom: 'Luxembourg', championnats: [L('BGL Ligue', 'Division 1', FB)] }
    ] },
    { nom: 'Afrique', pays: [
      { nom: 'Maroc', championnats: [L('Botola Pro D1', 'Division 1', FB), L('Botola Pro D2', 'Division 2', FB)] },
      { nom: 'Tunisie', championnats: [L('Ligue 1 Pro', 'Division 1', FB), L('Ligue 2', 'Division 2', FB)] },
      { nom: 'Égypte', championnats: [L('Egyptian Premier League', 'Division 1', FB)] },
      { nom: 'Algérie', championnats: [L('Ligue 1 Mobilis', 'Division 1', FB)] },
      { nom: 'Afrique du Sud', championnats: [L('Betway Premiership', 'Division 1', FB), L('National First Division', 'Division 2', FB)] },
      { nom: 'Cameroun', championnats: [L('Elite One', 'Division 1', FB)] },
      { nom: 'Congo', championnats: [L('Ligue 1 congolaise', 'Division 1', FB)] },
      { nom: 'RD Congo', championnats: [L('Linafoot', 'Division 1', FB)] },
      { nom: 'Guinée équatoriale', championnats: [L('Liga Nacional', 'Division 1', FB)] },
      { nom: 'Sénégal', championnats: [L('Ligue 1 sénégalaise', 'Division 1', FB)] },
      { nom: "Côte d'Ivoire", championnats: [L('Ligue 1 ivoirienne', 'Division 1', FB)] },
      { nom: 'Nigeria', championnats: [L('NPFL', 'Division 1', FB)] },
      { nom: 'Ghana', championnats: [L('Ghana Premier League', 'Division 1', FB)] },
      { nom: 'Angola', championnats: [L('Girabola', 'Division 1', FB)] }
    ] },
    { nom: 'Moyen-Orient', pays: [
      { nom: 'Arabie saoudite', championnats: [L('Saudi Pro League', 'Division 1', FB), L('Saudi First Division', 'Division 2', FB)] },
      { nom: 'Qatar', championnats: [L('Qatar Stars League', 'Division 1', FB)] },
      { nom: 'Émirats arabes unis', championnats: [L('UAE Pro League', 'Division 1', FB)] },
      { nom: 'Koweït', championnats: [L('Kuwait Premier League', 'Division 1', FB)] },
      { nom: 'Iran', championnats: [L('Persian Gulf Pro League', 'Division 1', FB)] },
      { nom: 'Israël', championnats: [L("Ligat Ha'Al", 'Division 1', FB)] }
    ] },
    { nom: 'Asie', pays: [
      { nom: 'Chine', championnats: [L('Chinese Super League', 'Division 1', FB)] },
      { nom: 'Japon', championnats: [L('J1 League', 'Division 1', FB), L('J2 League', 'Division 2', FB)] },
      { nom: 'Corée du Sud', championnats: [L('K League 1', 'Division 1', FB)] },
      { nom: 'Thaïlande', championnats: [L('Thai League 1', 'Division 1', FB)] },
      { nom: 'Inde', championnats: [L('Indian Super League', 'Division 1', FB)] },
      { nom: 'Vietnam', championnats: [L('V.League 1', 'Division 1', FB)] },
      { nom: 'Indonésie', championnats: [L('Liga 1', 'Division 1', FB)] },
      { nom: 'Malaisie', championnats: [L('Malaysia Super League', 'Division 1', FB)] }
    ] },
    { nom: 'Amériques', pays: [
      { nom: 'États-Unis', championnats: [
        L('MLS', 'Division 1', FB),
        L('USL Championship', 'Division 2', FB),
        L('NBA', 'Division 1', BB),
        L('NBA G League', 'Division 2', BB),
        L('NCAA Division I', 'Universitaire', 'Multisports')
      ] },
      { nom: 'Canada', championnats: [L('Canadian Premier League', 'Division 1', FB), L('U Sports', 'Universitaire', 'Multisports')] },
      { nom: 'Brésil', championnats: [L('Brasileirão Série A', 'Division 1', FB), L('Brasileirão Série B', 'Division 2', FB)] },
      { nom: 'Argentine', championnats: [L('Liga Profesional', 'Division 1', FB)] },
      { nom: 'Mexique', championnats: [L('Liga MX', 'Division 1', FB)] }
    ] },
    { nom: 'Océanie', pays: [
      { nom: 'Australie', championnats: [L('A-League Men', 'Division 1', FB)] },
      { nom: 'Nouvelle-Zélande', championnats: [L('National League', 'Division 1', FB)] }
    ] }
  ];

  var STATUTS = ['Professionnel sous contrat', 'Semi-professionnel', 'Amateur', 'Centre de formation / Académie',
    'Étudiant-athlète (université)', 'En essai', 'Libre de tout contrat', 'Prêté'];
  var SELECTIONS = ['Aucune sélection', 'Équipe nationale A du Gabon', 'Sélections de jeunes du Gabon', 'Éligible / en discussion'];

  /* ---------- Utilitaires ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function opt(v, sel, label) {
    return '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(label == null ? v : label) + '</option>';
  }
  function g(label, inner) {
    return '<div class="form-group"><label>' + label + '</label>' + inner + '</div>';
  }
  function byNom(list, nom) {
    for (var i = 0; i < list.length; i++) if (list[i].nom === nom) return list[i];
    return null;
  }
  function paysDe(zone) {
    var out = [];
    ZONES.forEach(function (z) { if (!zone || z.nom === zone) z.pays.forEach(function (p) { out.push(p); }); });
    return out;
  }
  function champsDe(zone, pays) {
    var out = [];
    paysDe(zone).forEach(function (p) { if (!pays || p.nom === pays) p.championnats.forEach(function (c) { out.push(c); }); });
    return out;
  }
  function clubsDe(zone, pays, champ) {
    var out = [];
    champsDe(zone, pays).forEach(function (c) {
      if (!champ || c.nom === champ) c.clubs.forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
    });
    return out;
  }
  function dl(id, items) {
    return '<datalist id="' + id + '">' + items.map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>';
  }
  function dlPays(zone) { return paysDe(zone).map(function (p) { return p.nom; }); }
  function dlChamp(zone, pays) {
    var base = pays && byNom(paysDe(zone), pays) ? champsDe(zone, pays) : champsDe(zone, '');
    return base.map(function (c) { return c.nom; });
  }
  function dlClub(zone, pays, champ) {
    if (champ && byNom(champsDe(zone, pays), champ)) return clubsDe(zone, pays, champ);
    if (pays && byNom(paysDe(zone), pays)) return clubsDe(zone, pays, '');
    return [];
  }

  /* ---------- Formulaire du profil ---------- */
  function renderForm(p) {
    p = p || {};
    var inp = function (id, key, val, extra) {
      return '<input type="text" id="edit-dia-' + id + '" ' + (key ? 'data-dia="' + key + '" ' : '') + (extra || '') + ' value="' + esc(val) + '">';
    };
    var h = '<div class="section-divider blue">🇬🇦 Gabonais sportif à l’étranger</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    h += g('Zone de pratique', '<select id="edit-dia-zone" data-dia="zone"><option value="">—</option>' +
      ZONES.map(function (z) { return opt(z.nom, p.zonePratique === z.nom); }).join('') + '</select>');
    h += g('Pays de résidence', inp('pays', 'pays', p.paysResidence, 'list="dia-dl-pays" placeholder="Pays…" autocomplete="off"'));
    h += g('Ville', inp('ville', '', p.villeResidence, 'placeholder="Ville…"'));
    h += g('Championnat', inp('champ', 'champ', p.championnat, 'list="dia-dl-champ" placeholder="Championnat…" autocomplete="off"'));
    h += g('Division', inp('division', 'division', p.division, 'placeholder="Division 1, 2…"'));
    h += g('Club actuel', inp('club', 'club', p.clubEtranger, 'list="dia-dl-club" placeholder="Nom du club…" autocomplete="off"'));
    h += g('Statut professionnel', '<select id="edit-dia-statut"><option value="">—</option>' +
      STATUTS.map(function (s) { return opt(s, p.statutPro === s); }).join('') + '</select>');
    h += g('Fin de contrat', '<input type="date" id="edit-dia-fin" value="' + esc(p.finContrat) + '">');
    h += g('Année de départ du Gabon', '<input type="number" id="edit-dia-annee" min="1950" max="2100" value="' + esc(p.anneeDepartGabon) + '">');
    h += g('Équipe nationale du Gabon', '<select id="edit-dia-selection"><option value="">—</option>' +
      SELECTIONS.map(function (s) { return opt(s, p.selectionGabon === s); }).join('') + '</select>');
    h += g('Ancien club au Gabon', inp('ancien', '', p.ancienClubGabon, 'placeholder="Dernier club au Gabon…"'));
    h += g('Agent / agence', inp('agent', '', p.agent, 'placeholder="Nom de l’agent ou de l’agence…"'));
    h += '</div>';
    h += dl('dia-dl-pays', dlPays(p.zonePratique || '')) +
      dl('dia-dl-champ', dlChamp(p.zonePratique || '', p.paysResidence || '')) +
      dl('dia-dl-club', dlClub(p.zonePratique || '', p.paysResidence || '', p.championnat || ''));
    return h;
  }

  function val(id) {
    var el = document.getElementById('edit-dia-' + id);
    return el ? String(el.value || '').trim() : '';
  }
  function readForm() {
    var annee = val('annee');
    return {
      zonePratique: val('zone'),
      paysResidence: val('pays'),
      villeResidence: val('ville'),
      championnat: val('champ'),
      division: val('division'),
      clubEtranger: val('club'),
      statutPro: val('statut'),
      finContrat: val('fin'),
      anneeDepartGabon: annee ? Number(annee) : '',
      selectionGabon: val('selection'),
      ancienClubGabon: val('ancien'),
      agent: val('agent')
    };
  }

  /* Listes en cascade : zone → pays → championnat → clubs */
  function majListes(cle) {
    if (!document.getElementById('edit-dia-zone')) return;
    var zone = val('zone'), pays = val('pays'), champ = val('champ');
    var set = function (id, items) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = items.map(function (v) { return '<option value="' + esc(v) + '">'; }).join('');
    };
    if (cle === 'zone') set('dia-dl-pays', dlPays(zone));
    if (cle === 'zone' || cle === 'pays') set('dia-dl-champ', dlChamp(zone, pays));
    set('dia-dl-club', dlClub(zone, pays, champ));
    if (cle === 'champ') {
      var c = byNom(champsDe(zone, pays), champ) || byNom(champsDe('', ''), champ);
      var d = document.getElementById('edit-dia-division');
      if (c && d) d.value = c.division;
    }
  }
  function surChangement(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var k = t.getAttribute('data-dia');
    if (k) majListes(k);
  }
  document.addEventListener('input', surChangement);
  document.addEventListener('change', surChangement);

  global.GSC_DIASPORA = {
    role: 'gabonais_diaspora',
    libelle: 'Gabonais sportif à l’étranger',
    libelleCourt: 'Gabonais de l’étranger',
    ZONES: ZONES, STATUTS: STATUTS, SELECTIONS: SELECTIONS,
    renderForm: renderForm, readForm: readForm,
    pays: dlPays, championnats: champsDe, clubs: clubsDe
  };
})(window);
