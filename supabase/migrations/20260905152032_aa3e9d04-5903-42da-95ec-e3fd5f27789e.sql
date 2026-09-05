CREATE OR REPLACE FUNCTION public.get_shops_config_progress(_shop_ids uuid[] DEFAULT NULL)
RETURNS TABLE(shop_id uuid, done_count integer, total_steps integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id AS shop_id,
    (
      (CASE WHEN EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.shop_id = s.id
            AND coalesce(p.first_name,'') <> ''
            AND coalesce(p.last_name,'') <> ''
            AND coalesce(p.phone,'') <> ''
        ) THEN 1 ELSE 0 END)
      + (CASE WHEN coalesce(s.name,'') <> '' AND s.name <> 'Mon Magasin' AND coalesce(s.email,'') <> '' THEN 1 ELSE 0 END)
      + (CASE WHEN coalesce(s.phone,'') <> '' AND coalesce(s.address,'') <> '' THEN 1 ELSE 0 END)
      + (CASE WHEN EXISTS (SELECT 1 FROM public.shop_sav_types t WHERE t.shop_id = s.id AND t.is_default = false) THEN 1 ELSE 0 END)
      + (CASE WHEN EXISTS (SELECT 1 FROM public.shop_sav_statuses st WHERE st.shop_id = s.id AND st.is_default = false) THEN 1 ELSE 0 END)
      + (CASE WHEN EXISTS (SELECT 1 FROM public.suppliers sup WHERE sup.shop_id = s.id) THEN 1 ELSE 0 END)
      + (CASE WHEN EXISTS (SELECT 1 FROM public.parts pa WHERE pa.shop_id = s.id) THEN 1 ELSE 0 END)
      + (CASE WHEN EXISTS (SELECT 1 FROM public.shop_working_hours wh WHERE wh.shop_id = s.id) THEN 1 ELSE 0 END)
      + (CASE WHEN EXISTS (SELECT 1 FROM public.sav_cases sc WHERE sc.shop_id = s.id) THEN 1 ELSE 0 END)
      + (CASE WHEN (SELECT count(*) FROM public.profiles p2 WHERE p2.shop_id = s.id) > 1
              OR coalesce(op.steps_seen, '[]'::jsonb) ? 'team' THEN 1 ELSE 0 END)
      + (CASE WHEN coalesce(op.steps_seen, '[]'::jsonb) ? 'vat_config' THEN 1 ELSE 0 END)
      + (CASE WHEN coalesce(op.steps_seen, '[]'::jsonb) ? 'messaging_tutorial' THEN 1 ELSE 0 END)
      + (CASE WHEN coalesce(op.steps_seen, '[]'::jsonb) ? 'sms_personalization' THEN 1 ELSE 0 END)
    )::int AS done_count,
    13 AS total_steps
  FROM public.shops s
  LEFT JOIN public.shop_onboarding_progress op ON op.shop_id = s.id
  WHERE public.is_super_admin()
    AND (_shop_ids IS NULL OR s.id = ANY(_shop_ids));
$$;

GRANT EXECUTE ON FUNCTION public.get_shops_config_progress(uuid[]) TO authenticated;