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
COPY apps/server/package.json ./apps/server/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/desktop/package.json ./apps/desktop/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Use lockfile for deterministic builds (Coolify/CI) and always include dev deps for TypeScript build.
# If npm fails (Coolify often truncates logs), print the latest npm debug log for easier diagnosis.
RUN npm ci -w @jarvis/shared -w @jarvis/server --include=dev --no-audit --no-fund || ( \
    echo "npm ci failed; dumping latest npm debug log..." && \
    log="$(ls -1t /root/.npm/_logs/*.log 2>/dev/null | head -n1)" && \
    echo "log: ${log:-<none>}" && \
    if [ -n "$log" ]; then tail -n 300 "$log"; fi && \
    exit 1 \
  )

# Copy sources
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Build shared first, then generate prisma client from server schema, then build server
RUN npm run -w @jarvis/shared build
RUN npx prisma generate --schema apps/server/prisma/schema.prisma
RUN npm run -w @jarvis/server build

# Entrypoint: run DB migrations then start server
# NOTE: On Windows checkouts this script may have CRLF line endings, which breaks execution in Alpine.
RUN sed -i 's/\r$//' /app/apps/server/docker-entrypoint.sh \
  && chmod +x /app/apps/server/docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/app/apps/server/docker-entrypoint.sh"]
