# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Base commune
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base

WORKDIR /app

LABEL org.opencontainers.image.title="taskforge-backend"
LABEL org.opencontainers.image.description="API NestJS du helpdesk TaskForge"
LABEL org.opencontainers.image.source="https://github.com/herve-beziat/TaskForge"

# ---------------------------------------------------------------------------
# Développement — hot-reload, dépendances complètes
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

# ---------------------------------------------------------------------------
# Build — compile le TypeScript en JavaScript dans dist/
# Cette étape n'est jamais publiée : elle sert d'atelier.
# ---------------------------------------------------------------------------
FROM base AS build

ENV NODE_ENV=development

RUN chown -R node:node /app

USER node

COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node . .

RUN npm run build

# ---------------------------------------------------------------------------
# Production — dist/ et dépendances d'exécution uniquement
# ---------------------------------------------------------------------------
FROM base AS production

ENV NODE_ENV=production

RUN chown -R node:node /app

USER node

COPY --chown=node:node package*.json ./

# --omit=dev écarte TypeScript, Jest, ESLint et l'outillage de build :
# c'est l'essentiel du gain de taille.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 3000

# Forme shell volontaire : en forme exec, ${BACKEND_PORT} ne serait pas interprété.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:${BACKEND_PORT:-3000}/ || exit 1

CMD ["node", "dist/main"]