# Stage 1: Build Angular App
FROM node:20-slim AS build-ui
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build Server (and native deps for sqlite3)
FROM node:20-slim AS build-server
WORKDIR /app
# Install build tools for native modules (sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:server

# Stage 3: Runtime
FROM node:20-slim
WORKDIR /app

# Install production deps only (re-installing to ensure native bindings match runtime env)
COPY package*.json ./
RUN apt-get update && apt-get install -y python3 make g++ && \
    npm install --omit=dev && \
    apt-get remove -y python3 make g++ && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Copy artifacts
# Match angular.json output path (dist/app/browser)
COPY --from=build-ui /app/dist/app/browser ./static
COPY --from=build-server /app/dist-server ./dist-server

# Environment
ENV PORT=8080
ENV DATA_DIR=/app/data
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "dist-server/index.js"]
