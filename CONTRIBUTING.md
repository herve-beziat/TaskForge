
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

### Linter et formatter

| Outil | Rôle | Portée |
|---|---|---|
| **ESLint** | Analyse statique, détection d'erreurs et d'anti-patterns | `frontend/` et `backend/` |
| **Prettier** | Formatage automatique (indentation, guillemets, points-virgules) | Tout le dépôt |

La configuration est partagée entre le front et le back : un seul langage (TypeScript), donc un seul jeu de règles.

```bash
make lint        # vérifie lint + format sur tout le dépôt
```

### Pre-commit hook

Un hook **husky** + **lint-staged** s'exécute automatiquement à chaque `git commit` et **bloque le commit** si le code ne respecte pas les règles.

Le hook :

1. Applique Prettier sur les fichiers stagés (formatage automatique)
2. Lance ESLint sur ces mêmes fichiers et échoue si une erreur subsiste
3. Vérifie le format du message de commit (Conventional Commits) via **commitlint**

L'installation est automatique : le script `prepare` de `package.json` déclenche `husky install` au `npm install`. Aucune manipulation manuelle nécessaire après un clone.

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
