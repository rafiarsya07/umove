# syntax=docker/dockerfile:1
# UMove: one image that serves the web app and the API.
# Built on the mini PC by `docker compose up -d --build`.

# ---- 1. Build the web app ------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# ---- 2. Build the API ----------------------------------------------------
FROM node:22-alpine AS api
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY app/tsconfig.json ./
COPY app/src ./src
RUN npm run build && npm prune --omit=dev

# ---- 3. Runtime: small, non-root, no build tools -------------------------
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    WEB_DIST=/app/public
WORKDIR /app
COPY --from=api --chown=root:root /app/node_modules ./node_modules
COPY --from=api --chown=root:root /app/dist ./dist
COPY --from=api --chown=root:root /app/package.json ./
COPY --from=web --chown=root:root /web/dist ./public
# Files are owned by root and read-only to the app user: the process
# cannot modify its own code even if it were compromised.
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--disable-proto=delete", "dist/index.js"]
