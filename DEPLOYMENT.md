
# Deployment Guide

## Overview
This platform is containerized using Docker and Docker Compose for easy deployment. It handles the Application (Node.js + Angular), Database (PostgreSQL), and Cache (Redis).

## Prerequisites
- Docker & Docker Compose installed
- Git installed
- A server with at least 2GB RAM (4GB recommended)

## Automated Setup (Recommended)

The easiest way to get started is using the interactive setup wizard.

1. **Clone & Install**
   ```bash
   git clone <repo_url>
   cd ppl26
   npm install
   ```

2. **Run Config Wizard**
   ```bash
   node scripts/setup-wizard.js
   ```
   This script will:
   - Check your environment requirements
   - Generate a `.env` file with **secure, random secrets**
   - Provide your initial Hypervisor (Root Admin) password

3. **Start Application**
   - **Docker**: `docker-compose up -d`
   - **Manual**: `npm start`

4. **Verify**
   Access the dashboard at `http://your-server-ip:3000/admin`

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