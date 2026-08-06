# Rétrospective — TaskForge

Sprint du 28 juillet au 6 août 2026. Soutenance le 7 août.

Projet mené **seul**, alors qu'il était prévu à deux. L'examinateur en est
informé. Ce document dit ce qui s'est passé, pas ce qui aurait dû se passer.

---

## 1. Les chiffres

### Vélocité réelle

| Jour | Date | SP restants | Livré ce jour-là |
|---|---|---|---|
| — | départ | 98 | périmètre initial |
| 1 | mar 28/07 | 93 | TECH01, TECH02, TECH22 |
| 2 | mer 29/07 | 93 | **rien** |
| 3 | jeu 30/07 | 80 | TECH03 à TECH08 |
| 4 | ven 31/07 | 80 | **rien** |
| 5 | sam 01/08 | 58 | TECH09, TECH10, US01 à US04, TECH11 |
| 6 | dim 02/08 | 37 | US05 à US13, US14, US15, TECH12, TECH13, TECH23, US17 |
| 7 | lun 03/08 | 22 | US18 à US21 |
| 8 | mar 04/08 | 22 | **rien** |
| 9 | mer 05/08 | 22 | **rien** |
| 10 | jeu 06/08 | 15 | US16, TECH14, TECH20, USB01 (bonus) |

**Quatre journées sur dix n'ont produit aucun point.** Les six autres ont absorbé
111 SP, dont 56 sur la seule journée du 2 août. Ce n'est pas une vélocité, c'est
une alternance entre l'arrêt et la session de dix heures.

### Périmètre

| Date | Delta | Motif | Total |
|---|---|---|---|
| 27/07 | — | planification initiale | 98 |
| 28/07 | +3 | TECH22 (Traefik), demande de l'encadrant | 101 |
| 02/08 | **+23** | EPIC 8 (interface) — oubli d'estimation | 124 |
| 06/08 | +2 | US16 réestimée, l'écran de dashboard n'existait pas | 126 |

Le périmètre a crû de **29 %** en cours de route, dont 23 SP pour un oubli
manifeste. Voir section 3.

### Qualité

| Indicateur | Valeur |
|---|---|
| Tests automatisés | **193** — 139 backend, 54 frontend |
| Suites de tests | 15 |
| PR mergées | 20 |
| Bugs trouvés par les tests unitaires | **0** |
| Bugs trouvés par la recette manuelle | **4** |

La dernière ligne est le constat le plus instructif du sprint. Voir section 4.

---

## 2. Ce qui a marché — Keep

**Le transversal posé le premier jour.** Logs JSON, `/metrics`, sondes de santé,
Dockerfiles multi-stage, pre-commit, CI : tout cela a été fait sur une base vide,
avant la première ligne de code métier. Ajouté au jour 8, chacun aurait demandé
de retoucher trente fichiers. Le pari de la priorisation initiale — « le risque
en solo n'est pas *quoi* couper mais dans quel *ordre* » — s'est vérifié.

**Les tests écrits au fil de l'eau.** Décision du 1er août, jamais démentie
ensuite. Aucune story n'a été mergée sans ses tests, et les trois tests nommés
par le sujet (TECH12, TECH13, TECH14) sont tombés naturellement avec les stories
correspondantes plutôt qu'en fin de sprint.

**Un protocole de livraison strict.** Une branche par story, cinq commits en
moyenne, une PR décrivant les décisions et pas seulement les fichiers, un carnet
de recette tenu à chaque étape. Sur un projet solo, c'est le seul substitut à la
revue par un pair : écrire pourquoi on a fait un choix oblige à vérifier qu'il
en est un.

**Les décisions de sécurité prises tôt et tenues.** Le 404 plutôt que le 403 pour
empêcher l'énumération des identifiants, le message de connexion identique quelle
que soit la cause de l'échec, la défense temporelle avec un haché factice, le
rôle retiré du jeton pour que le compte soit relu à chaque requête. Cette
dernière décision, prise au jour 5 pour une raison technique, s'est révélée
démontrable à l'écran au jour 7 : une session ouverte est refusée dès la
désactivation du compte.

