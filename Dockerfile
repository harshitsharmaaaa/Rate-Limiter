# ==================== Builder Stage ====================
FROM oven/bun:1.3.9-alpine AS builder

WORKDIR /app

# Set DATABASE_URL for Prisma generate (needs to be set before prisma commands)
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"

# Copy package files first for better caching
# bun.lock must be present for --frozen-lockfile (do not ignore it in .dockerignore)
COPY package.json bun.lock ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies from the lockfile for reproducible builds
RUN bun install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma client (no live DB needed for generate)
RUN bunx prisma generate

# ==================== Production Stage ====================
FROM oven/bun:1.3.9-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bunuser -u 1001 -G nodejs

# Copy built dependencies and generated files from builder
COPY --from=builder --chown=bunuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bunuser:nodejs /app/generated ./generated
COPY --from=builder --chown=bunuser:nodejs /app/package.json ./
COPY --from=builder --chown=bunuser:nodejs /app/bun.lock ./
COPY --from=builder --chown=bunuser:nodejs /app/prisma ./prisma
COPY --from=builder --chown=bunuser:nodejs /app/prisma.config.ts ./

# Copy source code
COPY --chown=bunuser:nodejs tsconfig.json ./
COPY --chown=bunuser:nodejs src ./src

# Set environment to production
ENV NODE_ENV=production

# Switch to non-root user
USER bunuser

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD bun run src/scripts/healthcheck.ts || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application (with migrations)
CMD ["bun", "run", "src/scripts/start.ts"]
