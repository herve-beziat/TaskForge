# Sprint backlog — TaskForge

Estimation en **story points (Fibonacci 1/2/3/5/8)**.
Préfixes : `US` = valeur métier · `TECH` = enabler technique · `USB` = bonus ("Pour aller plus loin").

- **Sprint 1** : mar 28 → dim 2 août (6 jours, week-end travaillé) · **Sprint 2** : lun 3 → jeu 6 août (4 jours)
- **Soutenance** : ven 7 août

---

## EPIC 0 — Fondations techniques `sprint-1`

Tout ce bloc est posé **jour 1-2**, sur une base vide. Rétrofitté jour 8, ça coûte trois fois plus cher.

| ID | Intitulé | Critères d'acceptation | SP |
|---|---|---|---|
| TECH01 | Bootstrap du dépôt | Structure imposée (`frontend/`, `backend/`, `docs/`, `pm/`), `.gitignore`, `.env.example`, README initial | 2 |
| TECH02 | `docker-compose.yml` dev | `docker-compose up` lance front + back + PostgreSQL ; hot-reload actif ; volumes montés | 3 |
| TECH03 | Dockerfiles multi-stage | Stage build + stage runtime ; user non-root ; `.dockerignore` ; tags versionnés (pas `:latest`) ; **taille avant/après documentée** | 3 |
| TECH04 | Lint & format | ESLint + Prettier partagés front/back ; pre-commit (husky + lint-staged) qui bloque les commits non conformes ; `CONTRIBUTING.md` | 2 |
| TECH05 | CI GitHub Actions | Sur chaque push : build, tests, lint | 2 |
| TECH06 | Makefile | `help`, `init` (copie `.env.example`), `start`, `stop`, `prod`, `test`, `lint` ; `.PHONY` partout | 1 |
| TECH07 | Logs JSON structurés | `nestjs-pino` ; champs min. `timestamp`, `level`, `message`, `request_id`, `user_id` ; volume Docker partagé | 3 |
| TECH08 | Health checks | `/health` backend (API + BDD via terminus), `/healthz` front, `healthcheck` dans compose avec restart auto | 2 |
| TECH09 | `/metrics` Prometheus | Tickets créés, temps moyen de réponse API, utilisateurs connectés | 3 |
| TECH10 | `docker-compose.prod.yml` | Images buildées, pas de volumes source, env de prod ; les 2 modes documentés dans le README | 2 |
| TECH22 | Reverse proxy Traefik | Routage par sous-domaines (`taskforge.localhost`, `api.taskforge.localhost`), découverte automatique par labels Docker, tableau de bord accessible ; ports applicatifs plus publiés directement | 3 |

**Sous-total : 26 SP**

> **TECH22 ajouté en cours de sprint 1 (28/07)**, à la demande de l'encadrant. Hors cahier des charges, mais exigé par l'examinateur — donc traité en `must`. Le périmètre passe de 98 à 101 SP : la remontée est visible sur le burndown, c'est volontaire.

---

## EPIC 1 — Authentification & rôles `sprint-1`

| ID | User story | Critères d'acceptation | SP |
|---|---|---|---|
| US01 | En tant que visiteur, je veux créer un compte afin d'accéder à l'application | Email unique, mot de passe hashé (argon2/bcrypt), rôle `USER` par défaut | 3 |
| US02 | En tant qu'utilisateur, je veux me connecter afin d'accéder à mes tickets | JWT retourné, expiration gérée, mot de passe jamais exposé en réponse | 3 |
| TECH11 | Guards de rôles | Décorateur `@Roles('admin')`, 403 si rôle insuffisant, appliqué à toutes les routes sensibles | 3 |
| US03 | En tant qu'admin, je veux gérer les utilisateurs afin d'administrer l'équipe | Lister, changer le rôle, désactiver un compte | 5 |

**Sous-total : 14 SP**

---

## EPIC 2 — Gestion des tickets `sprint-1`

| ID | User story | Critères d'acceptation | SP |
|---|---|---|---|
| US04 | En tant qu'utilisateur, je veux créer un ticket afin de signaler un incident | Titre, description, priorité ; statut `OPEN` et `created_at` automatiques ; `reporter` = utilisateur courant | 3 |
| US05 | En tant qu'utilisateur, je veux consulter la liste des tickets afin de suivre l'activité | Liste paginée ; un `USER` ne voit que ses tickets, technicien et admin voient tout | 3 |
| US06 | En tant qu'utilisateur, je veux consulter le détail d'un ticket afin d'en connaître l'avancement | Tous les champs + reporter + assigné ; 404 propre si inexistant | 2 |
| US07 | En tant qu'utilisateur, je veux modifier un ticket afin de corriger ou compléter mon signalement | Titre, description, priorité éditables ; permissions selon le rôle | 3 |
| US08 | En tant que technicien, je veux changer le statut d'un ticket afin de refléter son avancement | Machine à états : `OPEN → IN_PROGRESS → RESOLVED → CLOSED`, réouverture `RESOLVED → IN_PROGRESS`, `CLOSED` terminal ; transition invalide rejetée ; `resolved_at` rempli automatiquement ; **tout passe par une seule méthode de service** | 5 |

