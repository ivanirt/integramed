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

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV INTEGRAMED_AUTH_ROOT=/app/data/auth
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
EXPOSE 3000
VOLUME ["/app/data/auth"]
CMD ["npm", "start"]
