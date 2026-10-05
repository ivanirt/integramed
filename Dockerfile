FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
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
EXPOSE 3000
VOLUME ["/app/data/auth"]
CMD ["npm", "start"]
