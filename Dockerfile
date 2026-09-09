# Multi-stage Dockerfile for IntegraMed (Vite Frontend + Express FHIR Proxy)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies for build
RUN npm ci

# Copy project files
COPY . .

# Build frontend to /app/dist
RUN npm run build

# Prune dev dependencies for lean production container
RUN npm prune --production

# Production runner image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy build artifacts and production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vault ./vault

EXPOSE 3001

# Start production server
CMD ["node", "server/index.js"]
