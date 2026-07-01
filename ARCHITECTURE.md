# Architecture CSS — Gabon Sport Connect

## Règle

Tout nouveau style ajouté au projet va dans un fichier CSS séparé du dossier `css/`.
Ne jamais ajouter de CSS dans le bloc `<style>` ou en inline de `index.html` / `admin.html`.

## Organisation des fichiers `css/`

| Fichier                  | Contenu                                              |
|---------------------------|-------------------------------------------------------|
| `css/base.css`            | Variables (`:root`), reset, styles génériques        |
| `css/layout.css`          | Header, navigation, side-menu, structure de page     |
| `css/buttons.css`         | Boutons, filtres, pills, actions                     |
| `css/dashboard.css`       | Tableau de bord, stat cards                          |
| `css/profile.css`         | Profil, édition, mandats                             |
| `css/admin.css`           | Console admin                                        |

Si un ajout ne correspond à aucune catégorie ci-dessus, créer un nouveau fichier dédié
dans `css/` (nom explicite, ex: `css/qr.css`, `css/map.css`) et l'ajouter à cette liste.

## Déploiement

Chaque nouveau fichier CSS doit être ajouté en `<link rel="stylesheet">` dans le
`<head>` de la page concernée, après les fichiers existants.

## Historique

- Le CSS d'origine (`index.html`) a été découpé une première fois en fichiers modulaires,
  mais un problème de déploiement a cassé le rendu (cause non confirmée : cache ou
  build). Rollback effectué vers le CSS inline le 01/07/2026.
- Les fichiers modulaires existent déjà dans `css/` mais ne sont pas encore utilisés.
- Toute nouvelle fonctionnalité doit suivre cette architecture dès sa création, sans
  attendre une migration complète de l'ancien CSS.
