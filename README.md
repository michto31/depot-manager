# Dépôt Manager

Application web d'optimisation du rangement et de la production en dépôt.
Permet de cartographier le dépôt, suivre les rotations de produits, mesurer la production quotidienne (picking/packing) et générer des recommandations d'optimisation.

## Stack

- **Vite** + **React 18** — frontend
- **Recharts** — graphiques
- **localStorage** — persistance locale (à remplacer par un backend pour usage multi-poste)

## Démarrage

Prérequis : **Node.js 18+** ([nodejs.org](https://nodejs.org))

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement (http://localhost:5173)
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview
```

## Structure du projet

```
depot-manager/
├── index.html               # Point d'entrée HTML
├── package.json             # Dépendances et scripts npm
├── vite.config.js           # Configuration Vite
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx             # Bootstrap React
    ├── App.jsx              # Composant racine (header, tabs, routing)
    ├── styles.css           # Styles globaux
    ├── lib/
    │   ├── constants.js     # Types de zones, seuils ABC
    │   ├── storage.js       # Couche persistance (à swap pour une API)
    │   └── optimization.js  # Calculs distance & score
    └── components/
        ├── Dashboard.jsx
        ├── MapEditor.jsx
        ├── ProductsView.jsx
        ├── StatsView.jsx
        ├── ImportView.jsx
        └── AIView.jsx
```

## Workflow Git

```bash
# Première fois — initialiser le dépôt
git init
git add .
git commit -m "Initial commit: MVP Dépôt Manager"

# Connecter un dépôt distant (GitHub/GitLab/Gitea)
git remote add origin git@github.com:votre-compte/depot-manager.git
git branch -M main
git push -u origin main

# Workflow quotidien
git checkout -b feat/import-excel
# ... modifications ...
git add .
git commit -m "feat: support des fichiers Excel"
git push -u origin feat/import-excel
```

## Travailler avec Claude Code

[Claude Code](https://docs.claude.com/en/docs/claude-code) est l'outil en ligne de commande qui permet de déléguer du code à Claude depuis le terminal.

### Installation

```bash
npm install -g @anthropic-ai/claude-code
```

### Lancer Claude Code dans le projet

```bash
cd depot-manager
claude
```

Claude lit l'ensemble du projet et peut éditer, créer, déplacer des fichiers, lancer des commandes, exécuter les tests, faire des commits Git, etc.

### Exemples de demandes utiles pour ce projet

- *"Ajoute le support des fichiers Excel (.xlsx) dans l'import, en plus du CSV"*
- *"Remplace la couche localStorage par une intégration Supabase (auth + table products + table stats)"*
- *"Implémente un vrai algorithme d'optimisation qui propose une liste de swaps à effectuer entre emplacements"*
- *"Ajoute une vue 'Plan de réagencement' qui montre, sur la carte, les flèches de déplacement à effectuer"*
- *"Ajoute des tests unitaires sur la fonction computeOptimizationScore avec Vitest"*
- *"Sépare le composant MapEditor en sous-composants (Toolbar, Grid, Legend)"*
- *"Ajoute un export CSV des statistiques et des produits avec leur classification ABC"*
- *"Implémente une authentification simple par mot de passe pour protéger l'accès"*

### CLAUDE.md (fichier d'instructions pour Claude Code)

Vous pouvez créer un fichier `CLAUDE.md` à la racine du projet pour donner à Claude Code un contexte permanent (conventions, choix d'architecture, etc.). Voir la doc Claude Code pour les détails.

## Données

Pour l'instant, toutes les données (layout, produits, stats) sont en **localStorage** dans le navigateur. C'est rapide pour démarrer, mais **pas partagé entre postes** et **lié au navigateur**.

Pour passer à du multi-poste, il suffit de remplacer le contenu de `src/lib/storage.js` par des appels à une API (ex : Supabase, Firebase, ou une API REST custom). Le reste du code n'a pas besoin de changer.

## Évolutions prévues

- [ ] Import Excel (.xlsx) en plus du CSV
- [ ] Backend (Supabase) pour multi-poste
- [ ] Algorithme d'optimisation : suggestion de swaps concrets
- [ ] Vue "Plan de réagencement" avec flèches de déplacement
- [ ] Authentification utilisateurs
- [ ] Export PDF des rapports
- [ ] Historique des changements de position des produits
- [ ] Prévisions de rotation par régression sur l'historique

## Licence

Privé — usage interne.