**Les filtres dans l'URL.** Choix fait pour rendre une vue partageable, il a
surtout donné un bouton retour cohérent et des filtres conservés au retour depuis
le détail d'un ticket. Un cas où le critère d'acceptation demandait moins que ce
que la bonne solution apporte.

---

## 3. Ce qui n'a pas marché — Drop

**L'interface n'était chiffrée nulle part.** Les seize US du backlog initial
étaient rédigées en critères backend, et toutes ont été fermées sur une livraison
backend. Le cahier des charges exigeait pourtant une interface. L'erreur a été
découverte le 2 août, à quatre jours de la soutenance, et a coûté **23 SP**,
soit 23 % du périmètre initial.

Ce n'est pas un ajout de périmètre, c'est un oubli d'estimation. La cause tient
en une phrase : le backlog a été écrit en pensant aux endpoints, pas aux écrans.
Une relecture croisant chaque US avec « qu'est-ce que l'utilisateur voit ? »
l'aurait détecté en vingt minutes.

**Quatre journées perdues sur dix.** Les 29 et 31 juillet, puis les 4 et 5 août.
Aucune n'était planifiée. La conséquence directe est que le 6 août — journée
explicitement réservée aux livrables dès la planification — a servi à finir le
fonctionnel.

**La règle des 17 SP/jour n'a jamais été tenable.** Après la correction de
périmètre, le sprint 2 demandait 17 SP par jour. Le constat a été écrit dans le
backlog le jour même, sans que rien n'en découle. Constater un objectif
inatteignable sans en tirer de conséquence, c'est faire du reporting, pas du
pilotage.

**Une heure perdue sur un diagnostic posé trop vite.** Le 3 août, en préparant
US18, j'ai conclu à une fuite d'email en ne lisant que le service — qui charge
les relations sans projection. Le contrôleur en portait déjà une. La correction
inutile a produit le symptôme inverse et il a fallu tout défaire. **Lire la
couche qui répond avant de conclure sur celle qui interroge.**

**Le collage de fichiers a été une source d'erreurs récurrente.** Caractères `<`
perdus en fin de ligne, fichiers ajoutés au lieu d'être remplacés, noms mal
orthographiés (`GraphiqueRapartition`, `premetheus.yml`, `ticket.api.ts`), routes
fusionnées. Une demi-douzaine d'incidents, tous détectés par le lint ou les tests
— ce qui valide l'outillage, mais représente du temps perdu.

---

## 4. Le constat central : quatre bugs, aucun test unitaire

| Bug | Story | Ce qu'un test unitaire ne voyait pas |
|---|---|---|
| `resolvedAt` effacé à la clôture | US08 | Les sept tests passaient — aucun ne couvrait `RESOLVED → CLOSED`, l'état final normal |
| Relations perdues dans la liste | US18 | Le service les chargeait, le contrôleur les jetait. Deux couches testées séparément, jamais ensemble |
| Message d'erreur invisible | US19 | Le composable exposait l'erreur correctement ; c'est le gabarit qui la plaçait dans une branche jamais rendue |
| `ParseUUIDPipe` en anglais | US19 | Aucun test ne lit un message destiné à un humain |

**Les 193 tests automatisés n'ont détecté aucun de ces quatre défauts.** Tous ont
été trouvés en cliquant dans l'application ou en appelant l'API à la main.

Ce n'est pas un argument contre les tests unitaires : ils ont empêché des
régressions à chaque refonte, et le test de permissions de TECH14 a été validé
par mutation — `@Auth()` retiré, neuf échecs immédiats. C'est un argument contre
l'idée qu'ils suffisent. Trois des quatre bugs vivaient **entre** deux couches
correctement testées, ou dans ce qu'aucun test ne regarde : ce qui s'affiche.

---

