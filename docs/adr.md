# Architecture Decision Records — TaskForge

Décisions structurantes prises pendant le sprint du 28 juillet au 6 août 2026,
avec leur contexte, leurs conséquences et les alternatives écartées.

Trois d'entre elles sont des **écarts assumés** : des choix connus comme
imparfaits, retenus pour une raison explicite. Elles sont signalées comme telles.
Un registre qui ne contiendrait que de bonnes décisions ne serait pas un registre.

---

## ADR-001 — Vue 3, NestJS et PostgreSQL, application web

**Date** : 27 juillet 2026 · **Statut** : acceptée

### Contexte

Le sujet laisse le choix entre une application web et une application de bureau.
Le projet est mené seul, en deux semaines, et doit être reproductible par un
évaluateur en une commande.

### Décision

Application web : **Vue 3 + Vite** au frontend, **NestJS** au backend,
**PostgreSQL** avec TypeORM, l'ensemble conteneurisé et servi par **Traefik**.

### Justification

NestJS impose une structure — modules, services, contrôleurs, injection de
dépendances — là où Express laisse tout à inventer. Sur un projet solo et court,
une structure imposée vaut mieux qu'une liberté qu'on n'a pas le temps
d'exercer. Elle apporte aussi les guards, les pipes de validation et les
décorateurs, sur lesquels reposent l'authentification et la validation.

Vue 3 avec la Composition API offre les composables, qui permettent de sortir la
logique des composants et de la tester sans monter d'interface. C'est ce qui a
rendu possible les 54 tests frontend.

PostgreSQL pour les types énumérés natifs, `timestamptz`, et les agrégations du
tableau de bord.

### Conséquences

- Un seul langage, TypeScript, des deux côtés
- Les types de l'API sont recopiés à la main côté client, sans génération — divergence possible, assumée sur ce périmètre
- La stack complète démarre par `make start`

### Alternatives écartées

**Tauri.** Une application de bureau aurait été un vrai différenciateur, mais
elle casse la reproductibilité en une commande — un binaire à compiler par
plateforme — et rend inopérante la sonde `/healthz` exigée par le sujet. Gardé
comme bonus de dernière priorité (USB05), non réalisé.

**HTMX.** Séduisant pour la légèreté, mais aurait déporté toute la logique
d'interface dans les gabarits du backend, sans la couche testable que sont les
composables.

---

## ADR-002 — UUID en clés primaires

**Date** : 27 juillet 2026 · **Statut** : acceptée

### Contexte

Les identifiants des tickets et des comptes circulent dans les URL, et sont donc
visibles et modifiables par l'utilisateur.

### Décision

Clés primaires en **UUID v4**, générées par PostgreSQL.

### Justification

Un identifiant séquentiel expose deux choses. Il révèle le volume — `/tickets/3`
dit que l'application en compte trois — et il rend l'énumération triviale :
incrémenter un compteur suffit à parcourir toutes les ressources.

Cette décision fonctionne de pair avec **ADR-006** : l'UUID rend l'énumération
coûteuse, le 404 la rend inutile.

### Conséquences

- Index plus volumineux et légèrement plus lents qu'un entier — négligeable sur un helpdesk interne
- Les identifiants sont illisibles à l'œil, ce qui complique le débogage manuel
- `ParseUUIDPipe` rejette un identifiant malformé en 400 avant que la requête n'atteigne la base, qui produirait sinon une 500 sur une faute de frappe

### Alternatives écartées

**Entier auto-incrémenté.** Plus compact et plus lisible, mais énumérable.

**Identifiant public distinct de la clé primaire.** Combine les avantages, au
prix d'une colonne et d'un index supplémentaires sur chaque table. Complexité
non justifiée à ce périmètre.

---

## ADR-003 — Pas de table d'historique ni d'audit au MVP

**Date** : 27 juillet 2026 · **Statut** : acceptée

### Contexte

Un helpdesk conserve naturellement une trace des changements d'état. Le cahier
des charges ne la demande pas.

### Décision

Aucune table d'historique. Les tickets portent `createdAt`, `updatedAt` et
`resolvedAt`, rien de plus.

### Justification

Le sujet ne l'exige pas, et une table d'événements implique une décision de
modélisation qu'on ne prend pas à la légère : quels événements, quelle
granularité, quelle rétention. Mal conçue, elle est plus coûteuse à corriger
qu'à ajouter.

L'ajout ultérieur est rendu trivial par **ADR-004** : tout changement d'état
passe déjà par une seule méthode, qui serait le point d'émission naturel.

### Conséquences

- Impossible de répondre à « qui a fermé ce ticket et quand »
- Les logs JSON structurés conservent une trace applicative, non requêtable en SQL
- L'ajout futur ne nécessite aucun remaniement, seulement une entité et un appel

