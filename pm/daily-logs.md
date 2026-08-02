# Daily stand-up logs — TaskForge

Format identique chaque jour, **5 bullet points maximum**.
Une entrée par jour ouvré, du 28 juillet au 6 août (minimum 8 exigées par le sujet).

Contexte : projet mené **en solo**. La cadence est en flux tiré — si une tâche est finie en avance, la suivante est tirée immédiatement au lieu d'attendre le créneau prévu. C'est la pratique Kanban correcte et c'est noté tel quel dans le daily du jour.
Rotation des rôles : casquette PM le matin, dev la journée, QA en fin de journée.

---

## Template

```
## Jour N — <jour> <date>
**Rôle du jour** : PM matin / Dev journée / QA soir

- **Fait hier** : …
- **Prévu aujourd'hui** : …
- **Blocages** : … (ou « aucun »)
- **SP restants** : XX / 98
```

---

## Jour 1 — mardi 28 juillet 2026

**Rôle du jour** : PM matin / Dev journée / QA soir

- **Fait hier (27/07, avant sprint)** : cadrage complet — stack arrêtée (Vue 3 + NestJS + PostgreSQL), modèle de données et machine à états, backlog de 37 items MVP (98 SP) + 5 bonus
- **Fait hier (suite)** : dépôt créé, branches `main` / `develop` protégées, `CONTRIBUTING.md` et template de PR rédigés, 42 issues publiées et estimées, board Kanban 5 colonnes configuré (limites WIP, workflows d'automatisation)
- **Prévu aujourd'hui** : TECH01 (bootstrap du dépôt) → TECH03 (Dockerfiles multi-stage)
- **Réalisé** : TECH01, TECH02, TECH22. TECH03 décalé au jour 2 — TECH22 (Traefik) a été ajouté en cours de journée à la demande de l'encadrant, le périmètre passe de 98 à 101 SP
- **Blocages** : trois, tous levés — conflit de dépendances `oxlint` / `eslint-plugin-oxlint` généré par `create-vue` (versions alignées en 1.76) ; `node_modules` créé en root dans l'image, rendant le volume anonyme non inscriptible par Vite (`chown` avant `USER node`) ; `buildx` absent du paquet `docker.io` d'Ubuntu, indispensable au build d'une étape ciblée
- **SP restants** : 93 / 101

---

## Jour 2 — mercredi 29 juillet 2026

**Rôle du jour** : aucun

- **Fait hier** : TECH01 (bootstrap), TECH02 (docker-compose de développement), TECH22 (Traefik)
- **Prévu aujourd'hui** : TECH03 (Dockerfiles multi-stage)
- **Blocages** : aucun
- **Réalisé** : rien. Journée non travaillée, indisponibilité personnelle. TECH03 reporté au jour 3
- **SP restants** : 93 / 101

---

## Jour 3 — jeudi 30 juillet 2026

**Rôle du jour** : PM matin / Dev journée / QA soir

- **Fait hier** : aucune avancée, journée non travaillée
- **Prévu aujourd'hui** : TECH03 (Dockerfiles multi-stage et comparaison des tailles d'images)
- **Réalisé** : TECH03, TECH04, TECH05, TECH06, TECH07 et TECH08 — session prolongée jusqu'à 00h20. Gains d'image mesurés — frontend 400 → 62,5 Mo (−84 %), backend 394 → 174 Mo (−56 %). L'endpoint `/healthz` du frontend a été posé au passage dans `nginx.conf`, ce qui allège TECH08. Hooks pre-commit et commit-msg vérifiés en conditions réelles : les deux bloquent. La CI a détecté dès sa première exécution une incohérence entre le composant racine et son test, introduite manuellement pendant TECH02
- **Blocages** : deux, levés — l'override `brace-expansion` appliqué au backend casse ESLint (le `minimatch` v3 embarqué appelle encore l'ancienne API), retiré et les 25 vulnérabilités assumées car exclusivement en dépendances de développement ; pino refuse les formateurs personnalisés avec `transport.targets`, contourné par `multistream`
- **Convention du burndown corrigée** : la ligne idéale partait du jour 1 alors que les relevés sont pris en fin de journée, ce qui offrait une journée gratuite. Elle part désormais d'un point « départ » antérieur au jour 1
- **SP restants** : 80 / 101

---

## Jour 4 — vendredi 31 juillet 2026

**Rôle du jour** : aucun

- **Fait hier** : TECH03 à TECH08 — Dockerfiles multi-stage, outillage qualité, CI, Makefile, logs JSON, sondes de santé
- **Prévu aujourd'hui** : TECH09 (endpoint `/metrics`)
- **Blocages** : aucun
- **Réalisé** : rien. Journée non travaillée. TECH09 reporté au jour 5
- **SP restants** : 80 / 101

---

## Jour 5 — samedi 1er août 2026

**Rôle du jour** : PM matin / Dev journée / QA soir

