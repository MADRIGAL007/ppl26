/**
 * Organization Management Module
 * Handles all organization/tenant CRUD operations for SaaS multi-tenancy
 */

import crypto from 'crypto';
import { pgPool, sqliteDb, isPostgres } from './core';

// Removed manual init in favor of shared core module


// --- Interfaces ---

export interface Organization {
    id: string;
    name: string;
    slug: string;
    plan: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    settings: Record<string, any>;
    createdAt: number;
    updatedAt: number;
}

export interface PlanLimits {
    maxLinks: number;
    maxSessionsPerMonth: number;
    maxUsers: number;
    maxApiKeys: number;
    features: string[];
}

export interface ApiKey {
    id: string;
    orgId: string;
    name: string;
    keyHash: string;
    permissions: string[];
    lastUsedAt?: number;
    expiresAt?: number;
    createdAt: number;
}

export interface Invitation {
    id: string;
    orgId: string;
    email: string;
    role: string;
    token: string;
    invitedBy: string;
    expiresAt: number;
    acceptedAt?: number;
    createdAt: number;
}

// --- Organization CRUD ---

export async function createOrganization(data: {
    name: string;
    slug: string;
    plan?: string;
    settings?: Record<string, any>;
}): Promise<Organization> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const plan = data.plan || 'free';
    const settings = JSON.stringify(data.settings || {});

    if (isPostgres) {
        await pgPool!.query(`
            INSERT INTO organizations (id, name, slug, plan, settings, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), to_timestamp($7 / 1000.0))
        `, [id, data.name, data.slug, plan, settings, now, now]);
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run(`
                INSERT INTO organizations (id, name, slug, plan, settings, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [id, data.name, data.slug, plan, settings, now, now], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    return {
        id,
        name: data.name,
        slug: data.slug,
        plan,
        settings: data.settings || {},
        createdAt: now,
        updatedAt: now
    };
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT * FROM organizations WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        return mapOrgRow(result.rows[0]);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.get('SELECT * FROM organizations WHERE id = ?', [id], (err: any, row: any) => {
                if (err) reject(err);
                else resolve(row ? mapOrgRow(row) : null);
            });
        });
    }
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT * FROM organizations WHERE slug = $1', [slug]);
        if (result.rows.length === 0) return null;
        return mapOrgRow(result.rows[0]);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.get('SELECT * FROM organizations WHERE slug = ?', [slug], (err: any, row: any) => {
                if (err) reject(err);
                else resolve(row ? mapOrgRow(row) : null);
            });
        });
    }
}

export async function getOrganizationByStripeCustomer(customerId: string): Promise<Organization | null> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT * FROM organizations WHERE stripe_customer_id = $1', [customerId]);
        if (result.rows.length === 0) return null;
        return mapOrgRow(result.rows[0]);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.get('SELECT * FROM organizations WHERE stripe_customer_id = ?', [customerId], (err: any, row: any) => {
                if (err) reject(err);
                else resolve(row ? mapOrgRow(row) : null);
            });
        });
    }
}

export async function updateOrganization(id: string, updates: Partial<Organization>): Promise<void> {
    const now = Date.now();
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
        fields.push(isPostgres ? `name = $${paramIndex++}` : 'name = ?');
        values.push(updates.name);
    }
    if (updates.plan !== undefined) {
        fields.push(isPostgres ? `plan = $${paramIndex++}` : 'plan = ?');
        values.push(updates.plan);
    }
    if (updates.stripeCustomerId !== undefined) {
        fields.push(isPostgres ? `stripe_customer_id = $${paramIndex++}` : 'stripe_customer_id = ?');
        values.push(updates.stripeCustomerId);
    }
    if (updates.stripeSubscriptionId !== undefined) {
        fields.push(isPostgres ? `stripe_subscription_id = $${paramIndex++}` : 'stripe_subscription_id = ?');
        values.push(updates.stripeSubscriptionId);
    }
    if (updates.settings !== undefined) {
        fields.push(isPostgres ? `settings = $${paramIndex++}` : 'settings = ?');
        values.push(JSON.stringify(updates.settings));
    }

    if (isPostgres) {
        fields.push(`updated_at = to_timestamp($${paramIndex++} / 1000.0)`);
    } else {
        fields.push('updated_at = ?');
    }
    values.push(now);
    values.push(id);

    const query = `UPDATE organizations SET ${fields.join(', ')} WHERE id = ${isPostgres ? `$${paramIndex}` : '?'}`;

    if (isPostgres) {
        await pgPool!.query(query, values);
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run(query, values, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

export async function deleteOrganization(id: string): Promise<void> {
    if (isPostgres) {
        await pgPool!.query('DELETE FROM organizations WHERE id = $1', [id]);
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run('DELETE FROM organizations WHERE id = ?', [id], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

// --- Plan Limits ---

export async function getPlanLimits(plan: string): Promise<PlanLimits> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT * FROM plan_limits WHERE plan = $1', [plan]);
        if (result.rows.length === 0) {
            return { maxLinks: 3, maxSessionsPerMonth: 100, maxUsers: 1, maxApiKeys: 1, features: [] };
        }
        const row = result.rows[0];
        return {
            maxLinks: row.max_links,
            maxSessionsPerMonth: row.max_sessions_per_month,
            maxUsers: row.max_users,
            maxApiKeys: row.max_api_keys,
            features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features
        };
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.get('SELECT * FROM plan_limits WHERE plan = ?', [plan], (err: any, row: any) => {
                if (err) reject(err);
                else if (!row) {
                    resolve({ maxLinks: 3, maxSessionsPerMonth: 100, maxUsers: 1, maxApiKeys: 1, features: [] });
                } else {
                    resolve({
                        maxLinks: row.max_links,
                        maxSessionsPerMonth: row.max_sessions_per_month,
                        maxUsers: row.max_users,
                        maxApiKeys: row.max_api_keys,
                        features: JSON.parse(row.features || '[]')
                    });
                }
            });
        });
    }
}

// --- API Keys ---

export async function createApiKey(orgId: string, name: string, permissions: string[] = ['read'], expiresAt?: number): Promise<{ key: string; id: string }> {
    const id = crypto.randomUUID();
    const rawKey = `ppl_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const now = Date.now();

    if (isPostgres) {
        await pgPool!.query(`
            INSERT INTO api_keys (id, org_id, name, key_hash, permissions, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))
        `, [id, orgId, name, keyHash, JSON.stringify(permissions), expiresAt ? new Date(expiresAt) : null, now]);
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run(`
                INSERT INTO api_keys (id, org_id, name, key_hash, permissions, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [id, orgId, name, keyHash, JSON.stringify(permissions), expiresAt || null, now], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    return { key: rawKey, id };
}

export async function getApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT * FROM api_keys WHERE key_hash = $1', [keyHash]);
        if (result.rows.length === 0) return null;
        return mapApiKeyRow(result.rows[0]);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.get('SELECT * FROM api_keys WHERE key_hash = ?', [keyHash], (err: any, row: any) => {
                if (err) reject(err);
                else resolve(row ? mapApiKeyRow(row) : null);
            });
        });
    }
}

export async function getApiKeysByOrg(orgId: string): Promise<ApiKey[]> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT * FROM api_keys WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
        return result.rows.map(mapApiKeyRow);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.all('SELECT * FROM api_keys WHERE org_id = ? ORDER BY created_at DESC', [orgId], (err: any, rows: any[]) => {
                if (err) reject(err);
                else resolve((rows || []).map(mapApiKeyRow));
            });
        });
    }
}

export async function deleteApiKey(id: string): Promise<void> {
    if (isPostgres) {
        await pgPool!.query('DELETE FROM api_keys WHERE id = $1', [id]);
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run('DELETE FROM api_keys WHERE id = ?', [id], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

export async function updateApiKeyLastUsed(id: string): Promise<void> {
    const now = Date.now();
    if (isPostgres) {
        await pgPool!.query('UPDATE api_keys SET last_used_at = to_timestamp($1 / 1000.0) WHERE id = $2', [now, id]);
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run('UPDATE api_keys SET last_used_at = ? WHERE id = ?', [now, id], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

export async function getApiKeyCount(orgId: string): Promise<number> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT COUNT(*) as count FROM api_keys WHERE org_id = $1', [orgId]);
        return parseInt(result.rows[0].count, 10);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.get('SELECT COUNT(*) as count FROM api_keys WHERE org_id = ?', [orgId], (err: any, row: any) => {
                if (err) reject(err);
                else resolve(row?.count || 0);
            });
        });
    }
}

// --- Usage Tracking ---

export async function incrementUsage(orgId: string, metric: string, amount: number = 1): Promise<void> {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const id = crypto.randomUUID();

    if (isPostgres) {
        await pgPool!.query(`
            INSERT INTO usage_tracking (id, org_id, metric, value, period)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (org_id, metric, period) 
            DO UPDATE SET value = usage_tracking.value + $4
        `, [id, orgId, metric, amount, period]);
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run(`
                INSERT INTO usage_tracking (id, org_id, metric, value, period)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (org_id, metric, period) 
                DO UPDATE SET value = value + ?
            `, [id, orgId, metric, amount, period, amount], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

export async function getUsage(orgId: string, metric: string, period?: string): Promise<number> {
    const p = period || new Date().toISOString().slice(0, 7);

    if (isPostgres) {
        const result = await pgPool!.query(
            'SELECT value FROM usage_tracking WHERE org_id = $1 AND metric = $2 AND period = $3',
            [orgId, metric, p]
        );
        return result.rows.length > 0 ? result.rows[0].value : 0;
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.get(
                'SELECT value FROM usage_tracking WHERE org_id = ? AND metric = ? AND period = ?',
                [orgId, metric, p],
                (err: any, row: any) => {
                    if (err) reject(err);
                    else resolve(row?.value || 0);
                }
            );
        });
    }
}

// --- Invitations ---

export async function createInvitation(orgId: string, email: string, role: string, invitedBy: string): Promise<Invitation> {
    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days

    if (isPostgres) {
        await pgPool!.query(`
            INSERT INTO invitations (id, org_id, email, role, token, invited_by, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0), to_timestamp($8 / 1000.0))
        `, [id, orgId, email, role, token, invitedBy, expiresAt, now]);
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run(`
                INSERT INTO invitations (id, org_id, email, role, token, invited_by, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [id, orgId, email, role, token, invitedBy, expiresAt, now], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    return { id, orgId, email, role, token, invitedBy, expiresAt, createdAt: now };
}

export async function getInvitationByToken(token: string): Promise<Invitation | null> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT * FROM invitations WHERE token = $1', [token]);
        if (result.rows.length === 0) return null;
        return mapInvitationRow(result.rows[0]);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.get('SELECT * FROM invitations WHERE token = ?', [token], (err: any, row: any) => {
                if (err) reject(err);
                else resolve(row ? mapInvitationRow(row) : null);
            });
        });
    }
}

