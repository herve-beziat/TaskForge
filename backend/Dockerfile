# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Base commune
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base

WORKDIR /app

# ---------------------------------------------------------------------------
# Développement — hot-reload, dépendances complètes
# L'étape « production » sera ajoutée en TECH03 (multi-stage).
# ---------------------------------------------------------------------------
FROM base AS development

ENV NODE_ENV=development

# Propriété de /app donnée à node avant l'installation, pour que node_modules
# appartienne à l'utilisateur non-root et reste inscriptible depuis le volume.
RUN chown -R node:node /app

USER node

# Copié séparément : la couche reste en cache tant que les dépendances
# ne bougent pas, ce qui évite de réinstaller à chaque changement de code.
COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]