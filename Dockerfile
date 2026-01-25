
# Stage 1: Builder
FROM mcr.microsoft.com/playwright:v1.41.1-jammy AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

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
RUN npm ci --only=production --legacy-peer-deps

# Copy built artifacts
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/static ./static

EXPOSE 8080

CMD ["node", "dist-server/index.js"]
