/**
 * Global Error Handler Middleware
 * Provides centralized error handling with structured responses
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

// Custom error classes
export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    public code?: string;

    constructor(message: string, statusCode: number = 500, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    public details: any[];

    constructor(message: string, details: any[] = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'AUTH_ERROR');
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Insufficient permissions') {
        super(message, 403, 'FORBIDDEN');
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT');
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource conflict') {
        super(message, 409, 'CONFLICT');
    }
}

// Error response interface
interface ErrorResponse {
    error: string;
    code?: string;
    details?: any[];
    requestId?: string;
    timestamp: number;
}

interface ExtendedError extends Error {
    statusCode?: number;
    status?: number;
    code?: string;
    type?: string;
}

interface RequestWithUser extends Request {
    user?: {
        id: string;
    }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Global error handler middleware
 * Must be added LAST in the middleware chain
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Generate request ID for tracking
    const requestId = (req.headers['x-request-id'] as string) || (crypto.randomUUID?.() || Date.now().toString());

    // Default error values
    let statusCode = 500;
    let message = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';
    let details: any[] | undefined;

    // Handle different error types
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        code = err.code || 'APP_ERROR';
        if (err instanceof ValidationError) {
            details = err.details;
        }
    } else if (err instanceof ZodError) {
        statusCode = 400;
        message = 'Validation failed';
        code = 'VALIDATION_ERROR';
        details = err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
        }));
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    } else {
        const extendedErr = err as ExtendedError;
        if (extendedErr.code === 'EBADCSRFTOKEN') {
            statusCode = 403;
            message = 'Invalid CSRF token';
            code = 'CSRF_ERROR';
        } else if (extendedErr.type === 'entity.too.large') {
            statusCode = 413;
            message = 'Payload too large';
            code = 'PAYLOAD_TOO_LARGE';
        } else if (extendedErr.statusCode || extendedErr.status) {
            // Handle generic Express errors (like body-parser SyntaxError)
            statusCode = extendedErr.statusCode || extendedErr.status || 500;
            if (statusCode === 400 && extendedErr.type === 'entity.parse.failed') {
                message = 'Invalid JSON';
                code = 'INVALID_JSON';
            }
        }
    }

    // Log error (don't log 4xx client errors at error level)
    const logData = {
        requestId,
        method: req.method,
        path: req.path,
        statusCode,
        message: err.message,
        stack: statusCode >= 500 ? err.stack : undefined,
        userId: (req as RequestWithUser).user?.id
    };

    if (statusCode >= 500) {
        logger.error('[Error Handler]', logData);
    } else {
        logger.warn('[Error Handler]', logData);
    }

    // Build response
    const response: ErrorResponse = {
        error: message,
        code,
        timestamp: Date.now()
    };

    if (details) {
        response.details = details;
    }

    // Include request ID in production for support
    if (process.env['NODE_ENV'] === 'production') {
        response.requestId = requestId;
    }

    // Don't leak stack traces in production
    if (process.env['NODE_ENV'] !== 'production' && statusCode >= 500) {
        (response as any).stack = err.stack;
    }

    res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            error: 'Endpoint not found',
            code: 'NOT_FOUND',
            path: req.path,
            timestamp: Date.now()
        });
    }
    next();
};

/**
 * Unhandled rejection handler
 * Should be called at server startup
 */
export const setupGlobalErrorHandlers = () => {
    process.on('unhandledRejection', (reason: Error) => {
        logger.error('[Unhandled Rejection]', { error: reason.message, stack: reason.stack });
    });

    process.on('uncaughtException', (error: Error) => {
        logger.error('[Uncaught Exception]', { error: error.message, stack: error.stack });
        // Give time for logs to flush, then exit
        setTimeout(() => process.exit(1), 1000);
    });
};
