
# Stage 1: Builder
FROM mcr.microsoft.com/playwright:v1.41.1-jammy AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Stage 2: Production Runner
FROM mcr.microsoft.com/playwright:v1.41.1-jammy

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Create non-root user? Playwright image usually runs as root or 'pwuser'. 
# We'll stick to default for now to ensure browser permissions work, or use 'pwuser' if verified.
# 'pwuser' is often included. Let's try to run as root for maximum compatibility with sandboxing in container environment, 
# OR use existing user if documented. 
# For safety in this environment, we will run as root but warn. 
# Actually, standard practice for Puppeteer/Playwright in Docker is notoriously fickle with permissions.
# We will omit USER switching for this specific phase to guarantee browser launch success.

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
