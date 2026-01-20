# Deployment Guide

## Render.com Deployment Options

### Option 1: Native Node.js Deployment (Recommended)

Render.com supports native Node.js deployments without Docker, which is simpler and more reliable than Docker builds.

#### Setup Steps:

1. **Connect Repository**: Connect your GitHub repository to Render.com

2. **Create Web Service**:
   - Service Type: `Web Service`
   - Runtime: `Node`
   - Build Command: `npm run build:prod`
   - Start Command: `npm start`

3. **Environment Variables**: Set the following environment variables:
   ```
   NODE_ENV=production
   PORT=10000
   DATA_DIR=/tmp/data
   LOG_LEVEL=info
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_secure_jwt_secret
   ADMIN_USERNAME=your_admin_username
   ADMIN_PASSWORD=your_secure_admin_password
   ```

4. **Deploy**: Render.com will automatically build and deploy your application

### Option 2: Docker Deployment (Current)

If you prefer to use Docker, the current Dockerfile should work with the latest fixes.

#### Issues Resolved:
- Angular CLI is now installed globally in the Docker container
- Build process should complete without "executable not found" errors

### Troubleshooting

#### Build Failures:
- Ensure all environment variables are set
- Check that PostgreSQL database is accessible
- Verify that JWT_SECRET is at least 32 characters long

#### Runtime Issues:
- Check application logs in Render.com dashboard
- Verify database connectivity
- Ensure all required environment variables are configured

### Performance Optimization

For production deployments:
- Use PostgreSQL instead of SQLite
- Configure Redis for session storage and rate limiting
- Set appropriate Node.js memory limits
- Enable health checks

### Security Considerations

- Use strong, unique passwords for admin accounts
- Generate secure JWT secrets (minimum 32 characters)
- Configure CORS properly for your domain
- Use HTTPS (enabled by default on Render.com)