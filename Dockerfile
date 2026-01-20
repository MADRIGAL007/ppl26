# ============================================
# Optimized Docker Build for Production Deployment
# ============================================

ARG NODE_VERSION=18

FROM node:${NODE_VERSION}-slim AS builder

# Set environment variables for build
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"
# Ensure devDependencies are installed for the build
ENV NPM_CONFIG_PRODUCTION=false

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./
COPY angular.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --legacy-peer-deps --include=dev

# Install Angular CLI globally to ensure it's available
RUN npm install -g @angular/cli

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ============================================
# Production Runtime Image
# ============================================

ARG NODE_VERSION=18

FROM node:${NODE_VERSION}-slim AS production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/dist/app/browser ./static
COPY --from=builder /app/dist-server ./dist-server

# Create necessary directories
RUN mkdir -p /app/data /app/logs && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Environment variables
ENV PORT=8080
ENV DATA_DIR=/app/data
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "dist-server/index.js"]