**Sous-total : 16 SP**

---

## EPIC 3 — Assignation `sprint-2`

| ID | User story | Critères d'acceptation | SP |
|---|---|---|---|
| US09 | En tant qu'admin, je veux assigner un ticket à un technicien afin qu'il soit pris en charge | Seuls les users de rôle `TECHNICIAN` sont assignables | 3 |
| US10 | En tant qu'admin, je veux réassigner un ticket afin de rééquilibrer la charge | Changement d'assigné sur un ticket déjà assigné | 2 |

**Sous-total : 5 SP**

---

## EPIC 4 — Filtrage, tri et recherche `sprint-2`

| ID | User story | Critères d'acceptation | SP |
|---|---|---|---|
| US11 | En tant qu'utilisateur, je veux filtrer les tickets afin de trouver ce qui me concerne | Filtres statut, priorité, technicien assigné ; combinables | 3 |
| US12 | En tant qu'utilisateur, je veux trier les tickets afin de prioriser mon travail | Tri par date, priorité, statut ; ordre asc/desc | 2 |
| US13 | En tant qu'utilisateur, je veux rechercher un ticket afin de le retrouver rapidement | Recherche textuelle sur titre + description (`ILIKE` + index `pg_trgm`) | 3 |

**Sous-total : 8 SP**

---

## EPIC 5 — Dashboard `sprint-2`

| ID | User story | Critères d'acceptation | SP |
|---|---|---|---|
| US14 | En tant qu'admin, je veux voir les statistiques afin de piloter l'activité | Compteurs tickets ouverts / en cours / résolus | 3 |
| US15 | En tant qu'admin, je veux voir le temps moyen de résolution afin de mesurer la performance | `avg(resolved_at - created_at)` sur les tickets résolus ; affichage lisible (h/j) | 2 |
| US16 | En tant qu'admin, je veux visualiser la répartition afin d'identifier les tendances | Graphique simple par priorité et par statut | 3 |

**Sous-total : 8 SP**

---

## EPIC 8 — Interface utilisateur `sprint-2`

> **Ajouté le 2 août, en cours de sprint 2.** Le numéro 8 reflète la date d'ajout, pas la position dans le flux.
>
> **Oubli d'estimation à l'origine, pas un ajout de périmètre.** Les seize US ci-dessus sont rédigées en critères backend et ont toutes été fermées sur une livraison backend : l'interface n'était chiffrée nulle part, alors qu'elle est exigée par le cahier des charges. Le périmètre passe de 101 à 124 SP. La correction est visible sur la courbe « Périmètre » du burndown, au même titre que TECH22.

| ID | User story | Critères d'acceptation | SP |
|---|---|---|---|
| TECH23 | Fondation front | Client HTTP avec injection du jeton et gestion du 401, store Pinia d'authentification, routeur avec gardes par rôle, mise en page et navigation | 5 |
| US17 | En tant que visiteur, je veux m'inscrire et me connecter depuis l'interface | Deux écrans, erreurs de validation affichées, redirection après connexion, persistance de la session | 3 |
| US18 | En tant qu'utilisateur, je veux consulter la liste des tickets depuis l'interface | Tableau paginé, filtres, tri et recherche câblés sur `GET /tickets` | 5 |
| US19 | En tant qu'utilisateur, je veux ouvrir le détail d'un ticket depuis l'interface | Détail complet, modification, changement de statut selon la machine à états, assignation | 5 |
| US20 | En tant qu'utilisateur, je veux créer un ticket depuis l'interface | Formulaire titre / description / priorité, erreurs de validation affichées | 2 |
| US21 | En tant qu'admin, je veux administrer les utilisateurs depuis l'interface | Liste, changement de rôle, désactivation | 3 |

**Sous-total : 23 SP**

> US16 (graphique de répartition) reste rattachée à l'EPIC 5 et dépend de TECH23.

---

## EPIC 6 — Qualité & tests `sprint-2`

| ID | Intitulé | Critères d'acceptation | SP |
|---|---|---|---|
| TECH12 | Tests unitaires machine à états | Toutes les transitions valides passent, toutes les invalides sont rejetées, `CLOSED` terminal vérifié | 3 |
| TECH13 | Test unitaire temps moyen de résolution | Cas nominal, aucun ticket résolu, tickets partiellement résolus | 2 |
| TECH14 | Tests unitaires rôles & permissions | Chaque rôle sur chaque route sensible | 2 |

**Sous-total : 7 SP**

> Le test "conflits de créneaux" mentionné dans le sujet porte un *"si applicable"* : non applicable à un helpdesk. À justifier en une ligne dans la doc de tests plutôt qu'à forcer.