- **Fait hier** : aucune avancée, journée non travaillée
- **Prévu aujourd'hui** : TECH09 (endpoint `/metrics` Prometheus) puis TECH10 (compose de production), pour clore l'EPIC 0
- **Réalisé** : TECH09, TECH10, US01, US02, TECH11, US03 et US04 — session prolongée jusqu'à 01h. **Les EPIC 0 et 1 sont clos** : infrastructure complète, authentification, rôles et administration des utilisateurs. L'EPIC 2 est entamé avec la création de tickets, et le compteur `taskforge_tickets_created_total` — déclaré en TECH09 — trouve enfin son point d'incrémentation.
- **Décision d'architecture revue en cours de route** : le rôle était transporté dans le jeton (US02) pour éviter d'interroger la base. US03 impose de relire le compte à chaque requête, sans quoi une désactivation ne prendrait effet qu'à l'expiration du jeton. Le rôle a donc été retiré du jeton — une donnée d'autorisation transportée mais non fiable serait un piège
- **Manque identifié** : aucune route ne permet de créer le premier administrateur. Procédure SQL documentée dans le README, faute de quoi un évaluateur ne pourrait atteindre aucune fonction d'administration Deux boucles ouvertes depuis les fondations se referment : `user_id` se remplit dans les logs (en attente depuis TECH07) et la jauge d'utilisateurs connectés s'alimente (depuis TECH09). Les 25 vulnérabilités documentées en TECH07 ont disparu d'elles-mêmes : npm a résolu pour chaque branche de `minimatch` la version corrective de `brace-expansion` correspondante (1.1.18, 2.1.4, 5.0.9). L'analyse initiale était fausse — le correctif existe sur chaque branche majeure, forcer le 5.x était inutile et cassant. À rectifier dans l'ADR
- **Blocages** : deux, levés — le type `Request` d'Express déclare `route` en propriété obligatoire, une interface qui l'étend ne peut donc pas la rendre optionnelle ; et une dépendance installée sur l'hôte reste absente du conteneur tant que le volume anonyme de `node_modules` n'est pas régénéré (`--renew-anon-volumes`)
- **SP restants** : 58 / 101

---

## Jour 6 — dimanche 2 août 2026

**Rôle du jour** : PM matin / Dev journée / QA soir

- **Fait hier** : huit tâches livrées en une session — TECH09, TECH10, US01, US02, TECH11, US03 et US04, soit 22 SP. Les EPIC 0 et 1 sont clos, l'EPIC 2 est entamé
- **Prévu aujourd'hui** : US05 à US08 pour boucler la gestion des tickets — consultation, détail, modification, machine à états
- **Réalisé** : US05, US06, US07 et US08 — **l'EPIC 2 est clos**, la gestion des tickets est complète. TECH12, l'un des deux tests nommés par le sujet, est livré par la même occasion : la table des transitions est testée sur les seize combinaisons possibles
- **Bug trouvé par la validation manuelle, pas par les tests** : la clôture d'un ticket effaçait sa date de résolution, ce qui aurait privé le temps moyen d'US15 de toute donnée. Les tests unitaires passaient — aucun ne couvrait `RESOLVED → CLOSED`. Le test manquant a été ajouté. À reprendre dans la rétro : les deux niveaux de vérification ne se remplacent pas
- **Réalisé (suite)** : US09 et US10 — l'assignation et la réassignation partagent le même code, une seule PR ferme les deux issues. TECH12 fermé également, son contenu ayant été livré avec US08. **L'EPIC 3 est clos.**
- **Réalisé (fin de journée)** : US11, US12 et US13 — filtres, tri et recherche textuelle. Les trois stories touchent la même route, le même DTO et la même méthode : une seule branche, une seule PR. **L'EPIC 4 est clos**, le backend fonctionnel est complet à l'exception du dashboard
- **Écart assumé** : l'index `pg_trgm` prévu au modèle de données n'est pas posé — l'extension doit précéder la création des tables, or les scripts d'initialisation de l'image ne rejouent pas sur un volume existant. L'ajouter supposerait de détruire la base. Sur quelques dizaines de tickets, le parcours séquentiel est imperceptible. À consigner dans l'ADR
- **Réalisé (suite)** : US14, US15 et **TECH13** — endpoint `GET /dashboard/stats` réservé à l'administrateur : compteurs par statut et par priorité, temps moyen de résolution. Le second des deux tests nommés par le sujet est livré, comme TECH12 l'avait été avec US08
- **Décision de conception** : le temps moyen est calculé par une fonction pure en TypeScript plutôt que par `AVG` en SQL. Le sujet exige un *test unitaire* de ce calcul ; laissé à PostgreSQL, il n'y aurait plus eu que du formatage à tester, et TECH13 aurait porté sur autre chose que ce qu'il nomme. Le service ne charge que deux colonnes des tickets résolus. Écart assumé, à consigner dans l'ADR
- **US16 volontairement non fermée** : le graphique de répartition est un livrable front, et le front n'existe pas. La donnée est livrée, l'issue reste ouverte — fermer sur une promesse se repère en relecture
- **Blocages** : un, levé — le cache de compilation incrémentale de TypeScript gardait une vision périmée du service après un changement de constructeur. Le conteneur affichait une erreur sur une méthode pourtant présente. Résolu en supprimant `dist/` et le fichier `.tsbuildinfo`
- **Correction de périmètre, +23 SP** : l'interface n'était chiffrée nulle part. Les seize US du backlog sont rédigées en critères backend et ont toutes été fermées sur une livraison backend, alors que le cahier des charges exige une interface. Ce n'est pas un ajout de scope mais un oubli d'estimation à la planification. EPIC 8 créé (TECH23, US17 à US21), périmètre 101 → 124. Une courbe « Périmètre » a été ajoutée au burndown : sans elle, l'ajout se serait lu comme une journée improductive
- **Réalisé (suite)** : TECH23 — socle du front. Client HTTP avec injection du jeton et traitement du 401, store Pinia d'authentification, routeur et gardes, mise en page. Dix tests front, contre un seul jusqu'ici
- **Correctif au passage** : `GET /auth/me` ne renvoyait que `id`, `email` et `role`, quand la connexion renvoie la projection complète. Au rechargement d'une page, le nom affiché dans la barre de navigation aurait disparu. La stratégie JWT charge déjà l'entité entière, les deux champs manquants ne coûtent aucune requête
- **SP restants** : 40 / 124

---

<!-- Ajouter une entrée par jour ci-dessous, en suivant le template. -->
