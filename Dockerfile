# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Auth and DB modules load at build time; values are unused until runtime.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgres://build:build@127.0.0.1:5432/build \
    AUTH_SECRET=build-time-secret-not-used \
    AUTH_URL=http://localhost:3000 \
    ROOT_DOMAIN=localhost:3000 \
    EMAIL_SERVER=smtp://127.0.0.1:1025 \
    EMAIL_FROM="Longhand <noreply@localhost>"

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# OG images read TTF files from app/fonts at runtime.
COPY --from=build /app/app/fonts/literata-400.ttf ./app/fonts/literata-400.ttf
COPY --from=build /app/app/fonts/dm-mono-400.ttf ./app/fonts/dm-mono-400.ttf

# Migrate script + SQL migrations (no drizzle-kit).
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=build /app/drizzle ./drizzle
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps /app/node_modules/postgres ./node_modules/postgres

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
