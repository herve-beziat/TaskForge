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
- **Réalisé** : TECH03, TECH04 et TECH05. Gains d'image mesurés — frontend 400 → 62,5 Mo (−84 %), backend 394 → 174 Mo (−56 %). L'endpoint `/healthz` du frontend a été posé au passage dans `nginx.conf`, ce qui allège TECH08. Hooks pre-commit et commit-msg vérifiés en conditions réelles : les deux bloquent. La CI a détecté dès sa première exécution une incohérence entre le composant racine et son test, introduite manuellement pendant TECH02
- **Blocages** : aucun
- **SP restants** : 86 / 101

---

<!-- Ajouter une entrée par jour ci-dessous, en suivant le template. -->
