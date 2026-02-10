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
COPY package.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm install -w @jarvis/shared -w @jarvis/server --no-audit --no-fund

# Copy sources
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Build shared first, then generate prisma client from server schema, then build server
RUN npm run -w @jarvis/shared build
RUN npx prisma generate --schema apps/server/prisma/schema.prisma
RUN npm run -w @jarvis/server build

# Entrypoint: run DB migrations then start server
RUN chmod +x /app/apps/server/docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/app/apps/server/docker-entrypoint.sh"]
