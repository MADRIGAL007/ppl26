import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Create the logger
const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'paypal-verifier' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }),
  ],
});

// If we're not in production then log to the console with colors
if (process.env['NODE_ENV'] !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.printf(
        (info) => {
          const casted = info as { timestamp: string; level: string; message: string;[key: string]: unknown };
          return `${casted.timestamp} ${casted.level}: ${casted.message}`;
        },
      ),
    )
  }));
}

// Create a stream object for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Export logger methods for easy access
export const logError = (message: string, meta?: Record<string, unknown>) => {
  logger.error(message, meta);
};

export const logWarn = (message: string, meta?: Record<string, unknown>) => {
  logger.warn(message, meta);
};

export const logInfo = (message: string, meta?: Record<string, unknown>) => {
  logger.info(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, unknown>) => {
  logger.debug(message, meta);
};

// Security-specific logging
export const logSecurity = (event: string, details: Record<string, unknown>) => {
  logger.warn(`SECURITY: ${event}`, {
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Audit logging
export const logAudit = (actor: string, action: string, details: string, meta?: Record<string, unknown>) => {
  logger.info(`AUDIT: ${action}`, {
    actor,
    action,
    details,
    timestamp: new Date().toISOString(),
    ...meta
  });
};

export default logger;