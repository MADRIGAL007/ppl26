-- Add credits field if not exists (covering phase 10 requirement if missed)
-- We do not use subscription_tier or subscription_end_date.
ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0;
