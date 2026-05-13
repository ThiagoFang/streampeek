# syntax=docker/dockerfile:1.7
# Build context = monorepo root (so we can use the workspace bun.lock)
# Build with: docker build -f apps/api/Dockerfile -t streampeek-api .

FROM oven/bun:1.2-slim AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/desktop/package.json ./apps/desktop/
RUN bun install --frozen-lockfile --filter @streampeek/api

FROM oven/bun:1.2-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api ./apps/api
RUN cd apps/api && bunx prisma generate --config prisma/prisma.config.ts

FROM oven/bun:1.2-slim AS release
WORKDIR /app
ENV NODE_ENV=production
# OpenSSL is required by Prisma's query engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/package.json ./package.json
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "bunx prisma migrate deploy --config prisma/prisma.config.ts && bun src/server.ts"]
