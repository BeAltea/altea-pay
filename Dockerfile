# AlteaPay web (Next.js 14) — imagem local para o cluster (OrbStack k8s, ARM64).
# Multi-stage, non-root. Build com pnpm (repo usa pnpm-lock.yaml). Sem
# output:standalone (next.config.mjs preservado p/ Netlify): roda `next start`.
# Build no Mac (arm64) via OrbStack produz imagem ARM64; imagePullPolicy
# IfNotPresent usa a imagem local sem registry.
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
USER nextjs
EXPOSE 3000
# readiness/liveness: GET /api/ready e /api/health (ver app/api/*).
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