export async function acceptInvitation(token: string): Promise<void> {
    const now = Date.now();
    if (isPostgres) {
        await pgPool!.query('UPDATE invitations SET accepted_at = to_timestamp($1 / 1000.0) WHERE token = $2', [now, token]);
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run('UPDATE invitations SET accepted_at = ? WHERE token = ?', [now, token], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

// --- Count Helpers ---

export async function getLinkCount(orgId: string): Promise<number> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT COUNT(*) as count FROM admin_links WHERE org_id = $1', [orgId]);
        return parseInt(result.rows[0].count, 10);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.get('SELECT COUNT(*) as count FROM admin_links WHERE org_id = ?', [orgId], (err: any, row: any) => {
                if (err) reject(err);
                else resolve(row?.count || 0);
            });
        });
    }
}

export async function getUserCount(orgId: string): Promise<number> {
    if (isPostgres) {
        const result = await pgPool!.query('SELECT COUNT(*) as count FROM users WHERE org_id = $1', [orgId]);
        return parseInt(result.rows[0].count, 10);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.get('SELECT COUNT(*) as count FROM users WHERE org_id = ?', [orgId], (err: any, row: any) => {
                if (err) reject(err);
                else resolve(row?.count || 0);
            });
        });
    }
}

// --- Row Mappers ---

