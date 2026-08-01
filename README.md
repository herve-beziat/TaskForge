# TaskForge

Helpdesk interne de gestion de tickets d'incidents — MVP dockerisé.

> Projet intégrateur M1 (La Plateforme). Hackathon fictif ForgeWorks : livrer en
> deux semaines un MVP complet d'une application de gestion de tickets, produit
> et gestion de sprint évalués à parts égales.

## Fonctionnalités

- Gestion complète des tickets d'incidents (création, suivi, résolution, clôture)
- Système de rôles : utilisateur standard, technicien, administrateur
- Assignation et réassignation des tickets aux techniciens
- Filtrage, tri et recherche textuelle
- Dashboard : statistiques, temps moyen de résolution, répartition par priorité

## Stack

| Couche | Technologie |
|---|---|
| Frontend | Vue 3 + Vite |
| Backend | NestJS (TypeScript) |
| Base de données | PostgreSQL + TypeORM |
| Authentification | JWT + guards de rôles |
| Conteneurisation | Docker + Docker Compose |
| Reverse proxy | Traefik v3 |

## Prérequis

- Docker et Docker Compose
- **`buildx`** — nécessaire pour construire une étape ciblée d'un Dockerfile
  multi-stage. Absent du paquet `docker.io` d'Ubuntu et de Linux Mint :
  `sudo apt install docker-buildx`. Sans lui, Compose retombe sur le
  constructeur historique, qui échoue avec un message trompeur du type
  « pull access denied for base ».
- `make`
- **Windows : WSL2 obligatoire.** Docker Desktop tourne déjà sur le backend WSL2,
  aucune dépendance supplémentaire n'est donc nécessaire — il suffit de travailler
  depuis le terminal WSL et non PowerShell. Cloner le dépôt **dans** le système de
  fichiers WSL (`~/`) et non dans `/mnt/c/`, faute de quoi les performances Docker
  s'effondrent et le hot-reload ne se déclenche pas.

## Démarrage rapide

```bash
git clone git@github.com:herve-beziat/TaskForge.git
cd TaskForge

make init     # copie .env.example vers .env, installe les dépendances
make start    # lance la stack complète : frontend + backend + PostgreSQL
make help     # liste toutes les commandes disponibles
```

`make help` détaille l'ensemble des cibles : cycle de vie de la stack (`start`,
`stop`, `restart`, `logs`, `ps`), qualité (`lint`, `lint-fix`, `format`, `test`)
et suivi de projet (`burndown`).

Toute la stack est servie par Traefik sur le port 80. Les navigateurs résolvent
`*.localhost` vers 127.0.0.1 : aucune modification de `/etc/hosts` n'est nécessaire.

| Service | URL |
|---|---|
| Frontend | http://taskforge.localhost |
| API backend | http://api.taskforge.localhost |
| Health check | http://api.taskforge.localhost/health |
| Métriques | http://api.taskforge.localhost/metrics |
| Tableau de bord Traefik | http://traefik.localhost |

Les domaines sont paramétrables via `APP_DOMAIN`, `API_DOMAIN` et `TRAEFIK_DOMAIN`
dans le `.env`.

### Modes de lancement

Deux configurations distinctes, à ne jamais lancer simultanément — elles se
disputeraient le port 80.

| | Développement | Production |
|---|---|---|
| Commande | `make start` | `make prod` |
| Fichier | `docker-compose.yml` | `docker-compose.prod.yml` |
| Étape Docker | `development` | `production` |
| Code source | monté depuis l'hôte, hot-reload | contenu dans l'image |
| Frontend servi par | serveur Vite (5173) | nginx (8080) |
| Port PostgreSQL | publié sur l'hôte | non publié |
| Tableau de bord Traefik | accessible | désactivé |

Les deux piles portent des noms de projet différents (`taskforge` et
`taskforge-prod`) et possèdent donc leurs propres volumes : lancer la production
ne détruit pas la base de développement.

```bash
make stop                                      # arrêter le développement
make prod                                      # lancer la production
docker compose -f docker-compose.prod.yml ps   # état de la pile de production
docker compose -f docker-compose.prod.yml down # l'arrêter
```

> `VITE_API_URL` est incrustée dans le bundle **au moment de la compilation** :
> Vite ne lit plus aucune variable à l'exécution une fois le build statique
> produit. Changer l'URL de l'API en production impose donc de reconstruire
> l'image du frontend.

## Configuration

Toutes les variables d'environnement sont documentées dans `.env.example`.
Générer un secret JWT avant le premier lancement :

```bash
openssl rand -base64 48
```

### Premier administrateur

L'inscription attribue systématiquement le rôle `USER`, et les routes
d'administration exigent `ADMIN` : le premier administrateur ne peut donc pas
être créé par l'application elle-même.

Après avoir créé un compte, le promouvoir en base :

```bash
docker compose exec postgres psql -U taskforge -d taskforge \
  -c "update users set role='ADMIN' where email='votre@email.fr';"
```

Le changement est immédiat — inutile de se reconnecter, le rôle est relu à
chaque requête. Cet administrateur peut ensuite gérer les rôles des autres
comptes via `PATCH /users/:id`.

## Images Docker

Les deux applications utilisent des Dockerfiles multi-stage : une étape `build`
embarque tout l'outillage de compilation puis est écartée, seule l'étape finale
est publiée.

