# syntax=docker/dockerfile:1.6
#
# Multi-stage Dockerfile for AI Image Generator Platform.
# Optimized for Next.js standalone output + Prisma SQLite.

# -----------------------------
# Stage 1: deps (install all deps incl. dev)
# -----------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Use npm ci if a lockfile is present, otherwise npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# -----------------------------
# Stage 2: builder (compile Next.js)
# -----------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use a placeholder DATABASE_URL just to satisfy `prisma generate`
ENV DATABASE_URL="file:./prisma/build.db"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

# -----------------------------
# Stage 3: runner (slim production image)
# -----------------------------
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl tini

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create app user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

# Copy Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema, generated client, and the Prisma CLI for runtime migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Persistent data dir for SQLite
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Entrypoint runs migrations + seed before starting the server
COPY --chown=nextjs:nodejs deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
