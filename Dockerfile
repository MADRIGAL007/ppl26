# Use the official lightweight Node.js 18 image.
FROM node:18-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install dependencies.
RUN npm install

# Copy local code to the container image.
COPY . .

# Build the client-side JavaScript bundle using esbuild.
RUN npm run build

# Run the web service on container startup.
# Cloud Run will set the PORT environment variable, which index.tsx listens on.
CMD [ "npm", "start" ]
