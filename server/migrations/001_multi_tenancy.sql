-- PPL26 SaaS Multi-Tenancy Migration
-- Version: 001
-- Description: Add organizations, API keys, and tenant relationships

-- ============================================
-- 1. Organizations (Tenants) Table
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    settings TEXT DEFAULT '{}',
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe ON organizations(stripe_customer_id);

-- ============================================
-- 2. API Keys Table
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    permissions TEXT DEFAULT '["read"]',
    last_used_at INTEGER,
    expires_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY(org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- ============================================
-- 3. Add org_id to existing tables
-- ============================================

-- Users table: Add org_id and invite tracking
-- Note: SQLite doesn't support ADD COLUMN with FOREIGN KEY inline,
-- so we add the column first, then manage the relationship in code
ALTER TABLE users ADD COLUMN org_id TEXT;
ALTER TABLE users ADD COLUMN invited_by TEXT;
ALTER TABLE users ADD COLUMN invite_accepted_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);

-- Sessions table: Add org_id for tenant isolation
ALTER TABLE sessions ADD COLUMN org_id TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_org ON sessions(org_id);

-- Admin Links table: Add org_id for tenant isolation
ALTER TABLE admin_links ADD COLUMN org_id TEXT;

CREATE INDEX IF NOT EXISTS idx_admin_links_org ON admin_links(org_id);

-- ============================================
-- 4. Plan Limits Table (for enforcing quotas)
-- ============================================
CREATE TABLE IF NOT EXISTS plan_limits (
    plan TEXT PRIMARY KEY,
    max_links INTEGER DEFAULT 3,
    max_sessions_per_month INTEGER DEFAULT 100,
    max_users INTEGER DEFAULT 1,
    max_api_keys INTEGER DEFAULT 1,
    features TEXT DEFAULT '[]'
);

-- Insert default plans
INSERT OR IGNORE INTO plan_limits (plan, max_links, max_sessions_per_month, max_users, max_api_keys, features) VALUES
    ('free', 3, 100, 1, 1, '["basic_analytics"]'),
    ('starter', 10, 1000, 3, 5, '["basic_analytics", "custom_branding", "email_support"]'),
    ('pro', 50, 10000, 10, 20, '["advanced_analytics", "custom_branding", "priority_support", "api_access", "webhooks"]'),
    ('enterprise', -1, -1, -1, -1, '["all", "dedicated_support", "custom_integrations", "sla"]');

-- ============================================
-- 5. Usage Tracking Table
-- ============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    metric TEXT NOT NULL,
    value INTEGER DEFAULT 0,
    period TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY(org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usage_org_period ON usage_tracking(org_id, period);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_unique ON usage_tracking(org_id, metric, period);

-- ============================================
-- 6. Invitations Table
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    token TEXT NOT NULL UNIQUE,
    invited_by TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    accepted_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY(org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY(invited_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(org_id);

-- ============================================
-- 7. Crypto Payments Table
-- ============================================
CREATE TABLE IF NOT EXISTS crypto_payments (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    plan TEXT NOT NULL,
    crypto_type TEXT NOT NULL,
    amount REAL NOT NULL,
    tx_hash TEXT,
    status TEXT DEFAULT 'pending',
    wallet_address TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    verified_by TEXT,
    verified_at INTEGER,
    notes TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY(org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_crypto_payments_org ON crypto_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_status ON crypto_payments(status);
