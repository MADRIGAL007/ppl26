-- Migration: Add permissions and quotas to users table
-- Up
ALTER TABLE users ADD COLUMN permissions TEXT;
ALTER TABLE users ADD COLUMN max_sessions INTEGER DEFAULT 100;
ALTER TABLE users ADD COLUMN allowed_flows TEXT;
ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0;

-- Down
-- SQLite does not support canceling ADD COLUMN easily in a transaction block usually, 
-- but for this system we assume forward-only migrations or manual rollback in dev.
