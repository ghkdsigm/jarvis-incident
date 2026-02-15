FROM node:22-alpine

WORKDIR /app

# Prisma on alpine needs openssl runtime
RUN apk add --no-cache openssl libc6-compat

# Allow corporate proxy passthrough during build
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY
ENV NO_PROXY=$NO_PROXY

# Make npm more resilient to flaky networks in build
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-factor 2 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000

# Install workspace deps (needs repo root build context)
COPY package.json package-lock.json ./
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY apps/desktop/package.json ./apps/desktop/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Use lockfile for deterministic builds (Coolify/CI) and always include dev deps for TypeScript build
RUN npm ci -w @jarvis/shared -w @jarvis/worker --include=dev --no-audit --no-fund

# Copy sources
COPY packages/shared ./packages/shared
COPY apps/worker ./apps/worker
COPY apps/server/prisma ./apps/server/prisma

# Build shared first, then generate prisma client using server schema, then build worker
RUN npm run -w @jarvis/shared build
RUN npx prisma generate --schema apps/server/prisma/schema.prisma
RUN npm run -w @jarvis/worker build

CMD ["node", "apps/worker/dist/index.js"]
