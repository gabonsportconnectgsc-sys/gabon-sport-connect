/* GSC — inscription.html : rôles Gabonais à l'étranger / Sportif étranger */
(function () {
  'use strict';
  var WORLD = [
    "Afghanistan,Afrique du Sud,Albanie,Algérie,Allemagne,Andorre,Angola,Antigua-et-Barbuda,Arabie saoudite,Argentine,Arménie,Australie,Autriche,Azerbaïdjan",
    "Bahamas,Bahreïn,Bangladesh,Barbade,Belgique,Belize,Bénin,Bhoutan,Biélorussie,Birmanie,Bolivie,Bosnie-Herzégovine,Botswana,Brésil,Brunei,Bulgarie",
    "Burkina Faso,Burundi,Cambodge,Cameroun,Canada,Cap-Vert,Centrafrique,Chili,Chine,Chypre,Colombie,Comores,Congo,RD Congo,Corée du Nord,Corée du Sud",
    "Costa Rica,Côte d'Ivoire,Croatie,Cuba,Danemark,Djibouti,Dominique,Écosse,Égypte,Émirats arabes unis,Équateur,Érythrée,Espagne,Estonie,Eswatini",
    "États-Unis,Éthiopie,Fidji,Finlande,France,Gambie,Géorgie,Ghana,Grèce,Grenade,Guatemala,Guinée,Guinée-Bissau,Guinée équatoriale,Guyana,Haïti",
    "Honduras,Hongrie,Inde,Indonésie,Irak,Iran,Irlande,Islande,Israël,Italie,Jamaïque,Japon,Jordanie,Kazakhstan,Kenya,Kirghizistan,Kiribati,Kosovo",
    "Koweït,Laos,Lesotho,Lettonie,Liban,Liberia,Libye,Liechtenstein,Lituanie,Luxembourg,Macédoine du Nord,Madagascar,Malaisie,Malawi,Maldives,Mali",
    "Malte,Maroc,Maurice,Mauritanie,Mexique,Moldavie,Monaco,Mongolie,Monténégro,Mozambique,Namibie,Népal,Nicaragua,Niger,Nigeria,Norvège",
    "Nouvelle-Zélande,Oman,Ouganda,Ouzbékistan,Pakistan,Palestine,Panama,Papouasie-Nouvelle-Guinée,Paraguay,Pays de Galles,Pays-Bas,Pérou,Philippines,Pologne",
    "Portugal,Qatar,République dominicaine,République tchèque,Roumanie,Royaume-Uni,Russie,Rwanda,Saint-Marin,Salvador,Sénégal,Serbie,Seychelles,Sierra Leone",
    "Singapour,Slovaquie,Slovénie,Somalie,Soudan,Soudan du Sud,Sri Lanka,Suède,Suisse,Suriname,Syrie,Taïwan,Tadjikistan,Tanzanie,Tchad,Thaïlande",
    "Togo,Trinité-et-Tobago,Tunisie,Turkménistan,Turquie,Ukraine,Uruguay,Vatican,Venezuela,Vietnam,Yémen,Zambie,Zimbabwe",
    "Sao Tomé-et-Principe,Sainte-Lucie,Saint-Kitts-et-Nevis,Saint-Vincent-et-les-Grenadines,Samoa,Tonga,Tuvalu,Vanuatu,Îles Salomon,Nauru,Palaos",
    "Micronésie,Îles Marshall,Timor oriental,Guadeloupe,Martinique,La Réunion,Guyane,Angleterre,Irlande du Nord"
  ].join(',').split(',').sort(function (a, b) { return a.localeCompare(b, 'fr'); });

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function fgOf(id) { var e = $(id); return e ? (e.closest('.fg') || e.parentElement) : null; }
  function roleNow() { var t = document.querySelector('.role-tile.sel'); return t ? t.getAttribute('data-role') : ''; }
  function val(id) { var e = $(id); return e ? String(e.value || '').trim() : ''; }
  function fld(label, inner) { return '<div class="fg"><label>' + label + '</label>' + inner + '</div>'; }
  function txt(id, ph) { return '<input type="text" id="' + id + '" placeholder="' + esc(ph) + '" autocomplete="off">'; }

  function extraHtml() {
    return fld('École, université, académie ou association (si concerné)', txt('dia-x-structure', 'ex: Université de…, Académie…, Association…')) +
      fld('Fédération ou ligue du pays de résidence (optionnel)', txt('dia-x-fede', 'ex: Fédération française de football')) +
      fld('Autre nationalité / passeport (optionnel)', txt('dia-x-natsup', 'ex: Française')) +
      fld('Langues parlées', txt('dia-x-langues', 'ex: Français, Anglais, Espagnol')) +
      fld('Niveau d’études / diplôme en cours (optionnel)', txt('dia-x-etudes', 'ex: Licence 2 STAPS')) +
      fld('Lien vidéo ou profil sportif (optionnel)', '<input type="url" id="dia-x-lien" placeholder="https://…" autocomplete="off">') +
      fld('Consulat / ambassade du Gabon de rattachement (optionnel)', txt('dia-x-consulat', 'ex: Ambassade du Gabon à Paris')) +
      fld('Disponible pour une sélection ou un retour au Gabon', '<select id="dia-x-dispo"><option value="">—</option><option>Oui</option><option>Non</option><option>À discuter</option></select>');
  }

  var built = false;
  function buildDia() {
    var wrap = $('dia-wrap');
    if (built || !wrap || !window.GSC_DIASPORA) return;
    var h = window.GSC_DIASPORA.renderForm({});
    h = h.replace(/<div class="section-divider[^"]*">[^<]*<\/div>/, '')
         .replace(/class="form-group"/g, 'class="fg"')
         .replace('grid-template-columns:1fr 1fr', 'grid-template-columns:1fr');
    wrap.innerHTML = '<div class="subsection">🌍 Votre situation à l’étranger</div>' + h + extraHtml();
    ['fin', 'agent'].forEach(function (k) { var f = fgOf('edit-dia-' + k); if (f) f.remove(); });
    var p = $('edit-dia-pays');
    if (p) {
      var sel = document.createElement('select');
      sel.id = 'edit-dia-pays'; sel.setAttribute('data-dia', 'pays');
      sel.innerHTML = '<option value="">Sélectionner un pays</option>' + WORLD.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
      p.parentNode.replaceChild(sel, p);
    }
    ['pays', 'ville'].forEach(function (k) {
      var f = fgOf('edit-dia-' + k), l = f && f.querySelector('label');
      if (l && l.textContent.indexOf('*') < 0) l.textContent += ' *';
    });
    built = true;
  }

  function syncVille(on) {
    var s = $('a-ville'); if (!s) return;
    var o = s.querySelector('option[data-dia]');
    var v = on ? val('edit-dia-ville') : '';
    if (!v) { if (o) o.remove(); return; }
    if (!o) { o = document.createElement('option'); o.setAttribute('data-dia', '1'); s.appendChild(o); }
    o.value = v; o.textContent = v; s.value = v;
  }

  function apply() {
    var role = roleNow();
    var dia = role === 'gabonais_diaspora', etr = role === 'sportif_etranger';
    if (dia) buildDia();
    var a = $('dia-wrap'), e = $('etr-wrap'), g = $('fg-ville-gabon');
    if (a) a.style.display = dia ? '' : 'none';
    if (e) e.style.display = etr ? '' : 'none';
    if (g) g.style.display = dia ? 'none' : '';
    ['a-club-select', 'a-contrat-type'].forEach(function (id) {
      var f = fgOf(id); if (f) f.style.display = dia ? 'none' : '';
    });
    syncVille(dia);
  }

  window.gscDiaCollect = function (role) {
    var out = {};
    if (role === 'gabonais_diaspora' && window.GSC_DIASPORA && $('edit-dia-zone')) {
      Object.assign(out, window.GSC_DIASPORA.readForm());
      var lien = val('dia-x-lien');
      Object.assign(out, {
        structureEtudes: val('dia-x-structure'), federationPays: val('dia-x-fede'),
        autreNationalite: val('dia-x-natsup'), langues: val('dia-x-langues'),
        niveauEtudes: val('dia-x-etudes'), lienProfil: /^https?:\/\//i.test(lien) ? lien : '',
        consulatGabon: val('dia-x-consulat'), disponibleGabon: val('dia-x-dispo')
      });
    } else if (role === 'sportif_etranger') {
      out.nationalite = val('etr-nat');
    }
    Object.keys(out).forEach(function (k) { if (out[k] === '' || out[k] == null) delete out[k]; });
    return out;
  };

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'edit-dia-ville') syncVille(true);
  });
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('.role-tile')) setTimeout(apply, 0);
  });
  var s2a = $('s2a');
  if (s2a && window.MutationObserver) new MutationObserver(apply).observe(s2a, { attributes: true, attributeFilter: ['style'] });
  apply();
})();
