# Instructions pour Claude Code

Ce fichier donne à Claude Code le contexte permanent du projet.
Lisez-le avant toute modification.

## Vue d'ensemble

**Dépôt Manager** : application web React (Vite) pour optimiser le rangement
d'un dépôt en fonction de la rotation des produits.

L'utilisateur est un gestionnaire de dépôt non-développeur. Le code doit rester
lisible, simple, et bien commenté en français.

## Conventions de code

- **JavaScript** (pas TypeScript pour l'instant — garder l'apprentissage simple)
- **Composants React fonctionnels** avec hooks (`useState`, `useEffect`, `useMemo`)
- **Styles** : inline styles + classes CSS dans `src/styles.css` (pas de Tailwind ni styled-components pour rester proche du HTML/CSS natif)
- **Pas de framework de state global** (Redux, Zustand…) — la prop drilling est ok à cette échelle
- **Commentaires en français**, noms de variables en anglais ou français au choix mais cohérents
- **Pas de dépendances supplémentaires** sans en discuter (`recharts` est déjà là pour les graphes)

## Architecture

- `src/lib/storage.js` est la **seule** couche d'accès aux données. Toute persistance passe par là.
  Si on change de backend (localStorage → API → Supabase), on touche **uniquement** ce fichier.
- `src/lib/optimization.js` contient toute la logique métier de calcul (score, distance, classification).
  Idéalement testable indépendamment des composants.
- `src/lib/constants.js` centralise les constantes (types de zones, seuils ABC).
- Les composants dans `src/components/` ne contiennent **pas** de logique de stockage —
  ils reçoivent les données et les callbacks de sauvegarde en props depuis `App.jsx`.

## Vocabulaire métier

- **Picking** : prélèvement d'un produit dans son emplacement
- **Packing** : emballage des commandes
- **Rotation** : fréquence de picking d'un produit (ici en picks/semaine)
- **Classification ABC** : segmentation des produits par rotation (A = top, D = bas)
- **PREP** : tables de préparation (centre névralgique — minimiser la distance vers ces tables est l'objectif)
- **Distance Manhattan** : distance à angles droits, |x1-x2| + |y1-y2|

## Workflow Git attendu

- Une branche `feat/xxx` ou `fix/xxx` par tâche
- Commits en français, courts, à l'impératif : `feat: ajout import Excel`, `fix: erreur lors du parsing CSV vide`
- Push, puis demander à l'utilisateur de relire avant merge

## Choses à éviter

- Ne pas réécrire toute l'app sans demander
- Ne pas introduire TypeScript sans accord explicite
- Ne pas ajouter de framework CSS lourd (Tailwind, Bootstrap…)
- Ne pas casser le format de données stocké en localStorage sans prévoir une migration
- Ne pas committer de données réelles (CSV de l'utilisateur) — voir `.gitignore`

## Améliorations prioritaires

1. Support de l'import Excel (.xlsx) via `xlsx` ou `exceljs`
2. Algorithme qui propose des **swaps concrets** entre emplacements (pas juste un score)
3. Migration vers Supabase pour le multi-poste
4. Tests unitaires sur `optimization.js` (Vitest)
