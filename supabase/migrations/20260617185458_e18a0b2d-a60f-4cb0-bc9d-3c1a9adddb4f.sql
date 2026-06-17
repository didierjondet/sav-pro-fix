
-- Lecture par token (renvoie aussi rating/comment actuels pour pré-remplissage)
CREATE OR REPLACE FUNCTION public.get_satisfaction_survey_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  shop_id uuid,
  sav_case_id uuid,
  completed_at timestamptz,
  rating int,
  comment text,
  shop_name text,
  shop_logo_url text,
  sav_case_number text,
  sav_device_brand text,
  sav_device_model text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.id,
    ss.shop_id,
    ss.sav_case_id,
    ss.completed_at,
    ss.rating,
    ss.comment,
    s.name,
    s.logo_url,
    sc.case_number,
    sc.device_brand,
    sc.device_model
  FROM public.satisfaction_surveys ss
  LEFT JOIN public.shops s ON s.id = ss.shop_id
  LEFT JOIN public.sav_cases sc ON sc.id = ss.sav_case_id
  WHERE ss.access_token = p_token
  LIMIT 1;
END;
$$;

-- Soumission / modification (autorise une nouvelle note qui remplace l'ancienne)
CREATE OR REPLACE FUNCTION public.submit_satisfaction_survey(
  p_token text,
  p_rating int,
  p_comment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_found boolean := false;
  v_was_completed boolean := false;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_rating');
  END IF;

  SELECT true, (completed_at IS NOT NULL)
    INTO v_found, v_was_completed
  FROM public.satisfaction_surveys
  WHERE access_token = p_token;

  IF NOT v_found THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  UPDATE public.satisfaction_surveys
  SET
    rating = p_rating,
    comment = NULLIF(trim(coalesce(p_comment, '')), ''),
    completed_at = now()
  WHERE access_token = p_token;

  RETURN jsonb_build_object('success', true, 'updated', v_was_completed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_satisfaction_survey_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_satisfaction_survey(text, int, text) TO anon, authenticated;
