
-- Set tier_key values for existing plans
UPDATE subscription_plans SET tier_key = 'free' WHERE name = 'Découverte';
UPDATE subscription_plans SET tier_key = 'premium' WHERE name = 'Premium';
UPDATE subscription_plans SET tier_key = 'enterprise' WHERE name = 'Enterprise';
UPDATE subscription_plans SET tier_key = 'custom' WHERE name = 'Sur mesure';

-- Assign subscription_plan_id to orphan shops based on tier mapping
UPDATE shops SET subscription_plan_id = sp.id
FROM subscription_plans sp
WHERE sp.tier_key = shops.subscription_tier
AND shops.subscription_plan_id IS NULL;
