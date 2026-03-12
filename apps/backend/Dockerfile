FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile --filter @allcity/backend...

# ── Development image (used by docker-compose) ────────────────────────────────
FROM deps AS development
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/
EXPOSE 4000
CMD ["pnpm", "--filter", "@allcity/backend", "dev"]

# ── Production build ──────────────────────────────────────────────────────────
FROM deps AS production
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "apps/backend/src/index.js"]
