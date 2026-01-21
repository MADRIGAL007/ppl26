import { Request, Response, NextFunction } from 'express';
import * as db from '../db';

/**
 * Extended Request interface with tenant context
 */
export interface TenantRequest extends Request {
    org?: {
        id: string;
        name: string;
        slug: string;
        plan: string;
        settings: Record<string, any>;
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
    };
    orgId?: string;
    planLimits?: {
        maxLinks: number;
        maxSessionsPerMonth: number;
        maxUsers: number;
        maxApiKeys: number;
        features: string[];
    };
}

/**
 * Resolves tenant context from various sources:
 * 1. Subdomain (e.g., acme.ppl26.com)
 * 2. X-Organization-ID header
 * 3. JWT claim (orgId)
 * 4. Query parameter (?org=acme)
 */
export async function resolveTenant(
    req: TenantRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Skip tenant resolution for public routes
        const publicRoutes = ['/api/health', '/api/auth/login', '/api/auth/register', '/api/stripe/webhook'];
        if (publicRoutes.some(route => req.path.startsWith(route))) {
            return next();
        }

        // Priority 1: Subdomain
        const hostParts = req.hostname.split('.');
        const subdomain = hostParts.length > 2 ? hostParts[0] : null;

        // Priority 2: Header
        const headerOrg = req.headers['x-organization-id'] as string;

        // Priority 3: JWT claim
        const jwtOrg = (req as any).user?.orgId;

        // Priority 4: Query parameter
        const queryOrg = req.query.org as string;

        // Determine org identifier (subdomain takes precedence unless it's 'app' or 'api')
        let orgIdentifier: string | null = null;
        if (subdomain && !['app', 'api', 'www'].includes(subdomain)) {
            orgIdentifier = subdomain;
        } else {
            orgIdentifier = headerOrg || jwtOrg || queryOrg || null;
        }

        if (!orgIdentifier) {
            res.status(400).json({
                error: 'Organization context required',
                hint: 'Set X-Organization-ID header or use subdomain'
            });
            return;
        }

        // Fetch organization
        const org = await db.getOrganizationBySlug(orgIdentifier);
        if (!org) {
            // Try by ID if slug lookup fails
            const orgById = await db.getOrganizationById(orgIdentifier);
            if (!orgById) {
                res.status(404).json({ error: 'Organization not found' });
                return;
            }
            req.org = orgById;
            req.orgId = orgById.id;
        } else {
            req.org = org;
            req.orgId = org.id;
        }

        // Fetch plan limits
        const limits = await db.getPlanLimits(req.org!.plan);
        req.planLimits = limits;

        next();
    } catch (error) {
        console.error('[Tenant] Resolution error:', error);
        res.status(500).json({ error: 'Failed to resolve tenant' });
    }
}

/**
 * Enforces plan limits for specific actions
 */
export function enforcePlanLimit(limitType: 'links' | 'users' | 'apiKeys') {
    return async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
        if (!req.orgId || !req.planLimits) {
            res.status(400).json({ error: 'Organization context required' });
            return;
        }

        const limits = req.planLimits;
        let current: number;
        let max: number;

        switch (limitType) {
            case 'links':
                current = await db.getLinkCount(req.orgId);
                max = limits.maxLinks;
                break;
            case 'users':
                current = await db.getUserCount(req.orgId);
                max = limits.maxUsers;
                break;
            case 'apiKeys':
                current = await db.getApiKeyCount(req.orgId);
                max = limits.maxApiKeys;
                break;
        }

        // -1 means unlimited
        if (max !== -1 && current >= max) {
            res.status(403).json({
                error: `Plan limit exceeded`,
                message: `Your ${req.org!.plan} plan allows ${max} ${limitType}. Current: ${current}`,
                upgrade: '/billing/upgrade'
            });
            return;
        }

        next();
    };
}

/**
 * Validates that the user belongs to the organization
 */
export async function validateOrgMembership(
    req: TenantRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    const user = (req as any).user;

    if (!user || !req.orgId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    if (user.orgId !== req.orgId) {
        res.status(403).json({ error: 'Access denied to this organization' });
        return;
    }

    next();
}

/**
 * Injects org_id into database queries automatically
 * Use as a helper in route handlers
 */
export function withTenant<T>(req: TenantRequest, data: T): T & { org_id: string } {
    return { ...data, org_id: req.orgId! };
}
