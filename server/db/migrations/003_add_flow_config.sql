-- Up
ALTER TABLE links ADD COLUMN flow_config JSONB DEFAULT '{}'::jsonb;

-- Down
ALTER TABLE links DROP COLUMN flow_config;
