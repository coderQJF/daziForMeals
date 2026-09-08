# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS development-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
RUN pnpm install --filter @fandazi/backend... --frozen-lockfile

FROM development-dependencies AS build
COPY backend backend
RUN pnpm --filter @fandazi/backend build

FROM base AS production-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
RUN pnpm install --filter @fandazi/backend... --prod --frozen-lockfile

FROM node:22-alpine AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /workspace/backend
RUN mkdir -p /data/avatars && chown node:node /data/avatars
COPY --from=production-dependencies /workspace/node_modules /workspace/node_modules
COPY --from=production-dependencies /workspace/backend/node_modules ./node_modules
COPY --from=build /workspace/backend/dist ./dist
COPY backend/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
