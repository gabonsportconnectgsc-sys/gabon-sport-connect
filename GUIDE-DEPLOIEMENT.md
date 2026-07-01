# Guide de déploiement — Gabon Sport Connect

Ce document indique où déposer chaque fichier selon ce qu'il modifie.
À consulter avant chaque upload sur GitHub.

---

## 1. Je modifie quoi ?

| Je travaille sur...                                              | Page concernée   |
|--------------------------------------------------------------------|-------------------|
| L'application publique (accueil, annuaire, profil, carte, actus)  | `index.html`      |
| La console d'administration complète                              | `admin.html`      |

---

## 2. Où déposer le fichier CSS ?

Tous les fichiers CSS vont dans le dossier **`css/`** à la racine du dépôt,
qu'ils concernent l'app ou l'admin. Le bon fichier dépend du **type de style**,
pas de la page :

| Fichier                  | Contenu concerné                                      | Utilisé par        |
|---------------------------|---------------------------------------------------------|----------------------|
| `css/base.css`            | Variables (`:root`), reset, styles génériques           | `index.html`         |
| `css/layout.css`          | Header, navigation, side-menu, structure de page         | `index.html`         |
| `css/buttons.css`         | Boutons, filtres, pills, actions                          | `index.html`         |
| `css/dashboard.css`       | Tableau de bord, stat cards                               | `index.html`         |
| `css/profile.css`         | Profil, édition, mandats                                   | `index.html`         |
| `css/admin.css`           | Styles de la console admin                                 | `admin.html`         |

Si le style ne correspond à aucune ligne ci-dessus : créer un nouveau fichier
dans `css/` avec un nom clair (ex: `css/qr.css`, `css/map.css`), et l'ajouter
à ce tableau.

---

## 3. Où déposer le fichier JS ?

Même logique : un fichier JS par fonctionnalité, jamais de code ajouté dans
le `<script>` inline de `index.html` ou `admin.html`. Nom de fichier explicite
selon la fonctionnalité (ex: `gsc-notifications.js`, `admin-cms.js`).

- Fichiers utilisés par l'app publique → racine du dépôt, préfixe libre (`gsc-*.js`)
- Fichiers utilisés par la console admin → racine du dépôt, préfixe `admin-*.js`

---

## 4. Comment uploader sur GitHub (mobile)

1. Ouvre le dépôt `gabon-sport-connect` sur github.com
2. **Entre dans le dossier de destination** (ex: clique sur `css/` si c'est un fichier CSS)
3. Bouton **"Ajouter un fichier"** → **"Téléverser des fichiers"**
4. Sélectionne le fichier depuis ton stockage
5. Commit

⚠️ Si tu restes à la racine du dépôt sans entrer dans `css/`, le fichier sera
uploadé à la racine par erreur — toujours vérifier le fil d'Ariane en haut
(`gabon-sport-connect / css`) avant de téléverser.

---

## 5. Vérification après déploiement

- Attendre 1 à 2 minutes que GitHub Pages republie le site (onglet **Actions**
  ou **Déploiements** du dépôt)
- Recharger le site en forçant le cache (appui long sur le bouton actualiser)
- Vérifier que le rendu visuel n'a pas changé ailleurs que la zone modifiée
