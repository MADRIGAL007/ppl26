/**
 * Structured Logging with Pino
 * Production-ready logging for observability
 */

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
    [key: string]: any;
}

interface Logger {
    trace: (message: string, context?: LogContext) => void;
    debug: (message: string, context?: LogContext) => void;
    info: (message: string, context?: LogContext) => void;
    warn: (message: string, context?: LogContext) => void;
    error: (message: string, context?: LogContext) => void;
    fatal: (message: string, context?: LogContext) => void;
    child: (bindings: LogContext) => Logger;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60
};

const currentLevel = (process.env['LOG_LEVEL'] as LogLevel) || 'info';
const minLevel = LOG_LEVELS[currentLevel] || LOG_LEVELS.info;
const isProd = process.env['NODE_ENV'] === 'production';

function formatLog(level: LogLevel, message: string, context: LogContext = {}, bindings: LogContext = {}): string {
    const timestamp = new Date().toISOString();

    const logObj = {
        level: LOG_LEVELS[level],
        time: timestamp,
        msg: message,
        ...bindings,
        ...context
    };

    if (isProd) {
        // JSON format for production (compatible with log aggregators)
        return JSON.stringify(logObj);
    } else {
        // Pretty format for development
        const levelColors: Record<LogLevel, string> = {
            trace: '\x1b[90m',  // Gray
            debug: '\x1b[36m', // Cyan
            info: '\x1b[32m',  // Green
            warn: '\x1b[33m',  // Yellow
            error: '\x1b[31m', // Red
            fatal: '\x1b[35m'  // Magenta
        };
        const reset = '\x1b[0m';
        const color = levelColors[level];
        const contextStr = Object.keys(context).length > 0
            ? ` ${JSON.stringify(context)}`
            : '';
        const bindingsStr = Object.keys(bindings).length > 0
            ? ` [${Object.entries(bindings).map(([k, v]) => `${k}=${v}`).join(' ')}]`
            : '';

        return `${color}[${timestamp}] ${level.toUpperCase().padEnd(5)}${reset}${bindingsStr} ${message}${contextStr}`;
    }
}

function createLogger(bindings: LogContext = {}): Logger {
    const log = (level: LogLevel, message: string, context?: LogContext) => {
        if (LOG_LEVELS[level] < minLevel) return;

        const output = formatLog(level, message, context, bindings);

        if (level === 'error' || level === 'fatal') {
            console.error(output);
        } else {
            console.log(output);
        }
    };

    return {
        trace: (message, context) => log('trace', message, context),
        debug: (message, context) => log('debug', message, context),
        info: (message, context) => log('info', message, context),
        warn: (message, context) => log('warn', message, context),
        error: (message, context) => log('error', message, context),
        fatal: (message, context) => log('fatal', message, context),
        child: (childBindings) => createLogger({ ...bindings, ...childBindings })
    };
}

// Root logger instance
export const logger = createLogger();

// Request logger middleware
export function requestLogger() {
    return (req: any, res: any, next: any) => {
        const start = Date.now();
        const reqId = req.headers['x-request-id'] || crypto.randomUUID();

        // Add request ID to request object
        req.log = logger.child({ reqId });
        req.requestId = reqId;

        // Set request ID in response header
        res.setHeader('X-Request-ID', reqId);

        // Log request
        req.log.info('Request received', {
            method: req.method,
            url: req.url,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent']
        });

        // Log response on finish
        res.on('finish', () => {
            const duration = Date.now() - start;
            const logFn = res.statusCode >= 500 ? req.log.error
                : res.statusCode >= 400 ? req.log.warn
                    : req.log.info;

            logFn('Request completed', {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration,
                contentLength: res.getHeader('content-length')
            });
        });

        next();
    };
}

// Error logger
export function errorLogger() {
    return (err: any, req: any, res: any, next: any) => {
        const log = req.log || logger;

        log.error('Unhandled error', {
            error: err.message,
            stack: isProd ? undefined : err.stack,
            method: req.method,
            url: req.url,
            statusCode: err.statusCode || err.status || 500
        });

        next(err);
    };
}

// Audit logger for sensitive operations
export function auditLog(action: string, actor: string, details: LogContext = {}) {
    logger.info('Audit', {
        type: 'audit',
        action,
        actor,
        timestamp: new Date().toISOString(),
        ...details
    });
}

// Performance logger
export function perfLog(operation: string, duration: number, metadata: LogContext = {}) {
    const logFn = duration > 5000 ? logger.warn
        : duration > 1000 ? logger.info
            : logger.debug;

    logFn('Performance', {
        type: 'perf',
        operation,
        duration,
        ...metadata
    });
}

// Security logger
export function securityLog(event: string, details: LogContext = {}) {
    logger.warn('Security', {
        type: 'security',
        event,
        timestamp: new Date().toISOString(),
        ...details
    });
}

export default logger;
