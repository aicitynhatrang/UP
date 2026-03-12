FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/bot/package.json ./apps/bot/
RUN pnpm install --frozen-lockfile --filter @allcity/bot...

# ── Development image (used by docker-compose) ────────────────────────────────
FROM deps AS development
COPY packages/ ./packages/
COPY apps/bot/ ./apps/bot/
CMD ["pnpm", "--filter", "@allcity/bot", "dev"]

# ── Production image ──────────────────────────────────────────────────────────
FROM deps AS production
COPY packages/ ./packages/
COPY apps/bot/ ./apps/bot/
ENV NODE_ENV=production
CMD ["node", "apps/bot/src/index.js"]