function mapOrgRow(row: any): Organization {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        plan: row.plan,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        settings: typeof row.settings === 'string' ? JSON.parse(row.settings || '{}') : (row.settings || {}),
        createdAt: typeof row.created_at === 'object' ? row.created_at.getTime() : row.created_at,
        updatedAt: typeof row.updated_at === 'object' ? row.updated_at.getTime() : row.updated_at
    };
}

function mapApiKeyRow(row: any): ApiKey {
    return {
        id: row.id,
        orgId: row.org_id,
        name: row.name,
        keyHash: row.key_hash,
        permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
        lastUsedAt: row.last_used_at ? (typeof row.last_used_at === 'object' ? row.last_used_at.getTime() : row.last_used_at) : undefined,
        expiresAt: row.expires_at ? (typeof row.expires_at === 'object' ? row.expires_at.getTime() : row.expires_at) : undefined,
        createdAt: typeof row.created_at === 'object' ? row.created_at.getTime() : row.created_at
    };
}

function mapInvitationRow(row: any): Invitation {
    return {
        id: row.id,
        orgId: row.org_id,
        email: row.email,
        role: row.role,
        token: row.token,
        invitedBy: row.invited_by,
        expiresAt: typeof row.expires_at === 'object' ? row.expires_at.getTime() : row.expires_at,
        acceptedAt: row.accepted_at ? (typeof row.accepted_at === 'object' ? row.accepted_at.getTime() : row.accepted_at) : undefined,
        createdAt: typeof row.created_at === 'object' ? row.created_at.getTime() : row.created_at
    };
}
