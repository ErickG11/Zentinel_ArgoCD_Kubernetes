# syntax=docker/dockerfile:1
# Imagen multi-stage de Zentinel Store (Zentinel Labs).
# Contexto de construcción: la carpeta app/  →  docker build -t <usuario>/zentinel-store:1.0.0 app/

# ---------- Etapa 1: compilar el frontend (React + Vite) ----------
FROM node:20-alpine AS web-build
WORKDIR /build/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ---------- Etapa 2: compilar el servidor (TypeScript) y dejar solo deps de producción ----------
FROM node:20-alpine AS server-build
WORKDIR /build/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build && npm prune --omit=dev && npm cache clean --force

# ---------- Etapa 3: runtime mínimo ----------
FROM node:20-alpine AS runtime
# Versión y commit quedan "horneados" en la imagen; el Deployment puede sobrescribir APP_VERSION.
ARG APP_VERSION=1.0.0
ARG GIT_COMMIT=unknown
ENV NODE_ENV=production \
    PORT=3000 \
    APP_VERSION=${APP_VERSION} \
    GIT_COMMIT=${GIT_COMMIT}

WORKDIR /app/server
COPY --from=server-build --chown=node:node /build/server/node_modules ./node_modules
COPY --from=server-build --chown=node:node /build/server/dist ./dist
COPY --from=server-build --chown=node:node /build/server/package.json ./package.json
# El servidor busca el frontend en ../web/dist (relativo a /app/server/dist/config).
COPY --from=web-build --chown=node:node /build/web/dist /app/web/dist

# Usuario no-root (UID 1000, incluido en la imagen oficial)
USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