## 5. Le travail en solo

**La rotation des rôles a été réelle mais déséquilibrée.** Casquette PM le matin,
développement la journée, recette en fin de journée. En pratique, le PM a été
expédié les jours de forte production — c'est précisément le 2 août, la journée
la plus dense, qu'aucune revue de périmètre n'a eu lieu, alors que c'est ce
jour-là que l'oubli du front a été découvert.

**La cadence en flux tiré a bien fonctionné.** Enchaîner sur la story suivante
dès qu'une est finie, plutôt que d'attendre un créneau, est la pratique Kanban
correcte et a permis les journées à 30 SP. Elle n'a de sens que parce qu'il n'y a
personne à synchroniser.

**Ce que le solo a coûté :** pas de revue de code, donc des décisions validées
par leur seul auteur ; pas de second regard sur le backlog, d'où l'oubli du
front ; et une disponibilité qui n'a aucune redondance — quatre journées perdues
sur dix, sans personne pour absorber.

**Ce que le solo a apporté :** aucun coût de coordination, une cohérence de style
sur l'ensemble du code, et des décisions prises en quelques minutes plutôt qu'en
réunion.

---

## 6. Ce qu'on ferait autrement — Try

**Relire le backlog écran par écran, pas seulement endpoint par endpoint.** Vingt
minutes qui auraient évité 23 SP de découverte tardive.

**Faire une passe de recette manuelle à chaque story, pas seulement à la fin.**
C'est déjà ce qui a été fait, et c'est ce qui a trouvé les quatre bugs. À
formaliser comme une étape de la Definition of Done plutôt qu'à laisser à
l'initiative.

**Tirer une conséquence de chaque constat de pilotage.** « 17 SP/jour n'est pas
tenable » aurait dû déclencher un arbitrage explicite le jour même — même si cet
arbitrage avait été « on continue et on assume ».

**Protéger la dernière journée pour de bon.** Elle était réservée aux livrables
dès la planification. Elle a servi au fonctionnel, parce que rien n'empêchait le
fonctionnel de déborder.

**Écrire un test qui échoue avant de corriger un bug trouvé à la main.** Fait
pour `resolvedAt`, pas systématiquement ailleurs.

---

## 7. Ce qui n'a pas été livré

| ID | Livrable | Statut |
|---|---|---|
| TECH15 | Diagramme d'architecture | Non livré |
| TECH16 | ADR | À apprécier selon l'avancement final |
| TECH17 | README complet | Livré |
| TECH18 | Screencast | **Non retenu** — l'examinateur demande une démonstration en direct |
| TECH19 | Support de soutenance | **Non retenu** — même raison |
| TECH20 | Rétrospective | Ce document |
| TECH21 | Répartition théorique en équipe | Non livré |

TECH18 et TECH19 ont été écartés sur décision de l'examinateur, qui a préféré une
démonstration commentée en direct. Ils restent au backlog et au burndown : les en
retirer aurait embelli la courbe sans rien changer à la réalité.

Les autres manques tiennent au calendrier décrit en section 1. Le fonctionnel a
été privilégié sur la documentation de soutenance — décision assumée, prise en
connaissance du fait que le sujet évalue le produit et la gestion de projet à
parts égales.

---

## 8. Bilan

Le MVP fonctionnel est complet : les huit points du cahier des charges sont
couverts, avec 193 tests, une stack entièrement dockerisée derrière un reverse
proxy, des logs structurés, des sondes de santé, des métriques exposées et
supervisées par Prometheus et Grafana — ce dernier point relevant des bonus.

Le suivi de projet est complet et daté : dix daily logs, un burndown à trois
courbes montrant les corrections de périmètre, un backlog estimé et un board
Kanban tenu.

Ce qui manque, ce sont les livrables de mise en forme de la dernière journée, et
la cause en est identifiée : quatre journées sans production sur dix, et un
périmètre découvert incomplet à mi-parcours. Aucune des deux n'est imputable à
la technique.
