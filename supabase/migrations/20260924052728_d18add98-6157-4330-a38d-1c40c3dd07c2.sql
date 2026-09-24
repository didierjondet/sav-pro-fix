ALTER TABLE public.buyback_customers ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false;
ALTER TABLE public.buyback_customers ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;

CREATE OR REPLACE FUNCTION public.buyback_upsert_customer(p_name text, p_email text, p_phone text, p_city text, p_postal_code text, p_marketing_consent boolean DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_phone_norm text; v_email_norm text; v_id uuid;
BEGIN
  v_phone_norm := public.buyback_normalize_phone(p_phone);
  v_email_norm := nullif(lower(trim(coalesce(p_email, ''))), '');

  IF v_phone_norm IS NOT NULL THEN
    SELECT id INTO v_id FROM public.buyback_customers WHERE phone_norm = v_phone_norm LIMIT 1;
  END IF;
  IF v_id IS NULL AND v_email_norm IS NOT NULL THEN
    SELECT id INTO v_id FROM public.buyback_customers WHERE email_norm = v_email_norm LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.buyback_customers (full_name, phone, phone_norm, email, email_norm, city, postal_code, marketing_consent, marketing_consent_at)
    VALUES (trim(p_name), nullif(trim(coalesce(p_phone,'')), ''), v_phone_norm,
            nullif(trim(coalesce(p_email,'')), ''), v_email_norm,
            nullif(trim(coalesce(p_city,'')), ''), nullif(trim(coalesce(p_postal_code,'')), ''),
            coalesce(p_marketing_consent, false),
            CASE WHEN p_marketing_consent THEN now() ELSE NULL END)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.buyback_customers SET
      full_name = coalesce(nullif(trim(p_name), ''), full_name),
      phone = coalesce(nullif(trim(coalesce(p_phone,'')), ''), phone),
      phone_norm = coalesce(v_phone_norm, phone_norm),
      email = coalesce(nullif(trim(coalesce(p_email,'')), ''), email),
      email_norm = coalesce(v_email_norm, email_norm),
      city = coalesce(nullif(trim(coalesce(p_city,'')), ''), city),
      postal_code = coalesce(nullif(trim(coalesce(p_postal_code,'')), ''), postal_code),
      marketing_consent = coalesce(p_marketing_consent, marketing_consent),
      marketing_consent_at = CASE
        WHEN p_marketing_consent IS TRUE THEN now()
        WHEN p_marketing_consent IS FALSE THEN NULL
        ELSE marketing_consent_at END,
      updated_at = now()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.buyback_upsert_customer(text, text, text, text, text, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_buyback_request(p_slug text, p_category text, p_brand text, p_model text, p_answers jsonb, p_media jsonb, p_customer_name text, p_customer_email text, p_customer_phone text, p_customer_city text, p_customer_postal_code text, p_marketing_consent boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_shop_id uuid; v_cfg record; v_retention integer; v_token text; v_bc_id uuid;
BEGIN
  IF coalesce(trim(p_customer_name), '') = '' THEN
    RAISE EXCEPTION 'Nom du client requis';
  END IF;
  IF coalesce(trim(p_customer_email), '') = '' AND coalesce(trim(p_customer_phone), '') = '' THEN
    RAISE EXCEPTION 'Un email ou un téléphone est requis';
  END IF;

  SELECT id INTO v_shop_id FROM public.shops WHERE lower(trim(slug)) = lower(trim(p_slug));
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'Magasin introuvable'; END IF;

  SELECT * INTO v_cfg FROM public.shop_website_config WHERE shop_id = v_shop_id;
  IF v_cfg.id IS NULL OR v_cfg.enabled = false OR v_cfg.buyback_enabled = false THEN
    RAISE EXCEPTION 'Ce magasin ne recoit pas de demandes de rachat';
  END IF;
  IF NOT (p_category = ANY (v_cfg.buyback_categories)) THEN
    RAISE EXCEPTION 'Categorie non acceptee par ce magasin';
  END IF;

  SELECT media_retention_days INTO v_retention FROM public.buyback_settings WHERE id = true;

  v_bc_id := public.buyback_upsert_customer(p_customer_name, p_customer_email, p_customer_phone, p_customer_city, p_customer_postal_code, p_marketing_consent);
  PERFORM public.buyback_link_shop_customer(v_shop_id, v_bc_id);

  INSERT INTO public.buyback_requests (
    shop_id, category, brand, model, answers, media,
    customer_name, customer_email, customer_phone, customer_city, customer_postal_code,
    media_expires_at, buyback_customer_id
  ) VALUES (
    v_shop_id, p_category, nullif(trim(p_brand), ''), nullif(trim(p_model), ''),
    coalesce(p_answers, '{}'::jsonb), coalesce(p_media, '[]'::jsonb),
    trim(p_customer_name), nullif(trim(p_customer_email), ''), nullif(trim(p_customer_phone), ''),
    nullif(trim(p_customer_city), ''), nullif(trim(p_customer_postal_code), ''),
    now() + (coalesce(v_retention, 60) || ' days')::interval, v_bc_id
  ) RETURNING public_token INTO v_token;

  RETURN v_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_buyback_request_national(p_shop_id uuid, p_category text, p_brand text, p_model text, p_answers jsonb, p_media jsonb, p_customer_name text, p_customer_email text, p_customer_phone text, p_customer_city text, p_customer_postal_code text, p_marketing_consent boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_cfg record; v_retention integer; v_delay integer; v_token text; v_bc_id uuid;
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

  v_bc_id := public.buyback_upsert_customer(p_customer_name, p_customer_email, p_customer_phone, p_customer_city, p_customer_postal_code, p_marketing_consent);
  IF p_shop_id IS NOT NULL THEN
    PERFORM public.buyback_link_shop_customer(p_shop_id, v_bc_id);
  END IF;

  INSERT INTO public.buyback_requests (
    shop_id, category, brand, model, answers, media,
    customer_name, customer_email, customer_phone, customer_city, customer_postal_code,
    media_expires_at, status, network_open, network_opened_at, network_deadline, buyback_customer_id
  ) VALUES (
    p_shop_id, p_category, nullif(trim(p_brand), ''), nullif(trim(p_model), ''),
    coalesce(p_answers, '{}'::jsonb), coalesce(p_media, '[]'::jsonb),
    trim(p_customer_name), nullif(trim(p_customer_email), ''), nullif(trim(p_customer_phone), ''),
    nullif(trim(p_customer_city), ''), nullif(trim(p_customer_postal_code), ''),
    now() + (coalesce(v_retention, 60) || ' days')::interval,
    CASE WHEN p_shop_id IS NULL THEN 'network' ELSE 'pending' END,
    p_shop_id IS NULL,
    CASE WHEN p_shop_id IS NULL THEN now() ELSE NULL END,
    CASE WHEN p_shop_id IS NULL THEN now() + (coalesce(v_delay, 48) || ' hours')::interval ELSE NULL END,
    v_bc_id
  ) RETURNING public_token INTO v_token;

  RETURN v_token;
END;
$function$;