ALTER TABLE public.buyback_customers ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE;

-- Lier le compte connecté au compte vendeur, dans les deux RPC d'envoi
CREATE OR REPLACE FUNCTION public.buyback_attach_user(p_bc_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.buyback_customers WHERE user_id = auth.uid() AND id <> p_bc_id) THEN RETURN; END IF;
  UPDATE public.buyback_customers SET user_id = auth.uid() WHERE id = p_bc_id AND user_id IS NULL;
END; $$;
REVOKE ALL ON FUNCTION public.buyback_attach_user(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_buyback_request(p_slug text, p_category text, p_brand text, p_model text, p_answers jsonb, p_media jsonb, p_customer_name text, p_customer_email text, p_customer_phone text, p_customer_city text, p_customer_postal_code text, p_marketing_consent boolean DEFAULT false)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_shop_id uuid; v_cfg record; v_retention integer; v_token text; v_bc_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion à votre compte requise'; END IF;
  IF coalesce(trim(p_customer_name), '') = '' THEN RAISE EXCEPTION 'Nom du client requis'; END IF;
  IF coalesce(trim(p_customer_email), '') = '' AND coalesce(trim(p_customer_phone), '') = '' THEN
    RAISE EXCEPTION 'Un email ou un téléphone est requis';
  END IF;
  SELECT id INTO v_shop_id FROM public.shops WHERE lower(trim(slug)) = lower(trim(p_slug));
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'Magasin introuvable'; END IF;
  SELECT * INTO v_cfg FROM public.shop_website_config WHERE shop_id = v_shop_id;
  IF v_cfg.id IS NULL OR v_cfg.enabled = false OR v_cfg.buyback_enabled = false THEN
    RAISE EXCEPTION 'Ce magasin ne recoit pas de demandes de rachat';
  END IF;
  IF NOT (p_category = ANY (v_cfg.buyback_categories)) THEN RAISE EXCEPTION 'Categorie non acceptee par ce magasin'; END IF;
  SELECT media_retention_days INTO v_retention FROM public.buyback_settings WHERE id = true;

  SELECT id INTO v_bc_id FROM public.buyback_customers WHERE user_id = auth.uid();
  IF v_bc_id IS NULL THEN
    v_bc_id := public.buyback_upsert_customer(p_customer_name, p_customer_email, p_customer_phone, p_customer_city, p_customer_postal_code, p_marketing_consent);
    PERFORM public.buyback_attach_user(v_bc_id);
  END IF;
  PERFORM public.buyback_link_shop_customer(v_shop_id, v_bc_id);

  INSERT INTO public.buyback_requests (shop_id, category, brand, model, answers, media,
    customer_name, customer_email, customer_phone, customer_city, customer_postal_code, media_expires_at, buyback_customer_id)
  VALUES (v_shop_id, p_category, nullif(trim(p_brand), ''), nullif(trim(p_model), ''),
    coalesce(p_answers, '{}'::jsonb), coalesce(p_media, '[]'::jsonb),
    trim(p_customer_name), nullif(trim(p_customer_email), ''), nullif(trim(p_customer_phone), ''),
    nullif(trim(p_customer_city), ''), nullif(trim(p_customer_postal_code), ''),
    now() + (coalesce(v_retention, 60) || ' days')::interval, v_bc_id)
  RETURNING public_token INTO v_token;
  RETURN v_token;
END; $function$;

CREATE OR REPLACE FUNCTION public.submit_buyback_request_national(p_shop_id uuid, p_category text, p_brand text, p_model text, p_answers jsonb, p_media jsonb, p_customer_name text, p_customer_email text, p_customer_phone text, p_customer_city text, p_customer_postal_code text, p_marketing_consent boolean DEFAULT false)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_cfg record; v_retention integer; v_delay integer; v_token text; v_bc_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion à votre compte requise'; END IF;
  IF coalesce(trim(p_customer_name), '') = '' THEN RAISE EXCEPTION 'Nom du client requis'; END IF;
  IF coalesce(trim(p_customer_email), '') = '' AND coalesce(trim(p_customer_phone), '') = '' THEN
    RAISE EXCEPTION 'Un email ou un téléphone est requis';
  END IF;
  SELECT media_retention_days, response_delay_hours INTO v_retention, v_delay FROM public.buyback_settings WHERE id = true;
  IF p_shop_id IS NOT NULL THEN
    SELECT * INTO v_cfg FROM public.shop_website_config WHERE shop_id = p_shop_id;
    IF v_cfg.id IS NULL OR v_cfg.enabled = false OR v_cfg.buyback_enabled = false THEN
      RAISE EXCEPTION 'Ce magasin ne recoit pas de demandes de rachat';
    END IF;
    IF NOT (p_category = ANY (v_cfg.buyback_categories)) THEN RAISE EXCEPTION 'Categorie non acceptee par ce magasin'; END IF;
  END IF;

  SELECT id INTO v_bc_id FROM public.buyback_customers WHERE user_id = auth.uid();
  IF v_bc_id IS NULL THEN
    v_bc_id := public.buyback_upsert_customer(p_customer_name, p_customer_email, p_customer_phone, p_customer_city, p_customer_postal_code, p_marketing_consent);
    PERFORM public.buyback_attach_user(v_bc_id);
  END IF;
  IF p_shop_id IS NOT NULL THEN PERFORM public.buyback_link_shop_customer(p_shop_id, v_bc_id); END IF;

  INSERT INTO public.buyback_requests (shop_id, category, brand, model, answers, media,
    customer_name, customer_email, customer_phone, customer_city, customer_postal_code,
    media_expires_at, status, network_open, network_opened_at, network_deadline, buyback_customer_id)
  VALUES (p_shop_id, p_category, nullif(trim(p_brand), ''), nullif(trim(p_model), ''),
    coalesce(p_answers, '{}'::jsonb), coalesce(p_media, '[]'::jsonb),
    trim(p_customer_name), nullif(trim(p_customer_email), ''), nullif(trim(p_customer_phone), ''),
    nullif(trim(p_customer_city), ''), nullif(trim(p_customer_postal_code), ''),
    now() + (coalesce(v_retention, 60) || ' days')::interval,
    CASE WHEN p_shop_id IS NULL THEN 'network' ELSE 'pending' END, p_shop_id IS NULL,
    CASE WHEN p_shop_id IS NULL THEN now() ELSE NULL END,
    CASE WHEN p_shop_id IS NULL THEN now() + (coalesce(v_delay, 48) || ' hours')::interval ELSE NULL END,
    v_bc_id)
  RETURNING public_token INTO v_token;
  RETURN v_token;
END; $function$;

-- Espace particulier
CREATE OR REPLACE FUNCTION public.get_my_buyback_account()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN bc.id IS NULL THEN NULL ELSE jsonb_build_object(
    'profile', jsonb_build_object('full_name', bc.full_name, 'email', bc.email, 'phone', bc.phone,
       'city', bc.city, 'postal_code', bc.postal_code, 'marketing_consent', bc.marketing_consent),
    'requests', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'public_token', r.public_token, 'category', r.category, 'brand', r.brand, 'model', r.model,
        'status', r.status, 'created_at', r.created_at, 'shop_id', r.shop_id,
        'shop_name', (SELECT s.name FROM public.shops s WHERE s.id = r.shop_id),
        'offers', coalesce((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'amount', o.amount, 'status', o.status,
              'shop_id', o.shop_id, 'shop_name', (SELECT s2.name FROM public.shops s2 WHERE s2.id = o.shop_id),
              'valid_until', o.valid_until, 'message', o.message) ORDER BY o.created_at)
            FROM public.buyback_offers o WHERE o.request_id = r.id), '[]'::jsonb)
      ) ORDER BY r.created_at DESC) FROM public.buyback_requests r WHERE r.buyback_customer_id = bc.id), '[]'::jsonb)
  ) END
  FROM (SELECT 1) x LEFT JOIN public.buyback_customers bc ON bc.user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_buyback_account() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_my_buyback_profile(p_full_name text, p_phone text, p_city text, p_postal_code text, p_marketing_consent boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  UPDATE public.buyback_customers SET
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    phone = nullif(trim(p_phone), ''),
    phone_norm = CASE WHEN nullif(trim(p_phone), '') IS NULL THEN NULL ELSE public.buyback_normalize_phone(p_phone) END,
    city = nullif(trim(p_city), ''), postal_code = nullif(trim(p_postal_code), ''),
    marketing_consent = coalesce(p_marketing_consent, false),
    marketing_consent_at = CASE WHEN coalesce(p_marketing_consent, false) <> marketing_consent THEN now() ELSE marketing_consent_at END,
    updated_at = now()
  WHERE user_id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.update_my_buyback_profile(text, text, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_my_buyback_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  UPDATE public.buyback_customers SET full_name = 'Compte supprimé', email = NULL, email_norm = NULL,
    phone = NULL, phone_norm = NULL, city = NULL, postal_code = NULL, marketing_consent = false,
    user_id = NULL, updated_at = now()
  WHERE user_id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.delete_my_buyback_account() TO authenticated;

-- Messagerie particulier <-> magasin
CREATE TABLE public.buyback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.buyback_requests(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  sender text NOT NULL,
  body text NOT NULL,
  sender_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.buyback_messages TO authenticated;
GRANT ALL ON public.buyback_messages TO service_role;
ALTER TABLE public.buyback_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX buyback_messages_req_idx ON public.buyback_messages(request_id, created_at);

CREATE OR REPLACE FUNCTION public.is_my_buyback_request(p_request_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.buyback_requests r JOIN public.buyback_customers bc ON bc.id = r.buyback_customer_id
                 WHERE r.id = p_request_id AND bc.user_id = auth.uid());
$$;

CREATE POLICY "Particulier lit ses messages" ON public.buyback_messages FOR SELECT TO authenticated
  USING (public.is_my_buyback_request(request_id));
CREATE POLICY "Magasin lit ses messages" ON public.buyback_messages FOR SELECT TO authenticated
  USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Particulier écrit" ON public.buyback_messages FOR INSERT TO authenticated
  WITH CHECK (sender = 'customer' AND sender_user_id = auth.uid() AND public.is_my_buyback_request(request_id)
    AND (EXISTS (SELECT 1 FROM public.buyback_requests r WHERE r.id = request_id AND r.shop_id = buyback_messages.shop_id)
      OR EXISTS (SELECT 1 FROM public.buyback_offers o WHERE o.request_id = buyback_messages.request_id AND o.shop_id = buyback_messages.shop_id)));
CREATE POLICY "Magasin écrit" ON public.buyback_messages FOR INSERT TO authenticated
  WITH CHECK (sender = 'shop' AND sender_user_id = auth.uid() AND shop_id = public.get_current_user_shop_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.buyback_messages;