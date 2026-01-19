# 🚀 Deployment Guide

This guide covers various deployment strategies for the PayPal Verification App, from simple Docker deployments to enterprise Kubernetes clusters.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Docker Compose](#docker-compose)
- [Google Cloud Run](#google-cloud-run)
- [AWS Deployment](#aws-deployment)
- [Kubernetes](#kubernetes)
- [Load Balancing](#load-balancing)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring Setup](#monitoring-setup)
- [Backup & Recovery](#backup--recovery)

## Prerequisites

### System Requirements
- **CPU**: 1 vCPU minimum, 2 vCPU recommended
- **Memory**: 512MB minimum, 1GB recommended
- **Storage**: 10GB minimum for database and logs
- **Network**: Stable internet connection

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)
- PostgreSQL 15+ (recommended)
- Redis 7+ (for production caching)

## Environment Setup

### Environment Variables
Create a `.env` file with the following variables:

```bash
# Application Configuration
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:password@db:5432/paypal_verifier
DB_SSL=true
DB_POOL_SIZE=10

# Security Configuration
JWT_SECRET=your-super-secure-jwt-secret-here
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=300000

# Redis Configuration (for rate limiting and caching)
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-redis-password

# Telegram Integration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
HYPERVISOR_USERNAME=hypervisor
HYPERVISOR_PASSWORD=your-secure-hypervisor-password

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# Security Headers
CSP_DIRECTIVES=default-src 'self'; script-src 'self' 'unsafe-inline'
```

### SSL Certificate Setup
For HTTPS deployment, obtain SSL certificates:

```bash
# Using Let's Encrypt
certbot certonly --webroot -w /var/www/html -d yourdomain.com

# Or using self-signed for testing
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365
```

## Docker Deployment

### Single Container Deployment

1. **Build the image**:
```bash
docker build -t paypal-verifier .
```

2. **Run the container**:
```bash
docker run -d \
  --name paypal-verifier \
  -p 8080:8080 \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  paypal-verifier
```

3. **Health check**:
```bash
curl http://localhost:8080/api/health
```

### Multi-Stage Build Optimization

The Dockerfile uses multi-stage builds for security and size optimization:

```dockerfile
# Build stage
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:22-slim AS production
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

## Docker Compose

### Basic Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/paypal_verifier
    depends_on:
      - db
    volumes:
      - ./data:/app/data

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: paypal_verifier
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Production Setup

For production, use `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - db
      - redis
    networks:
      - app-network

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: paypal_verifier
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - app-network

  nginx:
    image: nginx:1.25-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

## Google Cloud Run

### Deploy to Cloud Run

1. **Build and push to GCR**:
```bash
gcloud builds submit --tag gcr.io/$PROJECT_ID/paypal-verifier
```

2. **Deploy to Cloud Run**:
```bash
gcloud run deploy paypal-verifier \
  --image gcr.io/$PROJECT_ID/paypal-verifier \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest" \
  --set-secrets "JWT_SECRET=JWT_SECRET:latest"
```

3. **Set up Cloud SQL**:
```bash
gcloud sql instances create paypal-db \
  --database-version POSTGRES_15 \
  --cpu 1 \
  --memory 4GB \
  --region us-central1

gcloud sql databases create paypal_verifier \
  --instance paypal-db
```

## AWS Deployment

### ECS Fargate

1. **Create ECR repository**:
```bash
aws ecr create-repository --repository-name paypal-verifier
```

2. **Build and push image**:
```bash
aws ecr get-login-password | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker build -t paypal-verifier .
docker tag paypal-verifier:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/paypal-verifier:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/paypal-verifier:latest
```

3. **Create ECS cluster and service**:
```bash
# Using AWS CLI or Console
aws ecs create-cluster --cluster-name paypal-cluster
aws ecs create-service --cluster paypal-cluster --service-name paypal-service --task-definition paypal-task
```

### Elastic Beanstalk

1. **Initialize EB application**:
```bash
eb init paypal-verifier --platform node.js --region us-east-1
```

2. **Create environment**:
```bash
eb create production --instance-type t3.micro
```

3. **Deploy**:
```bash
eb deploy
```

## Kubernetes

### Basic Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: paypal-verifier
spec:
  replicas: 3
  selector:
    matchLabels:
      app: paypal-verifier
  template:
    metadata:
      labels:
        app: paypal-verifier
    spec:
      containers:
      - name: app
        image: paypal-verifier:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Service and Ingress

Create `k8s/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: paypal-verifier-service
spec:
  selector:
    app: paypal-verifier
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: paypal-verifier-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - yourdomain.com
    secretName: paypal-tls
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: paypal-verifier-service
            port:
              number: 80
```

### Database Setup

Create PostgreSQL deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: paypal_verifier
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
```

## Load Balancing

### Nginx Configuration

Create `nginx.conf`:

```nginx
upstream backend {
    server app1:8080;
    server app2:8080;
    server app3:8080;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Rate limiting
    limit_req zone=api burst=10 nodelay;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/health {
        proxy_pass http://backend;
        access_log off;
    }
}
```

### HAProxy Configuration

```haproxy
frontend http_front
    bind *:80
    default_backend backend

backend backend
    balance roundrobin
    server app1 app1:8080 check
    server app2 app2:8080 check
    server app3 app3:8080 check
```

## SSL/TLS Configuration

### Let's Encrypt with Certbot

```bash
# Install certbot
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d yourdomain.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Manual SSL Setup

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://backend;
    }
}
```

## Monitoring Setup

### Prometheus Metrics

Add to your application:

```typescript
import { collectDefaultMetrics, register } from 'prom-client';

// Enable default metrics
collectDefaultMetrics();

// Custom metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
  });
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Grafana Dashboard

Import the Node.js application dashboard from Grafana's official dashboards.

### Health Checks

```typescript
app.get('/health', (req, res) => {
  // Check database connectivity
  // Check Redis connectivity
  // Check external services

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'ok',
      redis: 'ok',
      telegram: 'ok'
    }
  });
});
```

## Backup & Recovery

### Database Backup

```bash
# PostgreSQL backup
pg_dump -h localhost -U user paypal_verifier > backup.sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > /backups/backup_$DATE.sql
find /backups -name "backup_*.sql" -mtime +7 -delete
```

### Application Backup

```bash
# Backup data directory
tar -czf data_backup.tar.gz /app/data

# Backup logs
tar -czf logs_backup.tar.gz /app/logs
```

### Disaster Recovery

1. **Stop the application**
2. **Restore database**:
```bash
psql -h localhost -U user paypal_verifier < backup.sql
```
3. **Restore data**:
```bash
tar -xzf data_backup.tar.gz -C /
```
4. **Restart application**

## Troubleshooting

### Common Issues

1. **Port conflicts**:
```bash
netstat -tulpn | grep :8080
```

2. **Memory issues**:
```bash
docker stats
# Check for memory leaks
```

3. **Database connection issues**:
```bash
# Test database connection
psql -h localhost -U user -d paypal_verifier
```

### Logs and Debugging

```bash
# Application logs
docker logs paypal-verifier

# Database logs
docker logs postgres

# System logs
journalctl -u docker -f
```

## Performance Tuning

### Application Optimization

```typescript
// Connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Compression
app.use(compression({
  level: 6,
  threshold: 1024
}));
```

### Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_sessions_last_seen ON sessions(last_seen);
CREATE INDEX idx_sessions_admin_id ON sessions(admin_id);

-- Connection pooling
SET max_connections = 200;
```

### Caching Strategy

```typescript
// Redis caching for sessions
const redis = new Redis(process.env.REDIS_URL);

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
```

This deployment guide provides comprehensive instructions for various deployment scenarios, from simple Docker setups to enterprise-grade Kubernetes deployments with monitoring, security, and backup strategies.