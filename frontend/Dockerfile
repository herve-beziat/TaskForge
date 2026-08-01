# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Base commune (étapes Node)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base

WORKDIR /app

LABEL org.opencontainers.image.title="taskforge-frontend"
LABEL org.opencontainers.image.description="Interface Vue 3 du helpdesk TaskForge"
LABEL org.opencontainers.image.source="https://github.com/herve-beziat/TaskForge"

# ---------------------------------------------------------------------------
# Développement — serveur Vite avec hot-reload
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

# ---------------------------------------------------------------------------
# Build — compile les sources en fichiers statiques dans dist/
# Cette étape n'est jamais publiée : elle sert d'atelier.
# ---------------------------------------------------------------------------
FROM base AS build

ENV NODE_ENV=development

# Vite incruste les variables VITE_* dans le bundle au moment de la compilation :
# il n'y a plus de serveur pour les lire à l'exécution. L'URL de l'API doit donc
# arriver comme argument de build, sinon le front construit pointerait dans le vide.
ARG VITE_API_URL=http://api.taskforge.localhost
ENV VITE_API_URL=$VITE_API_URL

RUN chown -R node:node /app

USER node

COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node . .

RUN npm run build

# ---------------------------------------------------------------------------
# Production — nginx sert dist/, sans Node ni node_modules
# ---------------------------------------------------------------------------
FROM nginx:1.30-alpine AS production

LABEL org.opencontainers.image.title="taskforge-frontend"
LABEL org.opencontainers.image.description="Interface Vue 3 du helpdesk TaskForge, servie par nginx"
LABEL org.opencontainers.image.source="https://github.com/herve-beziat/TaskForge"

# L'utilisateur nginx existe déjà dans l'image officielle. Il lui faut :
#   - les droits d'écriture sur le cache, les logs et le fichier PID
#   - la suppression de la directive « user nginx; », qui n'a de sens que
#     si le processus démarre en root pour abandonner ensuite ses privilèges
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /usr/share/nginx/html \
  && touch /var/run/nginx.pid \
  && chown nginx:nginx /var/run/nginx.pid \
  && sed -i '/^user /d' /etc/nginx/nginx.conf

COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

# Port non privilégié : un utilisateur non-root ne peut pas ouvrir le port 80.
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
