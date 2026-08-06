.DEFAULT_GOAL := help

.PHONY: help init install start stop restart logs ps lint lint-fix format test burndown diagram prod clean

help: ## Affiche cette aide
	@echo "TaskForge — commandes disponibles"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
	@echo ""

init: ## Prépare l'environnement local (.env + dépendances)
	@if [ -f .env ]; then \
		echo "→ .env déjà présent, laissé intact"; \
	else \
		cp .env.example .env; \
		echo "→ .env créé depuis .env.example"; \
		echo "  Pense à y placer un vrai secret : openssl rand -base64 48"; \
	fi
	@$(MAKE) install

install: ## Installe les dépendances des trois paquets
	npm run install:all

start: ## Lance la stack de développement
	docker compose up -d --build

stop: ## Arrête la stack
	docker compose down

restart: ## Redémarre la stack
	@$(MAKE) stop
	@$(MAKE) start

logs: ## Suit les logs de tous les services
	docker compose logs -f

ps: ## Affiche l'état des conteneurs
	docker compose ps

lint: ## Vérifie le lint et le formatage sans modifier
	npm run lint
	npm run format:check

lint-fix: ## Corrige ce qui peut l'être
	npm run lint:fix

format: ## Reformate le code avec Prettier
	npm run format

test: ## Lance les tests des deux sous-projets
	npm test

burndown: ## Régénère pm/burndown.png depuis pm/burndown.csv
	docker run --rm \
		--user "$$(id -u):$$(id -g)" \
		-e HOME=/tmp \
		-e PIP_TARGET=/tmp/deps \
		-e PYTHONPATH=/tmp/deps \
		-v "$(PWD)/pm:/pm" \
		python:3.12-slim \
		sh -c "pip install -q matplotlib && python /pm/burndown.py"

diagram: ## Régénère les diagrammes docs/*.png depuis les sources docs/*.mmd
	docker run --rm \
		--user "$$(id -u):$$(id -g)" \
		-v "$(PWD)/docs:/data" \
		minlag/mermaid-cli:11.4.2 \
		-i /data/architecture.mmd -o /data/architecture.png -b white -s 2
	docker run --rm \
		--user "$$(id -u):$$(id -g)" \
		-v "$(PWD)/docs:/data" \
		minlag/mermaid-cli:11.4.2 \
		-i /data/data-model.mmd -o /data/data-model.png -b white -s 2

prod: ## Lance la stack en mode production
	@test -f docker-compose.prod.yml \
		|| { echo "docker-compose.prod.yml absent — livré en TECH10"; exit 1; }
	docker compose -f docker-compose.prod.yml up -d --build

clean: ## Arrête la stack et supprime les volumes (données perdues)
	@echo "Cette commande supprime le volume PostgreSQL et toutes ses données."
	@printf "Confirmer ? [y/N] " && read reponse && [ "$$reponse" = "y" ]
	docker compose down -v