### Alternatives écartées

**Table `TicketEvent` dès le MVP.** Écartée par priorité, pas par principe.

**Journalisation en base des logs applicatifs.** Confond deux besoins distincts :
les logs servent au diagnostic, un historique métier sert à répondre à une
question fonctionnelle.

---

## ADR-004 — Un seul point de passage pour les changements d'état

**Date** : 27 juillet 2026 · **Statut** : acceptée

### Contexte

Un ticket suit un cycle de vie contraint : `OPEN → IN_PROGRESS → RESOLVED →
CLOSED`, avec réouverture possible depuis `RESOLVED` et `CLOSED` terminal.

### Décision

Les transitions autorisées sont déclarées dans une **table explicite**
(`ticket-transitions.ts`), et **toute** modification de statut passe par la seule
méthode `changerStatut` du service.

### Justification

Une machine à états dispersée dans plusieurs méthodes devient impossible à
vérifier : il faut lire tous les appelants pour savoir ce qui est permis. Une
table déclarative se teste exhaustivement — les seize combinaisons possibles le
sont, quatre autorisées et douze refusées.

C'est aussi le point unique où `resolvedAt` est renseigné, ce qui garantit que la
donnée dont dépend le temps moyen de résolution ne peut pas être écrite ailleurs.

### Conséquences

- Une route dédiée `PATCH /tickets/:id/status`, distincte du `PATCH` général : le statut n'obéit ni aux mêmes règles ni aux mêmes droits que le titre
- Le test exigé par le sujet (TECH12) est tombé naturellement avec la story
- Un bug y a malgré tout échappé, voir ADR-013

### Alternatives écartées

**Chaînes de caractères validées au cas par cas dans les contrôleurs.** Chaque
nouvelle route aurait dupliqué la règle.

---

## ADR-005 — Le rôle n'est pas transporté dans le jeton

**Date** : 1er août 2026 · **Statut** : acceptée, révise une décision antérieure

### Contexte

Le rôle de l'utilisateur était initialement placé dans le contenu signé du JWT,
pour éviter une requête en base à chaque appel. US03 a introduit la désactivation
d'un compte par un administrateur.

### Décision

Le rôle est **retiré du jeton**. La stratégie JWT relit le compte en base à
chaque requête et refuse les comptes désactivés.

### Justification

Une donnée d'autorisation transportée dans un jeton est figée jusqu'à son
expiration. Avec `JWT_EXPIRES_IN=1h`, un compte désactivé serait resté actif une
heure, et un rôle retiré aurait continué de s'appliquer. Une donnée
d'autorisation qui n'est pas fiable est pire qu'absente : elle donne l'illusion
d'un contrôle.

### Conséquences

- Une requête en base par appel authentifié — coût réel, mesuré comme négligeable sur ce volume
- La désactivation prend effet immédiatement, ce qui se démontre en direct : une session ouverte est refusée dès le clic de l'administrateur
- Le jeton ne contient plus que l'identifiant et l'email

### Alternatives écartées

**Jetons de très courte durée avec rafraîchissement.** Réduit la fenêtre sans
la supprimer, au prix d'un mécanisme de rafraîchissement complet.

**Liste de révocation.** Nécessite un stockage partagé, et revient à consulter
une source externe à chaque requête — donc au même coût, pour une solution moins
directe.

---

## ADR-006 — 404 plutôt que 403 sur une ressource interdite

**Date** : 2 août 2026 · **Statut** : acceptée

### Contexte

Un utilisateur ordinaire ne voit que ses propres tickets. Que répondre lorsqu'il
demande le ticket d'un autre ?

### Décision

**404**, strictement identique à la réponse pour un ticket inexistant.

### Justification

Un 403 confirme l'existence de la ressource. Répété sur une série
d'identifiants, il permet de cartographier la base sans jamais en lire le
contenu : on apprend combien de tickets existent et lesquels.

C'est le pendant d'**ADR-002** : l'UUID rend l'énumération coûteuse, le 404 la
rend stérile.

### Conséquences

- Un utilisateur légitime qui se trompe d'URL reçoit un message moins précis — coût accepté
- L'interface ne cherche pas à distinguer les deux cas : elle affiche « Ticket introuvable, ou non accessible avec ce compte »
- Un test unitaire interdit explicitement de « clarifier » la réponse en 403

### Alternatives écartées

**403 explicite.** Plus honnête envers l'utilisateur, plus bavard envers un
attaquant.

---

## ADR-007 — Temps moyen de résolution calculé en TypeScript, pas en SQL

**Date** : 2 août 2026 · **Statut** : acceptée

### Contexte

Le sujet exige un **test unitaire** du calcul du temps moyen de résolution
(TECH13). PostgreSQL sait le faire en une expression : `AVG(resolved_at -
created_at)`.

