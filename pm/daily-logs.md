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
- **Réalisé** : US05 et US06
- **Blocages** : aucun
- **SP restants** : 53 / 101

---

<!-- Ajouter une entrée par jour ci-dessous, en suivant le template. -->
