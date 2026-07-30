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

> Les commandes `make` seront disponibles une fois TECH06 livré. En attendant,
> `docker compose up -d --build` produit le même résultat.

```bash
git clone git@github.com:herve-beziat/TaskForge.git
cd TaskForge

make init     # copie .env.example vers .env, installe les dépendances
make start    # lance la stack complète : frontend + backend + PostgreSQL
make help     # liste toutes les commandes disponibles
```

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

## Configuration

Toutes les variables d'environnement sont documentées dans `.env.example`.
Générer un secret JWT avant le premier lancement :

```bash
openssl rand -base64 48
```
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