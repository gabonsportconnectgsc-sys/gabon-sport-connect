// ═══════════════════════════════════════════════════════════════
// GSC SEED DATA — Profils de démonstration (jeu de données allégé)
// ═══════════════════════════════════════════════════════════════
// Ce fichier ne contient plus qu'un minimum de profils fictifs :
// - Les structures (clubs, fédérations, associations, organisateurs)
//   sont conservées intégralement pour la présentation publique.
// - Les acteurs individuels (joueurs, entraîneurs, arbitres, élèves/
//   étudiants, sportifs étrangers, indépendants, supporters) sont
//   réduits à UN profil réaliste et complet par catégorie, afin de
//   montrer le rendu de chaque type de fiche sans gonfler les
//   statistiques avec des données fictives en masse.
// - Un profil "Sportif handisport" a été ajouté (catégorie
//   auparavant vide).
//
// Marqués isDemo:true — affichage avec badge "DÉMO" dans l'annuaire.
// Ils sont automatiquement masqués (dédupliqués) dès qu'un vrai
// document Firestore portant le même uid existe.
//
// ⚠️ Données fictives à but de démonstration uniquement, à l'exception
// des informations publiques réelles sur la FEGAFOOT (président, année
// de création) déjà référencées ailleurs dans l'application.
// ═══════════════════════════════════════════════════════════════

