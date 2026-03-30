
-- Add tier_key column to subscription_plans for mapping with shops.subscription_tier
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS tier_key text;

-- Create unique index on tier_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plans_tier_key ON subscription_plans(tier_key) WHERE tier_key IS NOT NULL;
