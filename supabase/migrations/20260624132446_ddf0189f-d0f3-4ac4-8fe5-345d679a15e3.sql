
-- 1. Add columns to shops
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS inactivity_warning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inactivity_policy_acknowledged_at TIMESTAMPTZ;

-- 2. Function to get last real activity of a shop
CREATE OR REPLACE FUNCTION public.get_shop_last_activity(_shop_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_ts TIMESTAMPTZ;
  shop_created TIMESTAMPTZ;
BEGIN
  SELECT created_at INTO shop_created FROM public.shops WHERE id = _shop_id;

  SELECT GREATEST(
    COALESCE((SELECT MAX(GREATEST(created_at, updated_at)) FROM public.sav_cases WHERE shop_id = _shop_id), 'epoch'::timestamptz),
    COALESCE((SELECT MAX(GREATEST(created_at, updated_at)) FROM public.customers WHERE shop_id = _shop_id), 'epoch'::timestamptz),
    COALESCE((SELECT MAX(GREATEST(created_at, updated_at)) FROM public.parts WHERE shop_id = _shop_id), 'epoch'::timestamptz),
    COALESCE((SELECT MAX(GREATEST(created_at, updated_at)) FROM public.quotes WHERE shop_id = _shop_id), 'epoch'::timestamptz),
    COALESCE((SELECT MAX(GREATEST(created_at, updated_at)) FROM public.appointments WHERE shop_id = _shop_id), 'epoch'::timestamptz),
    COALESCE((SELECT MAX(created_at) FROM public.sav_messages m JOIN public.sav_cases c ON c.id = m.sav_case_id WHERE c.shop_id = _shop_id), 'epoch'::timestamptz),
    COALESCE((SELECT MAX(GREATEST(created_at, updated_at)) FROM public.loaner_loans WHERE shop_id = _shop_id), 'epoch'::timestamptz),
    COALESCE((SELECT MAX(GREATEST(created_at, updated_at)) FROM public.inventory_sessions WHERE shop_id = _shop_id), 'epoch'::timestamptz)
  ) INTO last_ts;

  IF last_ts IS NULL OR last_ts < shop_created THEN
    last_ts := shop_created;
  END IF;

  RETURN last_ts;
END;
$$;

-- 3. RPC to acknowledge the policy
CREATE OR REPLACE FUNCTION public.acknowledge_shop_inactivity_policy()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_id UUID;
BEGIN
  SELECT shop_id INTO _shop_id FROM public.profiles WHERE user_id = auth.uid();
  IF _shop_id IS NULL THEN
    RAISE EXCEPTION 'No shop for current user';
  END IF;
  UPDATE public.shops
    SET inactivity_policy_acknowledged_at = COALESCE(inactivity_policy_acknowledged_at, now())
    WHERE id = _shop_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_shop_inactivity_policy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_last_activity(UUID) TO authenticated, service_role;

-- 4. Insert the alert config if not exists
INSERT INTO public.system_alerts (
  alert_type, name, is_enabled, threshold_value, check_frequency_hours,
  sms_message_1, sms_message_2, sms_message_3
)
SELECT
  'inactive_shop_cleanup',
  'Suppression automatique des boutiques inactives',
  false,
  60,
  24,
  'Votre boutique {shop_name} sera automatiquement supprimée le {deletion_date} faute d''activité depuis 60 jours. Connectez-vous pour conserver vos données.',
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_alerts WHERE alert_type = 'inactive_shop_cleanup'
);
