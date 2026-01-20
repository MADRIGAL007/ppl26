# ============================================
# PayPal Verification App - Production Dockerfile
# Multi-stage build for optimized image size
# ============================================

# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --legacy-peer-deps

# Copy source files
COPY . .

# Build the application
RUN npm run build

# --- Production Stage ---
FROM node:22-alpine AS production

# Set Node environment
ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy package files
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy built artifacts
COPY --from=builder --chown=nodejs:nodejs /app/dist-server ./dist-server
COPY --from=builder --chown=nodejs:nodejs /app/static ./static

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose the application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start the server
CMD ["node", "dist-server/index.js"]
