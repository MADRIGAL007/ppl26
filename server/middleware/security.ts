import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

// Rate limiting configurations
export const createRateLimit = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // SECURITY: Only skip rate limiting for health checks
      // Admin routes should be rate-limited to prevent brute-force attacks
      return req.path === '/api/health';
    }
  });
};

// Strict rate limiting for sensitive endpoints
export const strictRateLimit = createRateLimit(60 * 1000, 10); // 10 requests per minute
export const generalRateLimit = createRateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes

// Input validation middleware
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid input data',
      details: errors.array()
    });
  }
  next();
};

// SQL injection protection
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;
  // Basic sanitization - remove potential SQL injection characters
  return input.replace(/['";\\]/g, '').trim();
};

// XSS protection for user inputs
export const sanitizeHtml = (unsafe: string): string => {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Content Security Policy middleware
// Note: Using 'unsafe-inline' for both scripts and styles because:
// 1. Angular component styles generate inline styles without nonce attributes
// 2. Tailwind utilities use inline styles
// 3. When a nonce is present, 'unsafe-inline' is IGNORED per CSP spec
// Therefore, we cannot use nonces with Angular 18 without build-time nonce injection.
export const cspMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https://www.paypalobjects.com https://upload.wikimedia.org https://flagcdn.com",
      "connect-src 'self' ws: wss:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );
  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  next();
};

// Request logging middleware (for security monitoring)
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      ip,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent') || 'unknown'
    };

    // Log suspicious activities
    if (res.statusCode >= 400) {
      console.warn('[SECURITY] Suspicious request:', logEntry);
    } else if (duration > 5000) {
      console.warn('[PERFORMANCE] Slow request:', logEntry);
    }
  });

  next();
};

// Bot detection middleware
export const botDetection = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';

  // Known bot patterns
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /headless/i,
    /selenium/i,
    /puppeteer/i,
    /chrome-lighthouse/i
  ];

  const isBot = botPatterns.some(pattern => pattern.test(userAgent));

  if (isBot && !req.path.startsWith('/api/health')) {
    console.warn(`[SECURITY] Bot detected: ${userAgent} - ${req.ip}`);
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
};

// Session validation middleware
export const validateSession = (req: Request, res: Response, next: NextFunction) => {
  // This would be used for session-based authentication
  // For now, just ensure session ID is present for protected routes
  const sessionId = req.body?.sessionId || req.query?.id;

  if (req.path.startsWith('/api/sync') && !sessionId) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  next();
};

// Input sanitization middleware
export const sanitizeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Recursively sanitize request body
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeInput(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
};