### Décision

Le service charge `createdAt` et `resolvedAt` des tickets résolus — deux colonnes,
rien d'autre — et une **fonction pure** calcule la moyenne. Les compteurs par
statut et par priorité restent, eux, agrégés en SQL.

### Justification

Laissé à PostgreSQL, le calcul n'aurait plus rien de testable unitairement : il
n'en serait resté que du formatage. On aurait livré un test portant le nom exigé
sans qu'il teste ce que ce nom désigne.

La fonction pure permet de couvrir les trois cas que le sujet nomme — cas
nominal, aucun ticket résolu, tickets partiellement résolus — dont le dernier est
le plus instructif : les tickets non résolus doivent être **exclus du
dénominateur**, faute de quoi le temps moyen baisserait à mesure que les tickets
s'accumulent sans être traités.

### Conséquences

- N lignes chargées au lieu d'une agrégation — sur un helpdesk interne, N se compte en centaines
- La distinction « aucun ticket résolu » (`null`) et « résolus instantanément » (`0`) est préservée jusqu'à l'écran
- **Écart assumé** : à volume réel, cette approche ne tiendrait pas et devrait repasser en SQL, avec un test d'intégration plutôt qu'unitaire

### Alternatives écartées

**`AVG` en SQL avec un test sur le formatage seul.** Techniquement juste,
intellectuellement malhonnête au regard de ce que le sujet demande.

---

## ADR-008 — Index `pg_trgm` non posé (écart assumé)

**Date** : 2 août 2026 · **Statut** : acceptée, écart assumé

### Contexte

Le modèle de données prévoyait un index trigramme pour la recherche textuelle
`ILIKE` sur le titre et la description (US13).

### Décision

**Aucun index posé.** La recherche s'exécute en parcours séquentiel.

### Justification

L'extension `pg_trgm` doit être installée avant la création des tables, et les
scripts d'initialisation de l'image PostgreSQL ne s'exécutent qu'au **premier**
démarrage du volume. L'ajouter en cours de sprint aurait imposé de détruire la
base de développement.

Sur quelques dizaines de tickets, la différence est imperceptible.

### Conséquences

- La recherche se dégrade linéairement avec le volume
- Correction connue : ajouter `CREATE EXTENSION pg_trgm` à un script d'initialisation, recréer le volume, poser un index GIN sur les deux colonnes
- **Écart assumé** : la décision est datée d'une contrainte de calendrier, pas d'une analyse technique

---

## ADR-009 — `/metrics` exposé sans authentification (écart assumé)

**Date** : 1er août 2026 · **Statut** : acceptée, écart assumé

### Contexte

Le sujet exige un endpoint `/metrics` au format Prometheus. Il est servi par le
backend, derrière Traefik, sur `api.taskforge.localhost/metrics`.

### Décision

Endpoint **public**, sans authentification.

### Justification

Prometheus n'a pas de session, et l'authentifier supposerait un jeton de service
ou une exception dans les guards — c'est-à-dire une porte dérobée dans le
mécanisme d'autorisation, pour un environnement de développement.

### Conséquences

- Les métriques renseignent sur la charge, la structure des routes et le nombre d'utilisateurs connectés
- **Écart assumé** : en production, cet endpoint devrait être restreint au réseau interne, ou protégé par le reverse proxy
- Prometheus, lui, interroge le backend par le réseau interne — l'endpoint public ne lui sert pas

### Alternatives écartées

**Restriction par IP au niveau de Traefik.** Faisable, mais inopérante en
développement où tout part de la même machine.

---

## ADR-010 — Table des transitions dupliquée côté frontend (écart assumé)

**Date** : 3 août 2026 · **Statut** : acceptée, écart assumé

### Contexte

L'écran de détail ne doit proposer que les transitions que la machine à états
accepte. Cette table vit dans le backend (**ADR-004**).

### Décision

La table est **recopiée** dans le composable frontend.

### Justification

Sans elle, l'interface afficherait des boutons voués à un 400 — « Clore » sur un
ticket ouvert, par exemple. Proposer une action qui échouera est pire que ne pas
la proposer.

Le backend reste **seul juge** : si les deux tables divergent, l'API refuse et le
message s'affiche. Le frontend n'anticipe que l'affichage, il n'autorise rien.

### Conséquences

- Deux sources pour une même règle, avec le risque de divergence que cela implique
- La duplication est documentée à l'endroit de la copie, avec un renvoi au fichier d'origine
- **Écart assumé** : la correction propre serait d'exposer les transitions possibles dans la réponse de l'API, par exemple un champ `transitionsPossibles` sur le ticket

### Alternatives écartées

**Exposer les transitions dans la réponse.** La bonne solution, écartée par
calendrier. Elle supprimerait la duplication et adapterait l'interface aux droits
réels de l'appelant.

