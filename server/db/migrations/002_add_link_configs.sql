-- Migration: Add advanced configuration columns to admin_links table
-- Up
ALTER TABLE admin_links ADD COLUMN traffic_config TEXT;
ALTER TABLE admin_links ADD COLUMN geo_config TEXT;
ALTER TABLE admin_links ADD COLUMN approval_config TEXT;

-- Down
-- SQLite does not support dropping columns easily in versions < 3.35, 
-- but we assume forward-only for this system.
