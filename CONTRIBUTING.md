
# Contribuer à TaskForge

Ce document décrit l'environnement de développement, le workflow Git et la Definition of Done à respecter pour toute contribution au projet.

> **Note sur le contexte.** TaskForge est développé en solo. Les règles ci-dessous conservent la rigueur d'un workflow d'équipe (PR obligatoire, branches protégées, CI bloquante), mais l'étape de revue par un pair est remplacée par une auto-revue documentée et par des contrôles automatisés — voir [Revue de code en solo](#revue-de-code-en-solo).

## Prérequis

- Docker et Docker Compose
- `make`
- **Windows : WSL2 obligatoire.** Docker Desktop tourne déjà sur le backend WSL2, il n'y a donc aucune dépendance supplémentaire — il suffit de travailler depuis le terminal WSL et non PowerShell. Cloner le dépôt **dans** le système de fichiers WSL (`~/`) et non dans `/mnt/c/`, sinon les performances Docker s'effondrent et le hot-reload ne se déclenche pas.

## Démarrage

```bash
make init     # copie .env.example vers .env, installe les dépendances
make start    # lance la stack complète : frontend + backend + PostgreSQL
make help     # liste toutes les commandes disponibles
```

## Qualité de code

### Organisation

Le dépôt contient trois paquets npm : `backend/`, `frontend/`, et un paquet racine
qui ne porte que l'outillage transverse (husky, lint-staged, commitlint). Aucune
dépendance applicative ne doit être ajoutée au paquet racine.

```bash
npm run install:all    # installe les trois paquets
```

### Linter et formatter

| Outil | Rôle | Portée |
|---|---|---|
| **ESLint** | Analyse statique, détection d'erreurs et d'anti-patterns | `backend/` et `frontend/` |
| **Prettier** | Formatage (indentation, guillemets, points-virgules) | `backend/` et `frontend/` |
| **oxlint** | Pré-linter rapide, écrit en Rust | `frontend/` uniquement |

Chaque sous-projet conserve sa propre configuration : les règles utiles à une API
NestJS et à une application Vue ne se recouvrent qu'en partie.

`oxlint` n'est présent que sur le frontend, où le scaffolding Vue l'installe par
défaut. Il ne fait pas doublon avec ESLint : `eslint-plugin-oxlint` désactive dans
ESLint les règles qu'oxlint traite déjà. L'ajouter au backend n'apporterait aucun
gain mesurable sur une base de cette taille.

```bash
npm run lint           # vérifie sans modifier — ce que fait le hook
npm run lint:fix       # corrige ce qui peut l'être
npm run format         # reformate avec Prettier
npm run format:check   # vérifie le formatage sans modifier
```

### Pre-commit hook

Un hook **husky** + **lint-staged** s'exécute à chaque `git commit` et **bloque le
commit** si le code ne respecte pas les règles.

Le hook **vérifie sans corriger**. C'est délibéré : une correction automatique
modifierait des fichiers après leur indexation, et le commit contiendrait autre
chose que ce qui a été relu. En cas d'échec, `npm run lint:fix` et `npm run format`
règlent la plupart des cas.

Un second hook, sur `commit-msg`, valide le format du message via **commitlint**.

L'installation est automatique : le script `prepare` du `package.json` racine
déclenche husky au `npm install`. Aucune manipulation manuelle après un clone.

Si un hook doit être contourné exceptionnellement (jamais sur du code applicatif) :

```bash
git commit --no-verify
```

## Workflow Git

### Branches

| Branche | Rôle | Protection |
|---|---|---|
| `main` | Simule la production | Protégée, mise à jour uniquement via une release depuis `develop` |
| `develop` | Branche d'intégration, branche par défaut du dépôt | Protégée, PR obligatoire + CI verte avant merge |
| `feature/...`, `fix/...`, `chore/...` | Travail courant | Créées à partir de `develop` |

### Convention de nommage des branches

Les identifiants reprennent ceux du backlog (`pm/sprint-backlog.md`) :

