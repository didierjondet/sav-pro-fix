
CREATE TABLE IF NOT EXISTS public.buyback_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  phone_norm text,
  email text,
  email_norm text,
  city text,
  postal_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.buyback_customers TO authenticated;
GRANT ALL ON public.buyback_customers TO service_role;

ALTER TABLE public.buyback_customers ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS buyback_customers_phone_norm_key
  ON public.buyback_customers (phone_norm) WHERE phone_norm IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS buyback_customers_email_norm_key
  ON public.buyback_customers (email_norm) WHERE email_norm IS NOT NULL AND phone_norm IS NULL;

ALTER TABLE public.buyback_requests
  ADD COLUMN IF NOT EXISTS buyback_customer_id uuid REFERENCES public.buyback_customers(id) ON DELETE SET NULL;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS buyback_customer_id uuid REFERENCES public.buyback_customers(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_shop_buyback_customer_key
  ON public.customers (shop_id, buyback_customer_id) WHERE buyback_customer_id IS NOT NULL;

DROP POLICY IF EXISTS "Shops can view buyback customers linked to their activity" ON public.buyback_customers;
CREATE POLICY "Shops can view buyback customers linked to their activity"
ON public.buyback_customers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.buyback_requests r
    WHERE r.buyback_customer_id = buyback_customers.id
      AND r.shop_id = public.get_current_user_shop_id()
  )
  OR EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.buyback_customer_id = buyback_customers.id
      AND c.shop_id = public.get_current_user_shop_id()
  )
  OR public.is_super_admin()
);

CREATE OR REPLACE FUNCTION public.buyback_normalize_phone(p_phone text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_phone IS NULL OR regexp_replace(p_phone, '\D', '', 'g') = '' THEN NULL
    ELSE right(regexp_replace(p_phone, '\D', '', 'g'), 9)
  END;
$$;

CREATE OR REPLACE FUNCTION public.buyback_upsert_customer(
  p_name text, p_email text, p_phone text, p_city text, p_postal_code text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
    INSERT INTO public.buyback_customers (full_name, phone, phone_norm, email, email_norm, city, postal_code)
    VALUES (trim(p_name), nullif(trim(coalesce(p_phone,'')), ''), v_phone_norm,
            nullif(trim(coalesce(p_email,'')), ''), v_email_norm,
            nullif(trim(coalesce(p_city,'')), ''), nullif(trim(coalesce(p_postal_code,'')), ''))
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
      updated_at = now()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.buyback_link_shop_customer(p_shop_id uuid, p_buyback_customer_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_bc record; v_customer_id uuid; v_first text; v_last text; v_phone_norm text;
BEGIN
  IF p_shop_id IS NULL OR p_buyback_customer_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_bc FROM public.buyback_customers WHERE id = p_buyback_customer_id;
  IF v_bc.id IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_customer_id FROM public.customers
   WHERE shop_id = p_shop_id AND buyback_customer_id = p_buyback_customer_id LIMIT 1;
  IF v_customer_id IS NOT NULL THEN RETURN v_customer_id; END IF;

  v_phone_norm := v_bc.phone_norm;
  IF v_phone_norm IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM public.customers
     WHERE shop_id = p_shop_id
       AND public.buyback_normalize_phone(phone) = v_phone_norm
     LIMIT 1;
  END IF;
  IF v_customer_id IS NULL AND v_bc.email_norm IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM public.customers
     WHERE shop_id = p_shop_id AND lower(trim(coalesce(email,''))) = v_bc.email_norm LIMIT 1;
  END IF;

  IF v_customer_id IS NOT NULL THEN
    UPDATE public.customers SET buyback_customer_id = p_buyback_customer_id, updated_at = now()
     WHERE id = v_customer_id;
    RETURN v_customer_id;
  END IF;

  v_first := split_part(trim(v_bc.full_name), ' ', 1);
  v_last := nullif(trim(substr(trim(v_bc.full_name), length(v_first) + 1)), '');

  INSERT INTO public.customers (shop_id, first_name, last_name, email, phone, buyback_customer_id)
  VALUES (p_shop_id, coalesce(nullif(v_first,''), 'Client'), coalesce(v_last, ''),
          v_bc.email, v_bc.phone, p_buyback_customer_id)
  RETURNING id INTO v_customer_id;

  RETURN v_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_buyback_request(p_slug text, p_category text, p_brand text, p_model text, p_answers jsonb, p_media jsonb, p_customer_name text, p_customer_email text, p_customer_phone text, p_customer_city text, p_customer_postal_code text)
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

  v_bc_id := public.buyback_upsert_customer(p_customer_name, p_customer_email, p_customer_phone, p_customer_city, p_customer_postal_code);
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

CREATE OR REPLACE FUNCTION public.submit_buyback_request_national(p_shop_id uuid, p_category text, p_brand text, p_model text, p_answers jsonb, p_media jsonb, p_customer_name text, p_customer_email text, p_customer_phone text, p_customer_city text, p_customer_postal_code text)
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

  v_bc_id := public.buyback_upsert_customer(p_customer_name, p_customer_email, p_customer_phone, p_customer_city, p_customer_postal_code);
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

CREATE OR REPLACE FUNCTION public.submit_network_buyback_offer(p_request_id uuid, p_amount numeric, p_message text, p_conditions text, p_ai_low numeric DEFAULT NULL::numeric, p_ai_mid numeric DEFAULT NULL::numeric, p_ai_high numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_shop_id uuid; v_ok boolean; v_id uuid; v_bc_id uuid;
BEGIN
  v_shop_id := public.get_current_user_shop_id();
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'Magasin introuvable'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.buyback_requests r
    JOIN public.shop_website_config c ON c.shop_id = v_shop_id AND c.buyback_enabled = true
    WHERE r.id = p_request_id AND r.network_open = true AND r.status = 'network'
      AND (r.network_deadline IS NULL OR r.network_deadline > now())
      AND r.category = ANY (c.buyback_categories)
  ) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'Cotation non disponible'; END IF;

  INSERT INTO public.buyback_offers (request_id, shop_id, amount, message, conditions,
    is_network_offer, ai_low, ai_mid, ai_high)
  VALUES (p_request_id, v_shop_id, p_amount, p_message, p_conditions, true, p_ai_low, p_ai_mid, p_ai_high)
  ON CONFLICT (request_id, shop_id) DO UPDATE
    SET amount = EXCLUDED.amount, message = EXCLUDED.message, conditions = EXCLUDED.conditions,
        updated_at = now()
  RETURNING id INTO v_id;

  SELECT buyback_customer_id INTO v_bc_id FROM public.buyback_requests WHERE id = p_request_id;
  IF v_bc_id IS NOT NULL THEN
    PERFORM public.buyback_link_shop_customer(v_shop_id, v_bc_id);
  END IF;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_buyback_customer_history(p_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_bc_id uuid; v_result jsonb;
BEGIN
  SELECT buyback_customer_id INTO v_bc_id FROM public.buyback_requests WHERE public_token = p_token;
  IF v_bc_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'token', r.public_token, 'category', r.category, 'brand', r.brand, 'model', r.model,
    'status', r.status, 'created_at', r.created_at,
    'shop_name', (SELECT s.name FROM public.shops s WHERE s.id = r.shop_id)
  ) ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_result
  FROM public.buyback_requests r WHERE r.buyback_customer_id = v_bc_id;

  RETURN v_result;
END;
$$;
