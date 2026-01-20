# ============================================
# Multi-stage Docker Build for Production
# ============================================

# Global ARGs
ARG NODE_VERSION=22
ARG BUILDKIT_INLINE_CACHE=1

# Stage 1: Security scanning and dependency analysis
FROM node:${NODE_VERSION}-slim AS security-scan
WORKDIR /app
COPY package*.json ./
RUN apt-get update && apt-get install -y curl jq && \
    npm install --package-lock-only --ignore-scripts && \
    npm audit --audit-level high --json > /tmp/audit.json || true && \
    HIGH_VULNS=$(jq -r '.metadata.vulnerabilities.high // 0' /tmp/audit.json) && \
    CRITICAL_VULNS=$(jq -r '.metadata.vulnerabilities.critical // 0' /tmp/audit.json) && \
    echo "High: $HIGH_VULNS, Critical: $CRITICAL_VULNS" && \
    if [ "$HIGH_VULNS" -gt 0 ] || [ "$CRITICAL_VULNS" -gt 0 ]; then \
      echo "Security vulnerabilities found! High: $HIGH_VULNS, Critical: $CRITICAL_VULNS"; \
      exit 1; \
    else \
      echo "No high or critical vulnerabilities found"; \
    fi

# Stage 2: Build Angular App
FROM node:${NODE_VERSION}-slim AS build-ui
WORKDIR /app

# Install build tools for native modules (sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Security: Create non-root user for build
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# Copy package files first for better layer caching
COPY package*.json ./
COPY tsconfig.json ./
COPY angular.json ./

# Install dependencies with security checks
RUN npm ci --only=production=false --ignore-scripts && \
    npm audit --audit-level high

# Copy source code
COPY . .

# Build Angular app
RUN npm run build

# Stage 3: Build Server
FROM node:${NODE_VERSION}-slim AS build-server
WORKDIR /app

# Install build tools
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy package files
COPY package*.json ./
COPY server/tsconfig.server.json ./server/

# Install dependencies
RUN npm ci --only=production=false --ignore-scripts

# Copy source
COPY server/ ./server/
COPY jest.config.js ./

# Build server
RUN npm run build:server

# Stage 4: Production Runtime
FROM node:${NODE_VERSION}-slim AS production
WORKDIR /app

# Install security updates and required packages
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy package files for production dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy built artifacts
COPY --from=build-ui /app/dist/app/browser ./static
COPY --from=build-server /app/dist-server ./dist-server

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/logs && \
    chown -R appuser:appuser /app

# Security: Switch to non-root user
USER appuser

# Environment variables
ENV PORT=8080
ENV DATA_DIR=/app/data
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Expose port
EXPOSE ${PORT}

# Use exec form for proper signal handling
CMD ["node", "dist-server/index.js"]
