ALTER TABLE public.buyback_requests ADD COLUMN IF NOT EXISTS shop_refusal_reason text;

CREATE OR REPLACE FUNCTION public.get_buyback_shops(p_category text DEFAULT NULL, p_search text DEFAULT NULL)
RETURNS TABLE(shop_id uuid, slug text, name text, city text, postal_code text, logo_url text, categories text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.slug, s.name,
         coalesce(pp.city, '') AS city,
         coalesce(pp.postal_code, '') AS postal_code,
         coalesce(pp.logo_url, s.logo_url) AS logo_url,
         c.buyback_categories
  FROM public.shop_website_config c
  JOIN public.shops s ON s.id = c.shop_id
  LEFT JOIN public.partner_profiles pp ON pp.shop_id = s.id
  WHERE c.enabled = true
    AND c.buyback_enabled = true
    AND s.slug IS NOT NULL
    AND (p_category IS NULL OR p_category = ANY (c.buyback_categories))
    AND (
      coalesce(trim(p_search), '') = ''
      OR public.fx_norm(s.name) LIKE '%' || public.fx_norm(p_search) || '%'
      OR public.fx_norm(coalesce(pp.city, '')) LIKE '%' || public.fx_norm(p_search) || '%'
      OR coalesce(pp.postal_code, '') LIKE trim(p_search) || '%'
    )
  ORDER BY s.name
  LIMIT 60;
$$;

GRANT EXECUTE ON FUNCTION public.get_buyback_shops(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_buyback_request_national(
  p_shop_id uuid,
  p_category text,
  p_brand text,
  p_model text,
  p_answers jsonb,
  p_media jsonb,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_city text,
  p_customer_postal_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_cfg record; v_retention integer; v_delay integer; v_token text;
BEGIN
  IF coalesce(trim(p_customer_name), '') = '' THEN
    RAISE EXCEPTION 'Nom du client requis';
  END IF;
  IF coalesce(trim(p_customer_email), '') = '' AND coalesce(trim(p_customer_phone), '') = '' THEN
    RAISE EXCEPTION 'Un email ou un téléphone est requis';
  END IF;

  SELECT media_retention_days, response_delay_hours INTO v_retention, v_delay
  FROM public.buyback_settings WHERE id = true;

  IF p_shop_id IS NOT NULL THEN
    SELECT * INTO v_cfg FROM public.shop_website_config WHERE shop_id = p_shop_id;
    IF v_cfg.id IS NULL OR v_cfg.enabled = false OR v_cfg.buyback_enabled = false THEN
      RAISE EXCEPTION 'Ce magasin ne recoit pas de demandes de rachat';
    END IF;
    IF NOT (p_category = ANY (v_cfg.buyback_categories)) THEN
      RAISE EXCEPTION 'Categorie non acceptee par ce magasin';
    END IF;
  END IF;

  INSERT INTO public.buyback_requests (
    shop_id, category, brand, model, answers, media,
    customer_name, customer_email, customer_phone, customer_city, customer_postal_code,
    media_expires_at, status, network_open, network_opened_at, network_deadline
  ) VALUES (
    p_shop_id, p_category, nullif(trim(p_brand), ''), nullif(trim(p_model), ''),
    coalesce(p_answers, '{}'::jsonb), coalesce(p_media, '[]'::jsonb),
    trim(p_customer_name), nullif(trim(p_customer_email), ''), nullif(trim(p_customer_phone), ''),
    nullif(trim(p_customer_city), ''), nullif(trim(p_customer_postal_code), ''),
    now() + (coalesce(v_retention, 60) || ' days')::interval,
    CASE WHEN p_shop_id IS NULL THEN 'network' ELSE 'pending' END,
    p_shop_id IS NULL,
    CASE WHEN p_shop_id IS NULL THEN now() ELSE NULL END,
    CASE WHEN p_shop_id IS NULL THEN now() + (coalesce(v_delay, 48) || ' hours')::interval ELSE NULL END
  ) RETURNING public_token INTO v_token;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_buyback_request_national(uuid, text, text, text, jsonb, jsonb, text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.decline_buyback_request(p_request_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_shop_id uuid; v_req record;
BEGIN
  v_shop_id := public.get_current_user_shop_id();
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'Magasin introuvable'; END IF;

  SELECT * INTO v_req FROM public.buyback_requests WHERE id = p_request_id AND shop_id = v_shop_id;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_req.status NOT IN ('pending', 'offered') THEN
    RAISE EXCEPTION 'Cette demande ne peut plus etre refusee';
  END IF;

  UPDATE public.buyback_offers SET status = 'declined'
    WHERE request_id = p_request_id AND shop_id = v_shop_id AND status = 'sent';

  UPDATE public.buyback_requests
    SET status = 'refused_by_shop',
        shop_refusal_reason = nullif(trim(p_reason), '')
    WHERE id = p_request_id;

  RETURN jsonb_build_object('status', 'refused_by_shop');
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_buyback_request(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.open_buyback_to_network(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_req record; v_delay integer;
BEGIN
  SELECT * INTO v_req FROM public.buyback_requests WHERE public_token = p_token;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_req.status IN ('accepted', 'network', 'network_closed') THEN
    RETURN jsonb_build_object('status', v_req.status);
  END IF;

  SELECT response_delay_hours INTO v_delay FROM public.buyback_settings WHERE id = true;

  UPDATE public.buyback_requests
    SET status = 'network', network_open = true, network_opened_at = now(),
        network_deadline = now() + (coalesce(v_delay, 48) || ' hours')::interval
    WHERE id = v_req.id;

  RETURN jsonb_build_object('status', 'network');
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_buyback_to_network(text) TO anon, authenticated;