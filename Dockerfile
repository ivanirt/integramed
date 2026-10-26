# Tests need Node >= 22.6 (--experimental-strip-types).
# OS CAs are applied in server/index.js when tls.setDefaultCACertificates exists (Node >= 22.19).
ARG NODE_VERSION=22.23.3

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# public/ holds static assets (iris maps and similar). modules/ will hold
# specialized modules such as iridology. Neither is required in the repo yet;
# create them when missing so the runtime copy never fails the build.
RUN mkdir -p public modules
RUN npm run build
# The build cache is not needed at runtime. Leaving it makes the later
# chown of .next/cache copy the whole tree into a second layer.
RUN rm -rf .next/cache
# The build needs TypeScript, Tailwind, and ESLint. The runner does not:
# `node --experimental-strip-types` is built into Node 22 and is what
# create-user, set-password, and seed:yeshua use. Scoped dirs can survive
# prune as empty folders; they are not imported.
RUN npm prune --omit=dev \
  && rm -rf node_modules/@tailwindcss node_modules/@types

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next.js listens on 3000 (`next start -p 3000`). The loopback FHIR proxy
# listens on FHIR_PROXY_PORT. PORT is left unset: Dokploy may inject it, and
# neither process reads it, so it cannot move the proxy onto 3000 or take
# Next off the published port.
ENV FHIR_PROXY_PORT=3001
ENV INTEGRAMED_AUTH_ROOT=/app/data/auth
ENV INTEGRAMED_FHIR_ROOT=/app/data/fhir
ENV INTEGRAMED_VAULT_ROOT=/app/data/vault
# npm start logs under HOME. Keep that off the image tree.
ENV HOME=/tmp

RUN addgroup -S -g 1001 integramed \
  && adduser -S -D -H -u 1001 -G integramed integramed

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server ./server
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/vault-es ./vault-es
COPY --from=builder /app/vault-en ./vault-en
COPY --from=builder /app/public ./public
COPY --from=builder /app/modules ./modules
# Password CLIs and the FHIR proxy load these at runtime (strip-types + relative imports).
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib ./src/lib
# Writable paths only. Next writes its image and fetch caches under an empty
# .next/cache; the prebuilt server output stays root-owned. vault-es and
# vault-en stay root-owned: they are the bundled notes. Imports and settings
# go to /app/data/vault. There is no root entrypoint.
RUN mkdir -p /app/data/auth /app/data/fhir /app/data/vault /app/.next/cache \
  && chown -R integramed:integramed /app/data /app/.next/cache
EXPOSE 3000
VOLUME ["/app/data/auth", "/app/data/fhir", "/app/data/vault"]
# Readiness: GET http://127.0.0.1:3000/healthz
# Port 3000 is Next.js, the published listener. No cookie and no secret.
# That route also asks the loopback proxy GET /healthz (1s timeout, cached 3s, no auth).
# This command aborts its own fetch after 3s, inside the 5s HEALTHCHECK timeout.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "scripts/healthcheck.mjs"]
USER integramed
# Supervisor is PID 1 so docker stop's SIGTERM exits 0. A child that exits
# on its own exits the container non-zero. See scripts/supervise.mjs.
CMD ["node", "scripts/supervise.mjs"]
