-- PPL26 SaaS Multi-Tenancy Migration (PostgreSQL)
-- Version: 001
-- Description: Add organizations, API keys, and tenant relationships

-- ============================================
-- 1. Organizations (Tenants) Table
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe ON organizations(stripe_customer_id);

-- ============================================
-- 2. API Keys Table
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    permissions JSONB DEFAULT '["read"]',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- ============================================
-- 3. Add org_id to existing tables
-- ============================================

-- Users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'org_id') THEN
        ALTER TABLE users ADD COLUMN org_id UUID REFERENCES organizations(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'invited_by') THEN
        ALTER TABLE users ADD COLUMN invited_by UUID REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'invite_accepted_at') THEN
        ALTER TABLE users ADD COLUMN invite_accepted_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);

-- Sessions table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'org_id') THEN
        ALTER TABLE sessions ADD COLUMN org_id UUID REFERENCES organizations(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_org ON sessions(org_id);

-- Admin Links table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_links' AND column_name = 'org_id') THEN
        ALTER TABLE admin_links ADD COLUMN org_id UUID REFERENCES organizations(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_links_org ON admin_links(org_id);

-- ============================================
-- 4. Plan Limits Table
-- ============================================
CREATE TABLE IF NOT EXISTS plan_limits (
    plan TEXT PRIMARY KEY,
    max_links INTEGER DEFAULT 3,
    max_sessions_per_month INTEGER DEFAULT 100,
    max_users INTEGER DEFAULT 1,
    max_api_keys INTEGER DEFAULT 1,
    features JSONB DEFAULT '[]'
);

INSERT INTO plan_limits (plan, max_links, max_sessions_per_month, max_users, max_api_keys, features) VALUES
    ('free', 3, 100, 1, 1, '["basic_analytics"]'),
    ('starter', 10, 1000, 3, 5, '["basic_analytics", "custom_branding", "email_support"]'),
    ('pro', 50, 10000, 10, 20, '["advanced_analytics", "custom_branding", "priority_support", "api_access", "webhooks"]'),
    ('enterprise', -1, -1, -1, -1, '["all", "dedicated_support", "custom_integrations", "sla"]')
ON CONFLICT (plan) DO NOTHING;

-- ============================================
-- 5. Usage Tracking Table
-- ============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    value INTEGER DEFAULT 0,
    period TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, metric, period)
);

CREATE INDEX IF NOT EXISTS idx_usage_org_period ON usage_tracking(org_id, period);

-- ============================================
-- 6. Invitations Table
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(org_id);

-- ============================================
-- 7. Crypto Payments Table
-- ============================================
CREATE TABLE IF NOT EXISTS crypto_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    crypto_type TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    tx_hash TEXT,
    status TEXT DEFAULT 'pending',
    wallet_address TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_payments_org ON crypto_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_status ON crypto_payments(status);

-- ============================================
-- 7. Trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
