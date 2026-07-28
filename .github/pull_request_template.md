<!-- À déposer dans le dépôt sous .github/pull_request_template.md -->

## Contexte

Closes #

<!-- Pourquoi cette PR existe. Une ou deux phrases suffisent. -->

## Ce que fait cette PR

-
-
-

## Type de changement

- [ ] `feature` — nouvelle fonctionnalité
- [ ] `fix` — correction de bug
- [ ] `tech` — enabler technique (Docker, CI, config, refacto)
- [ ] `docs` — documentation
- [ ] `test` — ajout ou correction de tests

## Comment tester

```bash
make start
```

<!-- Étapes concrètes pour vérifier en local. Parcours utilisateur, endpoint à appeler, écran à ouvrir. -->

1.
2.

## Checklist DoD

- [ ] Les tests passent (`make test`)
- [ ] Le lint passe (`make lint`)
- [ ] La CI est verte
- [ ] Aucun secret ni `.env` commité
- [ ] Documentation à jour si le comportement change (README, `.env.example`)
- [ ] L'issue liée est référencée ci-dessus
- [ ] Le daily log et le burndown du jour sont à jour
