-- =========================================================
-- 1. SITE INTERNET PAR MAGASIN
-- =========================================================
CREATE TABLE public.shop_website_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  tagline text,
  about text,
  hero_image_url text,
  opening_hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  show_services boolean NOT NULL DEFAULT true,
  show_reviews boolean NOT NULL DEFAULT true,
  buyback_enabled boolean NOT NULL DEFAULT false,
  buyback_categories text[] NOT NULL DEFAULT '{}',
  buyback_auto_accept boolean NOT NULL DEFAULT true,
  buyback_intro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_website_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_website_config TO authenticated;
GRANT ALL ON public.shop_website_config TO service_role;

ALTER TABLE public.shop_website_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view enabled shop websites"
ON public.shop_website_config FOR SELECT TO anon, authenticated
USING (enabled = true);

CREATE POLICY "Shop members manage their website config"
ON public.shop_website_config FOR ALL TO authenticated
USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin())
WITH CHECK (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE TABLE public.shop_website_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_website_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_website_photos TO authenticated;
GRANT ALL ON public.shop_website_photos TO service_role;

ALTER TABLE public.shop_website_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view photos of enabled websites"
ON public.shop_website_photos FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.shop_website_config c
  WHERE c.shop_id = shop_website_photos.shop_id AND c.enabled = true
));

CREATE POLICY "Shop members manage their website photos"
ON public.shop_website_photos FOR ALL TO authenticated
USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin())
WITH CHECK (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

-- =========================================================
-- 2. REGLAGES GLOBAUX RACHAT (SUPER ADMIN)
-- =========================================================
CREATE TABLE public.buyback_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  response_delay_hours integer NOT NULL DEFAULT 48,
  selection_rule text NOT NULL DEFAULT 'weighted_random',
  media_retention_days integer NOT NULL DEFAULT 60,
  max_offers_to_client integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.buyback_settings TO anon;
GRANT SELECT ON public.buyback_settings TO authenticated;
GRANT ALL ON public.buyback_settings TO service_role;

ALTER TABLE public.buyback_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read buyback settings"
ON public.buyback_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Super admins manage buyback settings"
ON public.buyback_settings FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

INSERT INTO public.buyback_settings (id) VALUES (true);

-- =========================================================
-- 3. DEMANDES DE RACHAT
-- =========================================================
CREATE TABLE public.buyback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  public_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  category text NOT NULL,
  brand text,
  model text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_city text,
  customer_postal_code text,
  status text NOT NULL DEFAULT 'pending',
  network_open boolean NOT NULL DEFAULT false,
  network_opened_at timestamptz,
  network_deadline timestamptz,
  network_closed_at timestamptz,
  accepted_offer_id uuid,
  media_expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_buyback_requests_shop ON public.buyback_requests(shop_id, created_at DESC);
CREATE INDEX idx_buyback_requests_network ON public.buyback_requests(network_open, network_deadline);

GRANT SELECT, INSERT, UPDATE ON public.buyback_requests TO authenticated;
GRANT ALL ON public.buyback_requests TO service_role;

ALTER TABLE public.buyback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members view their buyback requests"
ON public.buyback_requests FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE POLICY "Shop members update their buyback requests"
ON public.buyback_requests FOR UPDATE TO authenticated
USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin())
WITH CHECK (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

-- =========================================================
-- 4. OFFRES DES MAGASINS
-- =========================================================
CREATE TABLE public.buyback_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.buyback_requests(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  message text,
  conditions text,
  valid_until timestamptz,
  is_network_offer boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'sent',
  is_selected boolean NOT NULL DEFAULT false,
  selected_at timestamptz,
  ai_low numeric(10,2),
  ai_mid numeric(10,2),
  ai_high numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, shop_id)
);

CREATE INDEX idx_buyback_offers_request ON public.buyback_offers(request_id);

GRANT SELECT, INSERT, UPDATE ON public.buyback_offers TO authenticated;
GRANT ALL ON public.buyback_offers TO service_role;

ALTER TABLE public.buyback_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shops view their own offers or offers on their requests"
ON public.buyback_offers FOR SELECT TO authenticated
USING (
  shop_id = public.get_current_user_shop_id()
  OR public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.buyback_requests r
    WHERE r.id = buyback_offers.request_id
      AND r.shop_id = public.get_current_user_shop_id()
  )
);