| Image | Développement | Production | Gain |
|---|---|---|---|
| Frontend | 400 Mo | 62,5 Mo | −84 % |
| Backend | 394 Mo | 174 Mo | −56 % |
| **Total** | **794 Mo** | **236 Mo** | **−70 %** |

Mesures réalisées avec :

```bash
docker build --target development -t taskforge-backend:dev  ./backend
docker build --target production  -t taskforge-backend:prod ./backend
docker build --target development -t taskforge-frontend:dev  ./frontend
docker build --target production  -t taskforge-frontend:prod ./frontend

docker images --filter "reference=taskforge-*" \
  --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

L'écart entre les deux gains s'explique par la nature du livrable. Le frontend
supprime purement son environnement d'exécution : `npm run build` produit des
fichiers statiques que nginx sert sans aucune dépendance JavaScript. Le backend
conserve Node, dont l'image de base représente à elle seule environ 130 Mo ; son
gain provient de `npm ci --omit=dev`, qui écarte TypeScript, Jest et ESLint.

Réduire davantage l'image du backend supposerait une image distroless ou un
regroupement des sources en un fichier unique. Le rapport effort/bénéfice n'a pas
été jugé favorable dans le cadre de ce sprint.

## Logs

Le backend émet des logs JSON structurés via pino. Chaque ligne comporte au
minimum `timestamp`, `level`, `message`, `request_id` et `user_id`.

Ils sont écrits simultanément sur la sortie standard et dans un volume Docker
nommé, de sorte qu'ils survivent à la suppression du conteneur.

```bash
docker compose logs -f backend                                  # sortie lisible
docker compose exec backend tail -f /var/log/taskforge/app.log  # JSON brut
```

L'identifiant de requête est repris depuis l'en-tête `x-request-id` s'il est
fourni, sinon généré, et renvoyé dans la réponse — ce qui permet de relier un
incident signalé par un utilisateur à sa ligne de log.

Les en-têtes d'authentification, les cookies et tout champ nommé `password`,
`password_hash` ou `token` sont supprimés avant écriture. Le niveau de verbosité
se règle via `LOG_LEVEL`.

## Santé des services

| Endpoint | Service | Vérifie |
|---|---|---|
| `http://api.taskforge.localhost/health` | Backend | API et connexion PostgreSQL |
| `http://taskforge.localhost/healthz` | Frontend | Serveur web |

`/health` exécute une vraie requête sur la base et renvoie 503 si elle ne répond
pas. `/healthz` est servi par un greffon Vite en développement et par nginx en
production.

```bash
curl -s http://api.taskforge.localhost/health | python3 -m json.tool
docker compose ps
```
## Métriques

Le backend expose ses métriques au format Prometheus sur
`http://api.taskforge.localhost/metrics`.

| Métrique | Type | Alimentée par |
|---|---|---|
| `taskforge_tickets_created_total` | compteur | la création d'un ticket |
| `taskforge_http_request_duration_seconds` | histogramme | un intercepteur global |
| `taskforge_connected_users` | jauge | l'authentification |

S'y ajoutent les métriques du processus Node — mémoire, boucle d'événements,
ramasse-miettes — fournies par `prom-client`.

```bash
curl -s http://api.taskforge.localhost/metrics | grep '^taskforge_'
```

L'histogramme est étiqueté par méthode, motif de route et code de statut. Le
**motif** (`/tickets/:id`) est utilisé, jamais l'URL réelle (`/tickets/42`) :
chaque combinaison d'étiquettes crée une série temporelle distincte, et l'URL
brute en produirait une par ressource consultée.

> L'endpoint est exposé sans authentification, ce qui convient à un environnement
> de développement. En production, il devrait être restreint au réseau interne ou
> protégé — les métriques renseignent sur la charge et la structure de l'API.

### Redémarrage automatique

`restart: unless-stopped` relance un conteneur dont le processus s'arrête, mais
**pas** un conteneur dont la sonde échoue alors que le processus tourne encore.
Docker Compose seul ne sait pas le faire — il faudrait Docker Swarm.

Le service `autoheal` comble cet écart : il surveille les sondes toutes les dix
secondes et redémarre les conteneurs portant le label `autoheal=true` qui passent
en `unhealthy`.

Pour l'observer :

```bash
docker compose stop postgres     # /health du backend renvoie 503
docker compose ps                # après ~45 s, le backend est redémarré
docker compose start postgres    # tout revient healthy sans intervention
```

## Structure du dépôt

```
TaskForge/
├── frontend/           # Interface Vue 3
├── backend/            # API NestJS
├── docker-compose.yml  # Orchestration de la stack
├── .env.example        # Variables d'environnement
├── docs/               # Architecture, ADR, support de soutenance
├── pm/                 # Backlog, daily logs, burndown, rétrospective
└── README.md
```

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) — workflow Git, conventions, Definition of Done
- [pm/sprint-backlog.md](pm/sprint-backlog.md) — backlog estimé et objectifs de sprint
- [Board Kanban](https://github.com/users/herve-beziat/projects/10)

## À compléter

Ces sections seront renseignées au fil du sprint :

- Schéma de la base de données — TECH17
- Lancement en mode production (`docker-compose.prod.yml`) — TECH10
- Diagramme d'architecture et ADR — TECH15, TECH16