const GSC_SEED_ACTORS = [
  {
    "uid": "seed_001",
    "id": "seed_001",
    "email": "vanessa.mengue0@gscdemo.ga",
    "pin": "0000",
    "prenom": "Vanessa",
    "nom": "Mengue",
    "role": "joueur",
    "sport": "Volleyball",
    "niveau": "Amateur",
    "ville": "Port-Gentil",
    "telephone": "+24106131244",
    "bio": "Athlète de volleyball basée à Port-Gentil.",
    "titrePersonnalise": "",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "gereParFederation": false,
    "isSupporter": false,
    "club": "AS Espoir Port-Gentil",
    "clubsPrecedents": "",
    "poste": "Pointu",
    "matchsJoues": 16,
    "buts": 0,
    "passes": 0,
    "trophees": 1,
    "taille": 174,
    "poids": 82,
    "pied": "",
    "main": "",
    "cartonsJaunes": 0,
    "cartonsRouges": 0,
    "mandats": [
      {
        "club": "AS Espoir Port-Gentil",
        "dateDebut": "2023-07-01",
        "dateFin": "",
        "poste": "Pointu"
      }
    ],
    "licenceNumero": "GA-VOL-1434",
    "licenceExpire": "2027-06-30",
    "disponibilite": "sous_contrat",
    "documents": [
      {
        "label": "Carte d'identité / passeport",
        "url": "#",
        "locked": false
      },
      {
        "label": "Licence sportive GA-VOL-1434",
        "url": "#",
        "locked": true
      },
      {
        "label": "Contrat club en cours",
        "url": "#",
        "locked": true
      }
    ]
  },
  {
    "uid": "seed_004",
    "id": "seed_004",
    "email": "romaric.engonga3@gscdemo.ga",
    "pin": "0000",
    "prenom": "Romaric",
    "nom": "Engonga",
    "role": "entraineur",
    "sport": "Tennis",
    "niveau": "Amateur",
    "ville": "Port-Gentil",
    "telephone": "+24106793384",
    "bio": "Entraîneur de tennis basé à Port-Gentil.",
    "titrePersonnalise": "",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "gereParFederation": false,
    "isSupporter": false,
    "club": "",
    "clubsPrecedents": "",
    "poste": "Coach",
    "matchsJoues": 0,
    "buts": 0,
    "passes": 0,
    "trophees": 0,
    "taille": 0,
    "poids": 0,
    "pied": "",
    "main": "",
    "cartonsJaunes": 0,
    "cartonsRouges": 0,
    "mandats": [],
    "licenceNumero": "GA-TEN-4733",
    "licenceExpire": "2027-06-30",
    "disponibilite": "",
    "documents": [
      {
        "label": "Carte d'identité / passeport",
        "url": "#",
        "locked": false
      },
      {
        "label": "Licence sportive GA-TEN-4733",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_005",
    "id": "seed_005",
    "email": "romaric.mengue4@gscdemo.ga",
    "pin": "0000",
    "prenom": "Romaric",
    "nom": "Mengue",
    "role": "arbitre",
    "sport": "Football",
    "niveau": "Regional",
    "ville": "Tchibanga",
    "telephone": "+24107488162",
    "bio": "Arbitre de football basé à Tchibanga.",
    "titrePersonnalise": "",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "gereParFederation": false,
    "isSupporter": false,
    "club": "",
    "clubsPrecedents": "",
    "poste": "Arbitre de touche",
    "matchsJoues": 0,
    "buts": 0,
    "passes": 0,
    "trophees": 0,
    "taille": 0,
    "poids": 0,
    "pied": "",
    "main": "",
    "cartonsJaunes": 0,
    "cartonsRouges": 0,
    "mandats": [],
    "licenceNumero": "GA-FOO-6820",
    "licenceExpire": "2027-06-30",
    "disponibilite": "",
    "documents": [
      {
        "label": "Carte d'identité / passeport",
        "url": "#",
        "locked": false
      },
      {
        "label": "Licence sportive GA-FOO-6820",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_041",
    "id": "seed_041",
    "email": "mamadou.eyeghe100@gscdemo.ga",
    "pin": "0000",
    "prenom": "Mamadou",
    "nom": "Eyeghe",
    "role": "eleve_etudiant",
    "sport": "Natation",
    "niveau": "Amateur",
    "ville": "Libreville",
    "telephone": "+24104571932",
    "bio": "Sportif-étudiant en natation au Collège Bessieux, section sportive.",
    "titrePersonnalise": "",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "club": "",
    "poste": "",
    "taille": 0,
    "poids": 0,
    "mandats": [],
    "licenceNumero": "",
    "licenceExpire": "",
    "niveauScolaire": "Terminale",
    "etablissement": "Collège Bessieux",
    "filiere": "Sciences",
    "etablissementVille": "Libreville",
    "etablissementLat": null,
    "etablissementLng": null,
    "statutSportifScolaire": true,
    "isSupporter": false,
    "documents": [
      {
        "label": "Carte d'identité / passeport",
        "url": "#",
        "locked": false
      },
      {
        "label": "Certificat de scolarité — Collège Bessieux",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_051",
    "id": "seed_051",
    "email": "mathurin.nguema200@gscdemo.ga",
    "pin": "0000",
    "prenom": "Mathurin",
    "nom": "Nguema",
    "role": "sportif_etranger",
    "sport": "Volleyball",
    "niveau": "International",
    "ville": "Moanda",
    "telephone": "+24106593152",
    "bio": "Sportif étranger (volleyball) évoluant au Gabon.",
    "titrePersonnalise": "",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "club": "AS Espoir Port-Gentil",
    "poste": "Central",
    "taille": 166,
    "poids": 94,
    "mandats": [
      {
        "club": "AS Espoir Port-Gentil",
        "dateDebut": "2024-01-01",
        "dateFin": "",
        "poste": "Central"
      }
    ],
    "licenceNumero": "INT-1853",
    "licenceExpire": "2027-06-30",
    "nationalite": "Béninoise",
    "statutPro": "Sous contrat",
    "employeur": "AS Espoir Port-Gentil",
    "documentType": "Licence FIFA/fédération internationale",
    "documentNumero": "335113",
    "documentVerifie": false,
    "liensVerification": {
      "fifaTms": "https://tms.fifa.com",
      "transfermarkt": "https://www.transfermarkt.com",
      "caf": "https://www.cafonline.com"
    },
    "isSupporter": false,
    "documents": [
      {
        "label": "Passeport",
        "url": "#",
        "locked": false
      },
      {
        "label": "Licence FIFA/fédération internationale",
        "url": "#",
        "locked": true
      },
      {
        "label": "Contrat — AS Espoir Port-Gentil",
        "url": "#",
        "locked": true
      }
    ]
  },
  {
    "uid": "seed_059",
    "id": "seed_059",
    "email": "fc.contact300@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "club",
    "sport": "Football",
    "niveau": "National",
    "ville": "Libreville",
    "telephone": "+24105363615",
    "bio": "Club sportif basée à Libreville, discipline : Football.",
    "titrePersonnalise": "Manager général",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "FC 105 (FC Canon Libreville)",
    "typeOrganisation": "Club sportif",
    "anneeCreation": "2004",
    "president": "Mathurin Engonga",
    "adresse": "Quartier Akébé, Libreville",
    "siteWeb": "",
    "sports": [
      "Football"
    ],
    "effectif": 50,
    "palmares": "Vainqueur de coupe 2019",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_060",
    "id": "seed_060",
    "email": "as.contact301@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "club",
    "sport": "Football",
    "niveau": "Regional",
    "ville": "Port-Gentil",
    "telephone": "+24107326895",
    "bio": "Club sportif basée à Port-Gentil, discipline : Football.",
    "titrePersonnalise": "Trésorier",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "AS Stade Mandji",
    "typeOrganisation": "Club sportif",
    "anneeCreation": "2009",
    "president": "Bruno Ndoutoume",
    "adresse": "Quartier PK8, Port-Gentil",
    "siteWeb": "",
    "sports": [
      "Football"
    ],
    "effectif": 143,
    "palmares": "Finaliste régional 2023",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_061",
    "id": "seed_061",
    "email": "as.contact302@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "club",
    "sport": "Football",
    "niveau": "National",
    "ville": "Moanda",
    "telephone": "+24106973074",
    "bio": "Club sportif basée à Moanda, discipline : Football.",
    "titrePersonnalise": "Manager général",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "AS Mangasport",
    "typeOrganisation": "Club sportif",
    "anneeCreation": "2013",
    "president": "Franck Ibinga",
    "adresse": "Quartier Akébé, Moanda",
    "siteWeb": "",
    "sports": [
      "Football"
    ],
    "effectif": 95,
    "palmares": "Vainqueur de coupe 2019",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_062",
    "id": "seed_062",
    "email": "bc.contact303@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "club",
    "sport": "Basketball",
    "niveau": "Regional",
    "ville": "Libreville",
    "telephone": "+24105147726",
    "bio": "Club sportif basée à Libreville, discipline : Basketball.",
    "titrePersonnalise": "Trésorier",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "BC Libreville",
    "typeOrganisation": "Club sportif",
    "anneeCreation": "1975",
    "president": "Aaron Mavoungou",
    "adresse": "Quartier Glass, Libreville",
    "siteWeb": "",
    "sports": [
      "Basketball"
    ],
    "effectif": 161,
    "palmares": "Finaliste régional 2023",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_063",
    "id": "seed_063",
    "email": "hc.contact304@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "club",
    "sport": "Handball",
    "niveau": "Regional",
    "ville": "Franceville",
    "telephone": "+24106701949",
    "bio": "Club sportif basée à Franceville, discipline : Handball.",
    "titrePersonnalise": "Secrétaire général",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "HC Franceville",
    "typeOrganisation": "Club sportif",
    "anneeCreation": "2006",
    "president": "Aubin Allogo",
    "adresse": "Quartier Nzeng-Ayong, Franceville",
    "siteWeb": "",
    "sports": [
      "Handball"
    ],
    "effectif": 140,
    "palmares": "—",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_064",
    "id": "seed_064",
    "email": "us.contact305@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "club",
    "sport": "Football",
    "niveau": "National",
    "ville": "Bitam",
    "telephone": "+24104219629",
    "bio": "Club sportif basée à Bitam, discipline : Football.",
    "titrePersonnalise": "Directeur sportif",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "US Bitam",
    "typeOrganisation": "Club sportif",
    "anneeCreation": "1978",
    "president": "Mathurin Boukandou",
    "adresse": "Quartier Glass, Bitam",
    "siteWeb": "",
    "sports": [
      "Football"
    ],
    "effectif": 122,
    "palmares": "—",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_065",
    "id": "seed_065",
    "email": "association.contact306@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "association",
    "sport": "Multi-sports",
    "niveau": "Regional",
    "ville": "Libreville",
    "telephone": "+24107256445",
    "bio": "Association basée à Libreville, discipline : Multi-sports.",
    "titrePersonnalise": "Président",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "Association Sport et Insertion Gabon",
    "typeOrganisation": "Association",
    "anneeCreation": "2018",
    "president": "Landry Diallo",
    "adresse": "Quartier Batavéa, Libreville",
    "siteWeb": "",
    "sports": [
      "Multi-sports"
    ],
    "effectif": 97,
    "palmares": "Champion national 2021",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_066",
    "id": "seed_066",
    "email": "association.contact307@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "association",
    "sport": "Multi-sports",
    "niveau": "Regional",
    "ville": "Libreville",
    "telephone": "+24104572398",
    "bio": "Association basée à Libreville, discipline : Multi-sports.",
    "titrePersonnalise": "Secrétaire général",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "Association des Arbitres du Gabon",
    "typeOrganisation": "Association",
    "anneeCreation": "2001",
    "president": "Bruno Mouele",
    "adresse": "Quartier Louis, Libreville",
    "siteWeb": "",
    "sports": [
      "Multi-sports"
    ],
    "effectif": 96,
    "palmares": "—",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_067",
    "id": "seed_067",
    "email": "association.contact308@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "association",
    "sport": "Judo",
    "niveau": "Regional",
    "ville": "Port-Gentil",
    "telephone": "+24107755900",
    "bio": "Association basée à Port-Gentil, discipline : Judo.",
    "titrePersonnalise": "Trésorier",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "Association Gabonaise de Judo Loisir",
    "typeOrganisation": "Association",
    "anneeCreation": "1978",
    "president": "Landry Bouanga",
    "adresse": "Quartier Akébé, Port-Gentil",
    "siteWeb": "",
    "sports": [
      "Judo"
    ],
    "effectif": 87,
    "palmares": "Champion national 2021",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_068",
    "id": "seed_068",
    "email": "federation.contact309@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "federation",
    "sport": "Football",
    "niveau": "National",
    "ville": "Libreville",
    "telephone": "+24107282256",
    "bio": "Fédération basée à Libreville, discipline : Football.",
    "titrePersonnalise": "Président",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "Fédération Gabonaise de Football (FEGAFOOT)",
    "typeOrganisation": "Fédération",
    "anneeCreation": "1962",
    "president": "Pierre Alain Mounguengui",
    "adresse": "Quartier Batavéa, Libreville",
    "siteWeb": "",
    "sports": [
      "Football"
    ],
    "effectif": 39,
    "palmares": "Vainqueur de coupe 2019",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      },
      {
        "label": "Agrément ministériel",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_069",
    "id": "seed_069",
    "email": "federation.contact310@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "federation",
    "sport": "Basketball",
    "niveau": "National",
    "ville": "Libreville",
    "telephone": "+24104405407",
    "bio": "Fédération basée à Libreville, discipline : Basketball.",
    "titrePersonnalise": "Président",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "Fédération Gabonaise de Basketball (FGBB)",
    "typeOrganisation": "Fédération",
    "anneeCreation": "2013",
    "president": "Brel Oyane",
    "adresse": "Quartier Glass, Libreville",
    "siteWeb": "",
    "sports": [
      "Basketball"
    ],
    "effectif": 79,
    "palmares": "Finaliste régional 2023",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      },
      {
        "label": "Agrément ministériel",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_070",
    "id": "seed_070",
    "email": "federation.contact311@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "federation",
    "sport": "Handball",
    "niveau": "National",
    "ville": "Libreville",
    "telephone": "+24106820775",
    "bio": "Fédération basée à Libreville, discipline : Handball.",
    "titrePersonnalise": "Directeur technique national",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "Fédération Gabonaise de Handball (FGHB)",
    "typeOrganisation": "Fédération",
    "anneeCreation": "2004",
    "president": "Junior Allogo",
    "adresse": "Quartier Akébé, Libreville",
    "siteWeb": "",
    "sports": [
      "Handball"
    ],
    "effectif": 87,
    "palmares": "Vainqueur de coupe 2019",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      },
      {
        "label": "Agrément ministériel",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_071",
    "id": "seed_071",
    "email": "federation.contact312@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "federation",
    "sport": "Athlétisme",
    "niveau": "National",
    "ville": "Libreville",
    "telephone": "+24107378535",
    "bio": "Fédération basée à Libreville, discipline : Athlétisme.",
    "titrePersonnalise": "Responsable des compétitions",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "Fédération Gabonaise d'Athlétisme (FGA)",
    "typeOrganisation": "Fédération",
    "anneeCreation": "1989",
    "president": "Bruno Mouele",
    "adresse": "Quartier Akébé, Libreville",
    "siteWeb": "",
    "sports": [
      "Athlétisme"
    ],
    "effectif": 38,
    "palmares": "Champion national 2021",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      },
      {
        "label": "Agrément ministériel",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_072",
    "id": "seed_072",
    "email": "gabon.contact313@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "organisateur",
    "sport": "Multi-sports",
    "niveau": "National",
    "ville": "Libreville",
    "telephone": "+24104230394",
    "bio": "Organisation d'évènements basée à Libreville, discipline : Multi-sports.",
    "titrePersonnalise": "Organisateur principal",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "Gabon Events Sport",
    "typeOrganisation": "Organisation d'évènements",
    "anneeCreation": "2013",
    "president": "Hervé Mavoungou",
    "adresse": "Quartier Louis, Libreville",
    "siteWeb": "",
    "sports": [
      "Multi-sports"
    ],
    "effectif": 196,
    "palmares": "Finaliste régional 2023",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_073",
    "id": "seed_073",
    "email": "ogooue.contact314@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "organisateur",
    "sport": "Multi-sports",
    "niveau": "National",
    "ville": "Port-Gentil",
    "telephone": "+24104184349",
    "bio": "Organisation d'évènements basée à Port-Gentil, discipline : Multi-sports.",
    "titrePersonnalise": "Responsable logistique",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "Ogooué Sport Organisation",
    "typeOrganisation": "Organisation d'évènements",
    "anneeCreation": "2007",
    "president": "Anicet Bivigou",
    "adresse": "Quartier Batavéa, Port-Gentil",
    "siteWeb": "",
    "sports": [
      "Multi-sports"
    ],
    "effectif": 30,
    "palmares": "—",
    "isSupporter": false,
    "documents": [
      {
        "label": "Statuts de l'organisation",
        "url": "#",
        "locked": false
      },
      {
        "label": "Récépissé d'enregistrement",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_079",
    "id": "seed_079",
    "email": "anicet.nguema500@gscdemo.ga",
    "pin": "0000",
    "prenom": "Anicet",
    "nom": "Nguema",
    "role": "independant",
    "sport": "Tennis",
    "niveau": "Regional",
    "ville": "Franceville",
    "telephone": "+24105910208",
    "bio": "Sportif indépendant de tennis basé à Franceville — spécialité Simple.",
    "titrePersonnalise": "",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "gereParFederation": false,
    "isSupporter": false,
    "club": "",
    "clubsPrecedents": "",
    "poste": "Simple",
    "matchsJoues": 106,
    "buts": 0,
    "passes": 0,
    "trophees": 3,
    "taille": 0,
    "poids": 0,
    "pied": "",
    "main": "",
    "cartonsJaunes": 0,
    "cartonsRouges": 0,
    "mandats": [],
    "licenceNumero": "GA-TEN-6568",
    "licenceExpire": "2027-06-30",
    "disponibilite": "disponible",
    "documents": [
      {
        "label": "Carte d'identité / passeport",
        "url": "#",
        "locked": false
      },
      {
        "label": "Licence sportive GA-TEN-6568",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_083",
    "id": "seed_083",
    "email": "fabrice.mba83@gscdemo.ga",
    "pin": "0000",
    "prenom": "Fabrice",
    "nom": "Mba",
    "role": "supporter",
    "sport": "Football",
    "niveau": "",
    "ville": "Oyem",
    "telephone": "+24123341057",
    "bio": "Supporter fidèle du FC 105 (FC Canon Libreville).",
    "titrePersonnalise": "",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "club": "",
    "poste": "",
    "taille": 0,
    "poids": 0,
    "mandats": [],
    "licenceNumero": "",
    "licenceExpire": "",
    "clubSupporte": "FC 105 (FC Canon Libreville)",
    "supporterSaisons": 1,
    "supporterMatchs": 99,
    "supporterAbonnement": "Abonné saison 2025-2026",
    "isSupporter": true,
    "documents": [
      {
        "label": "Carte d'identité / passeport",
        "url": "#",
        "locked": false
      },
      {
        "label": "Carte de membre — FC 105 (FC Canon Libreville)",
        "url": "#",
        "locked": false
      }
    ]
  },
  {
    "uid": "seed_h01",
    "id": "seed_h01",
    "email": "judith.akendengue@gscdemo.ga",
    "pin": "0000",
    "prenom": "Judith",
    "nom": "Akendengué",
    "role": "handisport",
    "sport": "Athlétisme handisport",
    "niveau": "National",
    "ville": "Libreville",
    "telephone": "+24107845512",
    "bio": "Athlète handisport spécialisée en sprint (100m/200m), licenciée au Comité Paralympique Gabonais. Pratique l'athlétisme en fauteuil depuis 2019 et représente le Gabon lors des compétitions sous-régionales.",
    "titrePersonnalise": "",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "gereParFederation": false,
    "isSupporter": false,
    "club": "Comité Paralympique Gabonais",
    "clubsPrecedents": "",
    "poste": "Sprint (T54)",
    "matchsJoues": 0,
    "buts": 0,
    "passes": 0,
    "trophees": 2,
    "taille": 168,
    "poids": 58,
    "pied": "",
    "main": "",
    "cartonsJaunes": 0,
    "cartonsRouges": 0,
    "mandats": [
      {
        "club": "Comité Paralympique Gabonais",
        "dateDebut": "2019-09-01",
        "dateFin": "",
        "poste": "Sprint (T54)"
      }
    ],
    "licenceNumero": "GA-HAND-1102",
    "licenceExpire": "2027-06-30",
    "disponibilite": "disponible",
    "documents": [
      {
        "label": "Carte d'identité / passeport",
        "url": "#",
        "locked": false
      },
      {
        "label": "Licence sportive GA-HAND-1102",
        "url": "#",
        "locked": true
      },
      {
        "label": "Certificat médical d'aptitude",
        "url": "#",
        "locked": true
      }
    ],
    "handicapCategorie": "motrice_moelle",
    "handicapPrecision": "Paraplégie — pratique en fauteuil (classification T54)"
  },
  {
    "uid": "seed_e01",
    "id": "seed_e01",
    "email": "sport.uob@gscdemo.ga",
    "pin": "0000",
    "prenom": "",
    "nom": "",
    "role": "ecole_universite",
    "sport": "Multi-sports",
    "niveau": "National",
    "ville": "Libreville",
    "telephone": "+24101732845",
    "bio": "Service des sports de l'Université Omar Bongo (UOB), en charge de l'animation et de la compétition sportive universitaire (championnats inter-facultés et inter-universitaires).",
    "titrePersonnalise": "Responsable du service des sports",
    "photoURL": "",
    "status": "active",
    "isDemo": true,
    "nomOrganisation": "Université Omar Bongo (UOB)",
    "typeOrganisation": "Établissement scolaire/universitaire",
    "anneeCreation": "1970",
    "president": "Pr. Onkoba Tom Aimé",
    "adresse": "Quartier Libreville-Nord, Libreville",
    "siteWeb": "",
    "sports": [
      "Football",
      "Basketball",
      "Athlétisme",
      "Volleyball"
    ],
    "effectif": 32000,
    "palmares": "Vice-champion du tournoi inter-universitaire CAMES 2023.",
    "isSupporter": false,
    "typeEtablissement": "Université",
    "statutEtablissement": "Public",
    "effectifSportif": 850,
    "disciplinesProposees": [
      "Football",
      "Basketball",
      "Athlétisme",
      "Volleyball",
      "Judo"
    ],
    "infrastructures": "Stade omnisports universitaire, gymnase couvert, terrains de basketball et de volleyball en plein air, piste d'athlétisme.",
    "responsableSports": "Pr. Onkoba Tom Aimé",
    "documents": [
      {
        "label": "Statuts de l'établissement",
        "url": "#",
        "locked": false
      },
      {
        "label": "Autorisation ministérielle (Enseignement supérieur)",
        "url": "#",
        "locked": true
      }
    ]
  }
];

window.GSC_SEED_ACTORS = GSC_SEED_ACTORS;