CREATE POLICY "Shops create their own offers"
ON public.buyback_offers FOR INSERT TO authenticated
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Shops update their own offers"
ON public.buyback_offers FOR UPDATE TO authenticated
USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin())
WITH CHECK (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

-- =========================================================
-- 5. TRIGGERS updated_at
-- =========================================================
CREATE TRIGGER trg_shop_website_config_updated BEFORE UPDATE ON public.shop_website_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_shop_website_photos_updated BEFORE UPDATE ON public.shop_website_photos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_buyback_settings_updated BEFORE UPDATE ON public.buyback_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_buyback_requests_updated BEFORE UPDATE ON public.buyback_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_buyback_offers_updated BEFORE UPDATE ON public.buyback_offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 6. RPC PUBLIQUES (SANS COMPTE)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_shop_website(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_shop record; v_cfg record; v_result jsonb;
BEGIN
  SELECT id, name, slug, address, phone, email, logo_url, website_title, website_description, review_link
  INTO v_shop FROM public.shops WHERE lower(trim(slug)) = lower(trim(p_slug));
  IF v_shop.id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_cfg FROM public.shop_website_config WHERE shop_id = v_shop.id;
  IF v_cfg.id IS NULL OR v_cfg.enabled = false THEN RETURN NULL; END IF;

  v_result := jsonb_build_object(
    'shop', jsonb_build_object(
      'id', v_shop.id, 'name', v_shop.name, 'slug', v_shop.slug,
      'address', v_shop.address, 'phone', v_shop.phone, 'email', v_shop.email,
      'logo_url', v_shop.logo_url, 'title', v_shop.website_title,
      'description', v_shop.website_description, 'review_link', v_shop.review_link
    ),
    'config', jsonb_build_object(
      'tagline', v_cfg.tagline, 'about', v_cfg.about, 'hero_image_url', v_cfg.hero_image_url,
      'opening_hours', v_cfg.opening_hours, 'social_links', v_cfg.social_links,
      'show_services', v_cfg.show_services, 'show_reviews', v_cfg.show_reviews,
      'buyback_enabled', v_cfg.buyback_enabled, 'buyback_categories', to_jsonb(v_cfg.buyback_categories),
      'buyback_intro', v_cfg.buyback_intro
    ),
    'photos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('url', p.url, 'caption', p.caption) ORDER BY p.display_order)
      FROM public.shop_website_photos p WHERE p.shop_id = v_shop.id), '[]'::jsonb),
    'services', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', s.name, 'description', s.description,
        'price', s.price, 'category', s.category, 'duration_minutes', s.duration_minutes)
        ORDER BY s.display_order)
      FROM public.shop_services s WHERE s.shop_id = v_shop.id AND s.visible = true), '[]'::jsonb),
    'partner', COALESCE((
      SELECT jsonb_build_object('specialties', pp.specialties, 'specialty_tags', to_jsonb(pp.specialty_tags),
        'certifications', pp.certifications, 'warranty_terms', pp.warranty_terms,
        'avg_delay_days', pp.avg_delay_days, 'city', pp.city, 'postal_code', pp.postal_code)
      FROM public.partner_profiles pp WHERE pp.shop_id = v_shop.id), '{}'::jsonb)
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_buyback_request(
  p_slug text, p_category text, p_brand text, p_model text,
  p_answers jsonb, p_media jsonb,
  p_customer_name text, p_customer_email text, p_customer_phone text,
  p_customer_city text, p_customer_postal_code text
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_shop_id uuid; v_cfg record; v_retention integer; v_token text;
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

  INSERT INTO public.buyback_requests (
    shop_id, category, brand, model, answers, media,
    customer_name, customer_email, customer_phone, customer_city, customer_postal_code,
    media_expires_at
  ) VALUES (
    v_shop_id, p_category, nullif(trim(p_brand), ''), nullif(trim(p_model), ''),
    coalesce(p_answers, '{}'::jsonb), coalesce(p_media, '[]'::jsonb),
    trim(p_customer_name), nullif(trim(p_customer_email), ''), nullif(trim(p_customer_phone), ''),
    nullif(trim(p_customer_city), ''), nullif(trim(p_customer_postal_code), ''),
    now() + (coalesce(v_retention, 60) || ' days')::interval
  ) RETURNING public_token INTO v_token;

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_buyback_request_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_req record; v_result jsonb;
BEGIN
  SELECT * INTO v_req FROM public.buyback_requests WHERE public_token = p_token;
  IF v_req.id IS NULL THEN RETURN NULL; END IF;

  v_result := jsonb_build_object(
    'id', v_req.id, 'category', v_req.category, 'brand', v_req.brand, 'model', v_req.model,
    'answers', v_req.answers, 'media', v_req.media, 'status', v_req.status,
    'network_open', v_req.network_open, 'network_deadline', v_req.network_deadline,
    'created_at', v_req.created_at,
    'shop', (SELECT jsonb_build_object('name', s.name, 'slug', s.slug, 'logo_url', s.logo_url)
             FROM public.shops s WHERE s.id = v_req.shop_id),
    'offers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id, 'amount', o.amount, 'message', o.message, 'conditions', o.conditions,
        'valid_until', o.valid_until, 'status', o.status, 'is_network_offer', o.is_network_offer,
        'shop_name', s.name, 'shop_city', coalesce(pp.city, ''), 'shop_logo', s.logo_url)
        ORDER BY o.amount DESC)
      FROM public.buyback_offers o
      JOIN public.shops s ON s.id = o.shop_id
      LEFT JOIN public.partner_profiles pp ON pp.shop_id = o.shop_id
      WHERE o.request_id = v_req.id
        AND (o.is_network_offer = false OR o.is_selected = true)
        AND o.status <> 'withdrawn'
    ), '[]'::jsonb)
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_buyback_offer(
  p_token text, p_offer_id uuid, p_action text, p_open_network boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_req record; v_delay integer;
BEGIN
  SELECT * INTO v_req FROM public.buyback_requests WHERE public_token = p_token;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Demande introuvable'; END IF;

  IF p_action = 'accept' THEN
    UPDATE public.buyback_offers SET status = 'accepted' WHERE id = p_offer_id AND request_id = v_req.id;
    UPDATE public.buyback_offers SET status = 'declined'
      WHERE request_id = v_req.id AND id <> p_offer_id AND status = 'sent';
    UPDATE public.buyback_requests
      SET status = 'accepted', accepted_offer_id = p_offer_id WHERE id = v_req.id;
    RETURN jsonb_build_object('status', 'accepted');

  ELSIF p_action = 'refuse' THEN
    UPDATE public.buyback_offers SET status = 'declined' WHERE id = p_offer_id AND request_id = v_req.id;
    IF p_open_network THEN
      SELECT response_delay_hours INTO v_delay FROM public.buyback_settings WHERE id = true;
      UPDATE public.buyback_requests
        SET status = 'network', network_open = true, network_opened_at = now(),
            network_deadline = now() + (coalesce(v_delay, 48) || ' hours')::interval
        WHERE id = v_req.id;
      RETURN jsonb_build_object('status', 'network');
    END IF;
    UPDATE public.buyback_requests SET status = 'refused' WHERE id = v_req.id;
    RETURN jsonb_build_object('status', 'refused');
  END IF;

  RAISE EXCEPTION 'Action invalide';
END;
$$;

-- =========================================================
-- 7. RESEAU : LECTURE MASQUEE POUR LES MAGASINS
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_network_buyback_requests()
RETURNS TABLE (
  id uuid, category text, brand text, model text, answers jsonb, media jsonb,
  customer_city text, customer_postal_code text, created_at timestamptz,
  network_deadline timestamptz, origin_shop_city text, my_offer_amount numeric, offers_count integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_shop_id uuid; v_categories text[];
BEGIN
  v_shop_id := public.get_current_user_shop_id();
  IF v_shop_id IS NULL THEN RETURN; END IF;

  SELECT c.buyback_categories INTO v_categories
  FROM public.shop_website_config c WHERE c.shop_id = v_shop_id AND c.buyback_enabled = true;
  IF v_categories IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT r.id, r.category, r.brand, r.model, r.answers, r.media,
         r.customer_city, r.customer_postal_code, r.created_at, r.network_deadline,
         coalesce(pp.city, '') AS origin_shop_city,
         (SELECT o.amount FROM public.buyback_offers o
            WHERE o.request_id = r.id AND o.shop_id = v_shop_id) AS my_offer_amount,
         (SELECT count(*)::integer FROM public.buyback_offers o2 WHERE o2.request_id = r.id) AS offers_count
  FROM public.buyback_requests r
  LEFT JOIN public.partner_profiles pp ON pp.shop_id = r.shop_id
  WHERE r.network_open = true
    AND r.status = 'network'
    AND (r.network_deadline IS NULL OR r.network_deadline > now())
    AND r.shop_id IS DISTINCT FROM v_shop_id
    AND r.category = ANY (v_categories)
  ORDER BY r.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_network_buyback_offer(
  p_request_id uuid, p_amount numeric, p_message text, p_conditions text,
  p_ai_low numeric DEFAULT NULL, p_ai_mid numeric DEFAULT NULL, p_ai_high numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_shop_id uuid; v_ok boolean; v_id uuid;
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

  RETURN v_id;
END;
$$;

-- =========================================================
-- 8. CLOTURE D'UNE COTATION RESEAU : SELECTION DES 3 OFFRES
-- =========================================================
CREATE OR REPLACE FUNCTION public.close_buyback_round(p_request_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rule text; v_max integer; v_max_amount numeric; v_selected integer := 0;
  v_ids uuid[];
BEGIN
  SELECT selection_rule, max_offers_to_client INTO v_rule, v_max
  FROM public.buyback_settings WHERE id = true;
  v_max := coalesce(v_max, 3);

  SELECT max(amount) INTO v_max_amount FROM public.buyback_offers
  WHERE request_id = p_request_id AND is_network_offer = true AND status = 'sent';
  IF v_max_amount IS NULL THEN
    UPDATE public.buyback_requests
      SET status = 'network_closed', network_open = false, network_closed_at = now()
      WHERE id = p_request_id;
    RETURN 0;
  END IF;

  WITH candidates AS (
    SELECT o.id, o.amount, o.shop_id,
      -- garde-fou d'equite : malus si le magasin a deja ete retenu recemment
      CASE WHEN (
        SELECT count(*) FROM public.buyback_offers o2
        WHERE o2.shop_id = o.shop_id AND o2.is_selected = true
          AND o2.selected_at > now() - interval '30 days'
      ) >= 3 THEN 0.5 ELSE 1.0 END AS fairness
    FROM public.buyback_offers o
    WHERE o.request_id = p_request_id AND o.is_network_offer = true AND o.status = 'sent'
  ), scored AS (
    SELECT id, amount,
      CASE
        -- tirage pondere par le montant, plafonne pour eviter l'ecrasement
        WHEN v_rule = 'weighted_random' THEN
          random() * least(amount / NULLIF(v_max_amount, 0), 1.0) * fairness
        -- tirage au sort parmi les meilleures offres (top 30%)
        WHEN v_rule = 'random_top' THEN
          CASE WHEN amount >= v_max_amount * 0.7 THEN random() * fairness ELSE random() * 0.01 END
        -- les meilleurs montants, ordre aleatoire cote affichage
        ELSE amount::double precision
      END AS score
    FROM candidates
  )
  SELECT array_agg(id) INTO v_ids FROM (
    SELECT id FROM scored ORDER BY score DESC LIMIT v_max
  ) t;

  UPDATE public.buyback_offers
    SET is_selected = true, selected_at = now()
    WHERE id = ANY (v_ids);
  GET DIAGNOSTICS v_selected = ROW_COUNT;

  UPDATE public.buyback_offers
    SET status = 'not_selected'
    WHERE request_id = p_request_id AND is_network_offer = true
      AND status = 'sent' AND NOT (id = ANY (v_ids));

  UPDATE public.buyback_requests
    SET status = 'network_closed', network_open = false, network_closed_at = now()
    WHERE id = p_request_id;

  RETURN v_selected;
END;
$$;
