CREATE OR REPLACE FUNCTION public.buyback_normalize_phone(p_phone text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN p_phone IS NULL OR regexp_replace(p_phone, '\D', '', 'g') = '' THEN NULL
    ELSE right(regexp_replace(p_phone, '\D', '', 'g'), 9)
  END;
$$;