# Stage 1: Install dependencies
FROM node:20-slim AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/agent-manager/package.json packages/agent-manager/
COPY packages/claude-code-server/package.json packages/claude-code-server/

RUN pnpm install --frozen-lockfile || pnpm install

# Stage 2: Build
FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/agent-manager/node_modules ./packages/agent-manager/node_modules
COPY --from=deps /app/packages/claude-code-server/node_modules ./packages/claude-code-server/node_modules

COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=packages/core/prisma/schema.prisma

# Build packages in order
RUN pnpm -r build

# Stage 3: Runtime
FROM node:20-slim AS runner
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built outputs
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules

# Shared package
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Core package (includes Prisma)
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/prisma ./packages/core/prisma
COPY --from=builder /app/packages/core/node_modules ./packages/core/node_modules

# Agent Manager
COPY --from=builder /app/packages/agent-manager/package.json ./packages/agent-manager/
COPY --from=builder /app/packages/agent-manager/dist ./packages/agent-manager/dist

# Web Server (Next.js)
COPY --from=builder /app/packages/claude-code-server/package.json ./packages/claude-code-server/
COPY --from=builder /app/packages/claude-code-server/.next ./packages/claude-code-server/.next
COPY --from=builder /app/packages/claude-code-server/public ./packages/claude-code-server/public/
COPY --from=builder /app/packages/claude-code-server/next.config.js ./packages/claude-code-server/
COPY --from=builder /app/packages/claude-code-server/node_modules ./packages/claude-code-server/node_modules

# Guide documents
COPY --from=builder /app/guide ./guide

# Create data directories
RUN mkdir -p /app/data /app/projects

EXPOSE 3000

WORKDIR /app/packages/claude-code-server
CMD ["pnpm", "start"]
