-- Backfill subscription_plan_id for shops where it's NULL based on tier_key match
UPDATE public.shops s
SET subscription_plan_id = sp.id
FROM public.subscription_plans sp
WHERE s.subscription_plan_id IS NULL
  AND sp.tier_key = COALESCE(s.subscription_tier, 'free')
  AND sp.is_active = true;

-- Normalize subscription_tier so it always equals the plan's tier_key
-- (in case it was previously written as a renamed display name like "découverte")
UPDATE public.shops s
SET subscription_tier = sp.tier_key
FROM public.subscription_plans sp
WHERE s.subscription_plan_id = sp.id
  AND sp.tier_key IS NOT NULL
  AND s.subscription_tier IS DISTINCT FROM sp.tier_key;