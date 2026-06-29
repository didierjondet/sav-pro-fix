
-- 1) Function: get default free plan id
CREATE OR REPLACE FUNCTION public.get_default_free_plan_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.subscription_plans
  WHERE is_active = true AND tier_key = 'free'
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- 2) BEFORE INSERT trigger on shops: assign default free plan + sync limits
CREATE OR REPLACE FUNCTION public.assign_default_plan_on_shop_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_record RECORD;
BEGIN
  IF NEW.subscription_plan_id IS NULL THEN
    NEW.subscription_plan_id := public.get_default_free_plan_id();
  END IF;

  IF NEW.subscription_plan_id IS NOT NULL THEN
    SELECT tier_key, sms_limit, sav_limit
      INTO plan_record
      FROM public.subscription_plans
      WHERE id = NEW.subscription_plan_id;

    IF FOUND THEN
      NEW.subscription_tier := COALESCE(plan_record.tier_key, NEW.subscription_tier, 'free');
      NEW.sms_credits_allocated := COALESCE(plan_record.sms_limit, NEW.sms_credits_allocated, 0);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_default_plan_on_shop_insert ON public.shops;
CREATE TRIGGER trg_assign_default_plan_on_shop_insert
BEFORE INSERT ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_plan_on_shop_insert();

-- 3) Extend sync_shop_sms_limits to also act when subscription_plan_id changes (BEFORE UPDATE)
CREATE OR REPLACE FUNCTION public.sync_shop_plan_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_record RECORD;
BEGIN
  IF NEW.subscription_plan_id IS DISTINCT FROM OLD.subscription_plan_id
     AND NEW.subscription_plan_id IS NOT NULL THEN
    SELECT tier_key, sms_limit
      INTO plan_record
      FROM public.subscription_plans
      WHERE id = NEW.subscription_plan_id;

    IF FOUND THEN
      NEW.subscription_tier := COALESCE(plan_record.tier_key, NEW.subscription_tier);
      NEW.sms_credits_allocated := COALESCE(plan_record.sms_limit, NEW.sms_credits_allocated);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_shop_plan_on_update ON public.shops;
CREATE TRIGGER trg_sync_shop_plan_on_update
BEFORE UPDATE OF subscription_plan_id ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.sync_shop_plan_on_update();

-- 4) Backfill: assign free plan and recompute sms_credits_allocated for shops without a plan
UPDATE public.shops s
SET subscription_plan_id = p.id,
    subscription_tier = p.tier_key,
    sms_credits_allocated = p.sms_limit
FROM public.subscription_plans p
WHERE s.subscription_plan_id IS NULL
  AND p.is_active = true
  AND p.tier_key = 'free';

-- 5) Re-sync sms_credits_allocated for shops whose value doesn't match their plan (no custom override considered here; custom_sms_limit remains a separate per-shop override)
UPDATE public.shops s
SET sms_credits_allocated = p.sms_limit,
    subscription_tier = COALESCE(p.tier_key, s.subscription_tier)
FROM public.subscription_plans p
WHERE s.subscription_plan_id = p.id
  AND s.sms_credits_allocated IS DISTINCT FROM p.sms_limit;
