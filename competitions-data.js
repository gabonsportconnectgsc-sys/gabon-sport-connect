/* ==========================================================
   GSC — Calendrier de référence des compétitions (saison 2026-2027)
   Fichier dédié : js/competitions-data.js
   Données relevées en ligne le 21/10/2026 (sources dans chaque fiche).
   Les reports sont fréquents : vérifier avant diffusion et ajuster
   depuis l'admin (bouton « Synchroniser »).
   ========================================================== */
(function (global) {
  'use strict';

  var CAF_CLUBS = 'https://www.cafonline.com/fr/infos/la-caf-devoile-le-calendrier-de-la-totalenergies-caf-ligue-des-champions-et-de-la-totalenergies-caf-coupe-de-la-confederation-202627/';
  var CAN_CAF = 'https://www.cafonline.com/fr/can2025/infos/en-route-vers-l-afrique-de-l-est-la-caf-annonce-les-dates-du-match-d-ouverture-de-la-finale-et-des-eliminatoires-de-la-totalenergies-caf-coupe-d-afrique-des-nations-pamoja-2027/';
  var LUNION = 'https://www.union.sonapresse.com/fr/de-nouvelles-dates-pour-les-national-foot-1-et-national-foot-2';

  global.GSC_COMPETITIONS_REFERENCE = {
    version: '2026-10-21',
    competitions: [
      {
        id: 'ref-gab-nf1-2026-27', nom: 'National-Foot 1 (D1) 2026-2027', discipline: 'Football',
        portee: 'national', statut: 'confirme', organisateur: 'LINAFP', lieu: 'Gabon',
        debut: '2026-10-24', fin: '2027-05-22', couleur: '#1e88e5', source: LUNION,
        note: 'Coup d\'envoi reporté du 10 au 24 octobre 2026 ; 14 clubs. Reports fréquents ces dernières années.'
      },
      {
        id: 'ref-gab-nf2-2026-27', nom: 'National-Foot 2 (D2) 2026-2027', discipline: 'Football',
        portee: 'national', statut: 'confirme', organisateur: 'LINAFP', lieu: 'Gabon',
        debut: '2026-11-21', fin: '2027-04-10', couleur: '#43a047', source: LUNION,
        note: 'Démarre environ un mois après la D1.'
      },
      {
        id: 'ref-gab-coupe-ligue-2027', nom: 'Coupe de la Ligue 2027', discipline: 'Football',
        portee: 'national', statut: 'confirme', organisateur: 'LINAFP', lieu: 'Gabon',
        debut: '2027-01-02', fin: '2027-05-01', couleur: '#fb8c00', source: LUNION,
        note: 'Première édition, réservée aux clubs professionnels ; finale le 1er mai 2027.'
      },
      {
        id: 'ref-caf-clubs-2026-27', nom: 'Interclubs CAF 2026-27',
        discipline: 'Football', portee: 'international', statut: 'provisoire', organisateur: 'CAF', lieu: 'Afrique',
        couleur: '#8e24aa', source: CAF_CLUBS,
        note: 'Ligue des champions et Coupe de la Confédération : même calendrier. Dates exactes des finales à confirmer (entre le 9 et le 31 mai 2027).',
        periodes: [
          { debut: '2026-09-04', fin: '2026-09-13', label: 'Tour préliminaire 1' },
          { debut: '2026-10-16', fin: '2026-10-25', label: 'Tour préliminaire 2' },
          { debut: '2026-11-27', fin: '2027-01-24', label: 'Phase de groupes' },
          { debut: '2027-02-26', fin: '2027-03-07', label: 'Quarts de finale' },
          { debut: '2027-04-09', fin: '2027-04-18', label: 'Demi-finales' },
          { debut: '2027-05-09', fin: '2027-05-31', label: 'Finales (dates à confirmer)' }
        ]
      },
      {
        id: 'ref-can-2027', nom: 'CAN 2027', discipline: 'Football',
        portee: 'international', statut: 'confirme', organisateur: 'CAF', lieu: 'Kenya · Ouganda · Tanzanie',
        couleur: '#e53935', source: CAN_CAF,
        note: 'Le Gabon est dans le groupe A des éliminatoires (Maroc, Gabon, Niger, Lesotho).',
        periodes: [
          { debut: '2026-09-21', fin: '2026-10-06', label: 'Éliminatoires J1-J2' },
          { debut: '2026-11-09', fin: '2026-11-17', label: 'Éliminatoires J3-J4' },
          { debut: '2027-03-22', fin: '2027-03-30', label: 'Éliminatoires J5-J6' },
          { debut: '2027-06-19', fin: '2027-07-17', label: 'Phase finale' }
        ]
      },
      {
        id: 'ref-gab-nf1-2025-26', nom: 'National-Foot 1 (D1) 2026 — saison courte', discipline: 'Football',
        portee: 'national', statut: 'confirme', organisateur: 'LINAFP', lieu: 'Gabon',
        debut: '2026-03-07', fin: '2026-06-28', couleur: '#6d4c41',
        source: 'https://tvplusafrique.com/index.php?article=14542&page=detail-article&titre=NATIONAL-FOOT+1+%3A+14+CLUBS+EN+LICE+POUR+UNE+SAISON+EXPRESS',
        note: 'Édition terminée : lancée le 7 mars 2026, achevée le 28 juin ; AS Mangasport sacrée championne.'
      }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