**Ne rien anticiper côté front.** Aurait produit une interface où la moitié des
boutons échouent.

---

## ADR-011 — Ni framework CSS, ni bibliothèque de graphiques

**Date** : 2 et 6 août 2026 · **Statut** : acceptée

### Contexte

Six écrans à produire en trois jours, dont un tableau de bord avec deux
graphiques de répartition.

### Décision

**CSS natif** avec des variables pour les couleurs, les espacements et les
rayons. **SVG écrit à la main** pour les graphiques.

### Justification

Tailwind aurait accéléré la mise en forme, au prix d'une dépendance, d'une
configuration, d'un rebuild d'image et d'un risque de conflit avec oxlint à
quatre jours de la soutenance. Six écrans ne le justifient pas.

Pour les graphiques, la donnée est une répartition sur quatre catégories, pas une
série temporelle. Chart.js aurait apporté une dépendance et une intégration Vue
pour huit barres horizontales.

### Conséquences

- Les couleurs de statut et de priorité sont pilotées par attribut (`data-statut`), et changer la charte ne touche qu'un fichier
- Un statut garde la même teinte d'un écran à l'autre, du badge de la liste à la barre du graphique
- Le SVG des graphiques est marqué `aria-hidden` : la valeur et le libellé sont du texte HTML à côté, l'annoncer deux fois n'apporterait rien

---

## ADR-012 — Socket Docker monté pour Traefik et autoheal (concession)

**Date** : 28 juillet 2026 · **Statut** : acceptée, concession de sécurité

### Contexte

Traefik découvre les services par les labels des conteneurs. `autoheal` redémarre
les conteneurs dont la sonde échoue — ce que `restart: unless-stopped` ne sait
pas faire, la politique ne couvrant que l'arrêt du processus.

### Décision

Le socket Docker est monté dans les deux conteneurs : **en lecture seule** pour
Traefik, **en lecture-écriture** pour autoheal.

### Justification

Il n'existe pas d'alternative à la découverte par labels sans renoncer au
routage automatique. Redémarrer un conteneur est par nature une opération
d'écriture.

### Conséquences

- **Concession assumée** : l'accès au socket Docker équivaut à un accès root sur l'hôte. Un conteneur compromis pourrait en démarrer d'autres
- La distinction lecture seule / lecture-écriture limite la surface au strict nécessaire
- En production, un proxy de socket filtrant les appels autorisés serait la réponse appropriée

---

## ADR-013 — Rectifications

**Date** : 6 août 2026 · **Statut** : informatif

Deux analyses se sont révélées fausses en cours de sprint. Elles figurent ici
plutôt que d'être effacées : une décision corrigée est plus instructive qu'une
décision qui n'a jamais eu à l'être.

### Les vulnérabilités `brace-expansion` (30 juillet)

`npm audit` signalait 25 vulnérabilités provenant de `brace-expansion`, une
dépendance transitive d'ESLint. J'ai conclu qu'il fallait forcer la version 5
par un `override`, ce qui a cassé ESLint : le `minimatch` v3 embarqué appelle
encore l'ancienne API.

**L'analyse était fausse.** Le correctif existe sur chaque branche majeure —
1.1.18, 2.1.4, 5.0.9 — et npm résolvait déjà la bonne version pour chaque
branche. L'override était à la fois inutile et cassant. Retiré, les 25 alertes
ont disparu d'elles-mêmes.

**Leçon** : vérifier ce que le gestionnaire de paquets résout réellement avant de
forcer une version.

### Le bug de `resolvedAt` (2 août)

La clôture d'un ticket effaçait sa date de résolution. Sept tests unitaires
couvraient `changerStatut`, aucun ne portait sur `RESOLVED → CLOSED` —
c'est-à-dire l'état final normal d'un ticket traité. Le temps moyen de
résolution (**ADR-007**) se serait retrouvé sans aucune donnée à mesurer.

Trouvé en cliquant dans l'application, pas par les tests. Le test manquant a été
ajouté avant la correction.

**Leçon** : une couverture qui teste chaque transition isolément peut manquer
celle qui compte le plus.

---

## Décisions non prises

Certaines questions ont été laissées ouvertes, faute de temps ou d'enjeu. Elles
sont listées pour qu'on ne les croie pas tranchées.

- **Migrations de schéma** : `synchronize: true` est utilisé hors production. Une vraie mise en production imposerait des migrations versionnées
- **Pagination par curseur** : la pagination est par décalage (`skip`/`take`), correcte à ce volume, coûteuse au-delà
- **Transitions exposées par l'API** : voir ADR-010
- **Génération des types du client depuis l'API** : les types sont recopiés à la main, avec le risque de divergence que cela implique