- `feature/US-XX-description-courte` — user story (valeur métier)
- `chore/TECH-XX-description-courte` — enabler technique (Docker, CI, config, observabilité)
- `fix/description-courte` — correction de bug

Exemples : `feature/US-08-machine-a-etats-statuts`, `chore/TECH-03-dockerfiles-multi-stage`

### Convention de commits

Les commits suivent le format [Conventional Commits](https://www.conventionalcommits.org/) :

```
feat: ajoute la transition de statut avec validation des états autorisés
fix: corrige le calcul du temps moyen quand aucun ticket n'est résolu
test: ajoute les tests unitaires de la machine à états des tickets
docs: documente le gain de taille des images multi-stage
chore: configure le pipeline GitHub Actions (build, test, lint)
```

Types acceptés par commitlint : `build`, `chore`, `ci`, `docs`, `feat`, `fix`,
`perf`, `refactor`, `revert`, `style`, `test`. Le sujet doit commencer en
minuscule, ne pas se terminer par un point, et l'en-tête ne pas dépasser
100 caractères.

### Règles de contribution

1. Toute modification passe par une branche dédiée créée à partir de `develop`. **Aucun push direct sur `main` ou `develop`.**
2. Minimum 5 commits par branche de travail, sauf modification mineure (typo dans un doc) où 1 commit suffit.
3. Une fois le travail terminé : push de la branche, ouverture d'une Pull Request vers `develop` (le template s'affiche automatiquement).
4. Merge des PR vers `develop` : **Merge commit**. L'historique des commits est conservé, pas de squash — la granularité du travail reste visible.
5. Après merge : `git checkout develop && git pull`, puis suppression de la branche locale (`git branch -d <branche>`). La branche distante est supprimée automatiquement.
6. Mise à jour de `main` : PR `develop` → `main` à chaque release, taguée (ex. `v0.1.0`).

### Revue de code en solo

GitHub interdit d'approuver sa propre Pull Request. Exiger une approbation reviendrait donc à se verrouiller hors de son propre dépôt. La revue par un pair est remplacée par :

- **Contrôles de statut bloquants** — la CI (build, tests, lint) doit être verte avant que le merge soit possible. C'est la barrière automatisée, et elle n'est pas contournable.
- **Auto-revue explicite** — la PR est ouverte, le diff complet est relu dans l'interface GitHub avant merge. Ouvrir la PR et merger dans la foulée sans lire le diff vide l'exercice de son sens.
- **Délai minimal** — pas de merge dans la minute qui suit l'ouverture. Relire à froid fait remonter ce que la relecture à chaud laisse passer.

## Definition of Done

Une tâche n'est considérée comme terminée que si tous les critères suivants sont remplis. Cette liste est **strictement identique** à la checklist DoD du template de PR (`.github/pull_request_template.md`) — les deux documents ne doivent jamais diverger.

| Critère | Description |
|---|---|
| Les tests passent | `make test` est vert en local et en CI. |
| Le lint passe | `make lint` ne remonte aucune erreur. |
| La CI est verte | Le pipeline GitHub Actions est au vert sur la branche de la PR. |
| Aucun secret ni `.env` commité | Vérifié avant push. Seul `.env.example` est versionné. |
| Documentation à jour si le comportement change | README, `.env.example`, doc OpenAPI selon la nature du changement. |
| L'issue liée est référencée | La PR contient `Closes #XX` pour déclencher la fermeture automatique sur le board. |
| Le daily log et le burndown du jour sont à jour | `pm/daily-logs.md` et `pm/burndown.csv` renseignés. |

## Pull Requests

Chaque Pull Request doit :

- Cibler `develop` (jamais `main` directement)
- Référencer l'issue qu'elle résout (`Closes #XX`)
- Remplir la checklist DoD du template de PR (`.github/pull_request_template.md`)
- Avoir une CI verte
- Avoir fait l'objet d'une auto-revue du diff avant merge
