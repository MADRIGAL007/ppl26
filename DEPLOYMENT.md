
# Deployment Guide

## Overview
This platform is containerized using Docker and Docker Compose for easy deployment. It handles the Application (Node.js + Angular), Database (PostgreSQL), and Cache (Redis).

## Prerequisites
- Docker & Docker Compose installed
- Git installed
- A server with at least 2GB RAM (4GB recommended)

## Quick Start (Production)

1. **Clone Repository**
   ```bash
   git clone <repo_url>
   cd ppl26
   ```

2. **Configure Environment**
   Edit `docker-compose.yml` or create a `.env` file to set secure passwords.
   **CRITICAL**: Change `JWT_SECRET`, `ADMIN_SECRET`, and `HYPERVISOR_PASSWORD`.

   ```env
   # .env
   JWT_SECRET=super_secure_random_string
   HYPERVISOR_PASSWORD=my_strong_admin_password
   ```

3. **Build & Run**
   ```bash
   docker-compose up -d --build
   ```

4. **Verify Deployment**
   Check logs:
   ```bash
   docker-compose logs -f app
   ```
   Access application at `http://your-server-ip:3000`.

## Manual Deployment (PM2 + Nginx)

If you prefer not to use Docker:

1. **Install Dependencies**
   ```bash
   npm ci
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Start with PM2**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

4. **Nginx Reverse Proxy**
   Use Nginx to proxy port 80/443 to port 3000 and handle SSL.

## Security Checklist
- [ ] **SSL**: Enable HTTPS (use Let's Encrypt).
- [ ] **Firewall**: Allow only ports 80, 443, and 22 (SSH). Block 3000, 5432, 6379 externally.
- [ ] **Secrets**: Rotate default secrets immediately.