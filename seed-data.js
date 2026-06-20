/* ═══════════════════════════════════════════════════════════════
   SEED-DATA.JS — Acteurs sportifs de démonstration (DEMO)
   Source UNIQUE partagée par index.html (public) et admin.html.
   Chaque acteur porte isDemo:true pour être identifiable et
   exclu/inclus volontairement des comptages selon le contexte.
   ⚠️ Ces fiches ne sont PAS de vrais comptes Firestore — elles
   servent à présenter l'application tant que peu d'inscriptions
   réelles existent. Retirez ce fichier (ou videz le tableau)
   quand la base de vrais acteurs sera suffisante.
   ═══════════════════════════════════════════════════════════════ */
const GSC_SEED_ACTORS = [
  {isDemo:true,uid:'seed-a01',prenom:'Pierre Alain',nom:'Mounguengui',role:'federation',sport:'Football',ville:'Libreville',nomOrganisation:'FEGAFOOT',typeOrganisation:'Fédération',president:'Pierre Alain Mounguengui',anneeCreation:'1962',niveau:'National',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a02',prenom:'Bruno',nom:'Mounguélé',role:'joueur',sport:'Football',ville:'Libreville',poste:'Milieu central',club:'CF Mounana',niveau:'National',matchsJoues:45,buts:8,passes:12,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a03',prenom:'Denis',nom:'Bouanga',role:'joueur',sport:'Football',ville:'Libreville',poste:'Ailier droit',club:'LA FC',niveau:'International',matchsJoues:120,buts:55,passes:30,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a04',prenom:'Mario',nom:'Lémina',role:'joueur',sport:'Football',ville:'Libreville',poste:'Milieu défensif',club:'Wolverhampton',niveau:'International',matchsJoues:200,buts:15,passes:40,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a05',prenom:'Alain',nom:'Obiang',role:'entraineur',sport:'Football',ville:'Libreville',poste:'Coach principal',club:'AS Stade Mandji',niveau:'National',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a06',prenom:'Jean-Claude',nom:'Mvoa',role:'arbitre',sport:'Football',ville:'Libreville',poste:'Arbitre central',niveau:'National',licenceNumero:'GAB-ARB-001',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a07',prenom:'',nom:'',role:'club',sport:'Football',ville:'Libreville',nomOrganisation:'CF Mounana',typeOrganisation:'Club sportif',president:'Roger Ondo',anneeCreation:'1968',effectif:35,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a08',prenom:'',nom:'',role:'club',sport:'Football',ville:'Port-Gentil',nomOrganisation:'AS Stade Mandji',typeOrganisation:'Club sportif',president:'Paul Essone',anneeCreation:'1980',effectif:28,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a09',prenom:'',nom:'',role:'club',sport:'Football',ville:'Libreville',nomOrganisation:'FC 105 Libreville',typeOrganisation:'Club sportif',president:'Marie-Christine Nzamba',anneeCreation:'1990',effectif:40,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a10',prenom:'',nom:'',role:'club',sport:'Basketball',ville:'Libreville',nomOrganisation:'GBC Basketball Club',typeOrganisation:'Club sportif',president:'Samuel Ondo',anneeCreation:'1995',effectif:22,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a11',prenom:'Patience',nom:'Ayo',role:'joueur',sport:'Basketball',ville:'Libreville',poste:'Meneur',club:'GBC Basketball Club',niveau:'National',matchsJoues:80,buts:320,passes:95,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a12',prenom:'Ibrahim',nom:'Diallo',role:'joueur',sport:'Handball',ville:'Franceville',poste:'Pivot',club:'ARC Handball',niveau:'Regional',matchsJoues:55,buts:120,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a13',prenom:'Christelle',nom:'Ndong',role:'joueur',sport:'Athlétisme',ville:'Libreville',poste:'Sprint',niveau:'National',matchsJoues:30,trophees:3,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a14',prenom:'',nom:'',role:'association',sport:'Multi-sports',ville:'Oyem',nomOrganisation:'Association Sport Woleu-Ntem',typeOrganisation:'Association',president:'Théodore Minko',anneeCreation:'2005',effectif:150,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a15',prenom:'Rodrigue',nom:'Ekomi',role:'entraineur',sport:'Basketball',ville:'Libreville',poste:'Coach principal',club:'GBC Basketball Club',niveau:'National',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a16',prenom:'Sylvain',nom:'Mbong',role:'joueur',sport:'Football',ville:'Oyem',poste:'Défenseur central',club:'Mangasport',niveau:'National',matchsJoues:95,buts:5,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a17',prenom:'',nom:'',role:'club',sport:'Football',ville:'Oyem',nomOrganisation:'Mangasport FC',typeOrganisation:'Club sportif',president:'Jules Obame',anneeCreation:'1975',effectif:32,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a18',prenom:'Gaëlle',nom:'Oluma',role:'joueur',sport:'Volleyball',ville:'Libreville',poste:'Passeuse',club:'Libreville Volleyball Club',niveau:'National',matchsJoues:60,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a19',prenom:'Patrice',nom:'Nguema',role:'arbitre',sport:'Basketball',ville:'Libreville',poste:'Arbitre central',niveau:'National',licenceNumero:'GAB-ARB-002',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a20',prenom:'',nom:'',role:'federation',sport:'Basketball',ville:'Libreville',nomOrganisation:'Fédération Gabonaise de Basketball',typeOrganisation:'Fédération',president:'Roger Essono',anneeCreation:'1960',niveau:'National',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a21',prenom:'Etienne',nom:'Akomo',role:'joueur',sport:'Football',ville:'Port-Gentil',poste:'Gardien de but',club:'AS Stade Mandji',niveau:'National',matchsJoues:60,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a22',prenom:'Josée',nom:'Obono',role:'joueur',sport:'Athlétisme',ville:'Franceville',poste:'Saut en longueur',niveau:'Regional',matchsJoues:20,trophees:2,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a23',prenom:'Fabrice',nom:'Ebang',role:'entraineur',sport:'Football',ville:'Port-Gentil',poste:'Adjoint',club:'AS Stade Mandji',niveau:'National',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a24',prenom:'Ange',nom:'Minkono',role:'joueur',sport:'Football',ville:'Oyem',poste:'Attaquant',club:'Mangasport FC',niveau:'National',matchsJoues:72,buts:18,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a25',prenom:'Marcel',nom:'Makinda',role:'arbitre',sport:'Football',ville:'Franceville',poste:'Arbitre de touche',niveau:'National',licenceNumero:'GAB-ARB-003',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a26',prenom:'Carine',nom:'Edja',role:'joueur',sport:'Volleyball',ville:'Port-Gentil',poste:'Opposante',club:'Libreville Volleyball Club',niveau:'Regional',matchsJoues:35,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a27',prenom:'',nom:'',role:'club',sport:'Handball',ville:'Franceville',nomOrganisation:'ARC Handball',typeOrganisation:'Club sportif',president:'François Ondonda',anneeCreation:'1985',effectif:20,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a28',prenom:'Charles',nom:'Obambi',role:'joueur',sport:'Basketball',ville:'Port-Gentil',poste:'Ailier',club:'GBC Basketball Club',niveau:'National',matchsJoues:65,buts:280,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a29',prenom:'Sophie',nom:'Mboui',role:'joueur',sport:'Athlétisme',ville:'Libreville',poste:'100m',niveau:'National',matchsJoues:15,trophees:1,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a30',prenom:'Antoine',nom:'Ndiaye',role:'entraineur',sport:'Handball',ville:'Franceville',poste:'Coach principal',club:'ARC Handball',niveau:'Regional',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a31',prenom:'',nom:'',role:'association',sport:'Football',ville:'Libreville',nomOrganisation:'Fédération Gabonaise de Football',typeOrganisation:'Fédération',president:'Patrice Akossi',anneeCreation:'1962',effectif:500,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a32',prenom:'Serge',nom:'Essamba',role:'joueur',sport:'Football',ville:'Libreville',poste:'Défenseur latéral',club:'FC 105 Libreville',niveau:'National',matchsJoues:88,buts:2,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a33',prenom:'Henriette',nom:'Mengue',role:'joueur',sport:'Basketball',ville:'Franceville',poste:'Pivot',club:'GBC Basketball Club',niveau:'Regional',matchsJoues:45,buts:180,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a34',prenom:'Victor',nom:'Minko',role:'arbitre',sport:'Handball',ville:'Libreville',poste:'Arbitre central',niveau:'Regional',licenceNumero:'GAB-ARB-004',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a35',prenom:'Julienne',nom:'Awouala',role:'joueur',sport:'Athlétisme',ville:'Port-Gentil',poste:'Heptathlon',niveau:'Regional',matchsJoues:12,trophees:0,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a36',prenom:'Léandre',nom:'Ngoyi',role:'entraineur',sport:'Basketball',ville:'Port-Gentil',poste:'Coach adjoint',club:'GBC Basketball Club',niveau:'National',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a37',prenom:'',nom:'',role:'club',sport:'Football',ville:'Franceville',nomOrganisation:'FC Franceville United',typeOrganisation:'Club sportif',president:'Alain Bayart',anneeCreation:'1992',effectif:30,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a38',prenom:'Benjamin',nom:'Eyuafon',role:'joueur',sport:'Football',ville:'Franceville',poste:'Milieu offensif',club:'FC Franceville United',niveau:'Regional',matchsJoues:55,buts:9,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a39',prenom:'Thérèse',nom:'Makaya',role:'joueur',sport:'Volleyball',ville:'Franceville',poste:'Centrale',club:'Libreville Volleyball Club',niveau:'Regional',matchsJoues:28,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a40',prenom:'Michel',nom:'Nguila',role:'arbitre',sport:'Basketball',ville:'Port-Gentil',poste:'Arbitre',niveau:'Regional',licenceNumero:'GAB-ARB-005',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a41',prenom:'Francine',nom:'Kouma',role:'joueur',sport:'Athlétisme',ville:'Oyem',poste:'Marche athlétique',niveau:'Regional',matchsJoues:18,trophees:1,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a42',prenom:'Gérard',nom:'Ebouela',role:'entraineur',sport:'Football',ville:'Franceville',poste:'Coach principal',club:'FC Franceville United',niveau:'Regional',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a43',prenom:'',nom:'',role:'club',sport:'Basketball',ville:'Port-Gentil',nomOrganisation:'Port-Gentil Basketball Club',typeOrganisation:'Club sportif',president:'Modeste Okalla',anneeCreation:'2000',effectif:25,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a44',prenom:'Ronald',nom:'Ekoto',role:'joueur',sport:'Football',ville:'Oyem',poste:'Avant-centre',club:'Mangasport FC',niveau:'Regional',matchsJoues:42,buts:8,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a45',prenom:'Laurence',nom:'Yondo',role:'joueur',sport:'Handball',ville:'Libreville',poste:'Arrière',club:'ARC Handball',niveau:'Regional',matchsJoues:30,buts:65,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a46',prenom:'Philippe',nom:'Akandji',role:'arbitre',sport:'Volleyball',ville:'Libreville',poste:'Arbitre',niveau:'Regional',licenceNumero:'GAB-ARB-006',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a47',prenom:'Roseline',nom:'Lembi',role:'joueur',sport:'Basketball',ville:'Oyem',poste:'Meneur de jeu',club:'Port-Gentil Basketball Club',niveau:'Regional',matchsJoues:38,buts:150,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a48',prenom:'Armand',nom:'Asenga',role:'entraineur',sport:'Athlétisme',ville:'Libreville',poste:'Coach',club:'Federale',niveau:'National',status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a49',prenom:'',nom:'',role:'association',sport:'Athlétisme',ville:'Libreville',nomOrganisation:'Fédération Gabonaise d\'Athlétisme',typeOrganisation:'Fédération',president:'Marcelle Ndong',anneeCreation:'1970',effectif:300,status:'active',photoURL:''},
  {isDemo:true,uid:'seed-a50',prenom:'Fabio',nom:'Mahele',role:'joueur',sport:'Football',ville:'Port-Gentil',poste:'Ailier gauche',club:'AS Stade Mandji',niveau:'Regional',matchsJoues:50,buts:11,status:'active',photoURL:''},
];

window.GSC_SEED_ACTORS = GSC_SEED_ACTORS;
