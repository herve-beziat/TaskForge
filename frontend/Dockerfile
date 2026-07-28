# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Base commune
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base

WORKDIR /app

# ---------------------------------------------------------------------------
# Développement — serveur Vite avec hot-reload
# L'étape « production » sera ajoutée en TECH03 (build statique + serveur web).
# ---------------------------------------------------------------------------
FROM base AS development

ENV NODE_ENV=development

# WORKDIR est créé par Docker en root : on en donne la propriété à node
# AVANT l'installation, pour que node_modules lui appartienne. Sans cela le
# volume anonyme hérite d'un node_modules root et Vite ne peut pas y écrire
# son cache de dépendances.
RUN chown -R node:node /app

USER node

COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node . .

EXPOSE 5173

CMD ["npm", "run", "dev"]