---

## EPIC 7 — Livrables de soutenance `sprint-2`

| ID | Intitulé | Critères d'acceptation | SP |
|---|---|---|---|
| TECH15 | Diagramme d'architecture | `docs/architecture.png` : composants, services, flux de données | 2 |
| TECH16 | ADR | `docs/adr.md` : justification stack, Tauri écarté, pas de table d'historique, UUID | 3 |
| TECH17 | README complet | Lancement dev + prod, `.env.example`, gain multi-stage chiffré, prérequis WSL | 2 |
| TECH18 | Screencast 3-5 min | `docs/screencast.mp4` : parcours utilisateur complet, sert de backup le jour J | 3 |
| TECH19 | Support de soutenance | `docs/presentation.pdf` | 3 |
| TECH20 | Rétrospective | `pm/retrospective.md` : Keep/Drop/Try, retour honnête, rotation des rôles, vélocité mesurée | 2 |
| TECH21 | Doc de répartition théorique | "Si l'équipe avait été à 3 : rôles, découpage, dépendances" — **explicitement labellisé exercice de modélisation** | 2 |

**Sous-total : 17 SP**

---

## Bonus — "Pour aller plus loin" `could`

À ne tirer que si le MVP est bouclé et les livrables PM à jour.

| ID | Intitulé | SP |
|---|---|---|
| USB01 | Prometheus + Grafana (2 services au compose + dashboard — `/metrics` existe déjà) | 3 |
| USB02 | Commentaires sur les tickets (fil de discussion) | 5 |
| USB03 | Export CSV des tickets | 2 |
| USB04 | Notifications temps réel (SSE ou WebSocket) | 8 |
| USB05 | Wrapper Tauri pointant sur le front dockerisé | 5 |

**Sous-total : 23 SP**

---

## Récapitulatif & capacité

| Bloc | SP |
|---|---|
| EPIC 0 — Fondations | 26 |
| EPIC 1 — Auth & rôles | 14 |
| EPIC 2 — Tickets | 16 |
| EPIC 3 — Assignation | 5 |
| EPIC 4 — Filtres & recherche | 8 |
| EPIC 5 — Dashboard | 8 |
| EPIC 8 — Interface utilisateur | 23 |
| EPIC 6 — Tests | 7 |
| EPIC 7 — Livrables | 17 |
| **Total MVP** | **124** |
| Bonus (hors engagement) | 23 |

**Répartition visée** — Sprint 1 : EPIC 0+1+2 = **56 SP** sur 6 jours (~9 SP/jour) · Sprint 2 : EPIC 3+4+5+6+7+8 = **68 SP** sur 4 jours (~17 SP/jour).

**Journal du périmètre**

| Date | Delta | Motif | Total |
|---|---|---|---|
| 28/07 | +3 | TECH22 (Traefik), demande de l'encadrant | 98 → 101 |
| 02/08 | +23 | EPIC 8 (interface), oubli d'estimation à la planification | 101 → 124 |

⚠️ **17 SP/jour attendus sur le sprint 2 n'est pas une cadence tenable**, même après une journée à 30 SP le 2 août — celle-ci portait sur du backend posé sur des fondations déjà en place. L'écart sera constaté dans la rétrospective plutôt que résorbé par une coupe du backlog : la décision du 1er août tient, on livre ce qui est livrable et le burndown dit la vérité.

⚠️ **Sprint 2 est le point de tension.** Il concentre les 17 SP de livrables de soutenance en plus du fonctionnel. Deux mitigations à appliquer dès le sprint 1 :

- **Écrire ADR et diagramme d'archi au fil de l'eau**, pas le 6 août. La matière existe déjà dans `claude-notes/` (stack, data-model, journal) — c'est de la mise en forme, pas de la rédaction from scratch.
- **Protéger le 6 août** : screencast + presentation.pdf + rétro = une journée pleine à eux seuls. Si le fonctionnel déborde dessus, ce sont les livrables notés qui sautent.

## Sprint goals

- **Sprint 1** — « Une stack dockerisée complète où un utilisateur authentifié peut créer et faire vivre un ticket. »
- **Sprint 2** — « Filtres, dashboard, tests et livrables de soutenance prêts. »

## Labels GitHub

À créer sur le dépôt, à croiser sur chaque issue :

- **Type** : `feature` · `tech` · `bug` · `docs` · `test`
- **Domaine** : `auth` · `ticket` · `assignment` · `search` · `dashboard` · `docker` · `ci` · `observability` · `pm`
- **Priorité** : `must` · `could`
- **Sprint** : `sprint-1` · `sprint-2`
- **Estimation** : `sp-1` · `sp-2` · `sp-3` · `sp-5` · `sp-8`

Colonnes Kanban imposées par le sujet : **Backlog / To Do / In Progress / Review / Done**.
