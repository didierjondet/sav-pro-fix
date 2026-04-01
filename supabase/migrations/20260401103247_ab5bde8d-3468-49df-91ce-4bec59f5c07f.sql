CREATE OR REPLACE FUNCTION public.record_sav_visit(
  p_tracking_slug text,
  p_visitor_ip text DEFAULT NULL,
  p_visitor_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sav_case_id uuid;
  v_last_visit timestamp with time zone;
BEGIN
  SELECT id INTO v_sav_case_id
  FROM public.sav_cases
  WHERE tracking_slug = p_tracking_slug
  AND tracking_slug IS NOT NULL 
  AND tracking_slug != '';
  
  IF v_sav_case_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Deduplicate: check for recent visit (30 min) using IP if available, otherwise user_agent
  IF p_visitor_ip IS NOT NULL THEN
    SELECT visited_at INTO v_last_visit
    FROM public.sav_tracking_visits
    WHERE sav_case_id = v_sav_case_id
    AND visitor_ip = p_visitor_ip
    AND visited_at > (NOW() - INTERVAL '30 minutes')
    ORDER BY visited_at DESC
    LIMIT 1;
  ELSE
    SELECT visited_at INTO v_last_visit
    FROM public.sav_tracking_visits
    WHERE sav_case_id = v_sav_case_id
    AND visitor_ip IS NULL
    AND visitor_user_agent = p_visitor_user_agent
    AND visited_at > (NOW() - INTERVAL '30 minutes')
    ORDER BY visited_at DESC
    LIMIT 1;
  END IF;
  
  IF v_last_visit IS NULL THEN
    INSERT INTO public.sav_tracking_visits (
      sav_case_id,
      tracking_slug,
      visitor_ip,
      visitor_user_agent
    ) VALUES (
      v_sav_case_id,
      p_tracking_slug,
      p_visitor_ip,
      p_visitor_user_agent
    );
  END IF;
END;
$$;