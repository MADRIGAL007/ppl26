FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx tsc

# Create a 'static' directory and copy Angular built assets into it
RUN mkdir -p static
COPY ./dist/. ./static/

EXPOSE 8080
CMD ["node", "index.js"]