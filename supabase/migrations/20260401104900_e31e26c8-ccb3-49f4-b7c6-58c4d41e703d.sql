CREATE OR REPLACE FUNCTION public.get_sav_visit_counts(p_sav_case_ids uuid[])
RETURNS TABLE(sav_case_id uuid, visit_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    stv.sav_case_id,
    COUNT(stv.id)::bigint AS visit_count
  FROM public.sav_tracking_visits stv
  WHERE stv.sav_case_id = ANY(p_sav_case_ids)
  GROUP BY stv.sav_case_id;
$$;