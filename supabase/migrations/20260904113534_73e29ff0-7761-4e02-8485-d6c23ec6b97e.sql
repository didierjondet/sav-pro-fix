CREATE OR REPLACE FUNCTION public.shop_is_publicly_visible(_shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shops s
    JOIN public.partner_profiles pp ON pp.shop_id = s.id
    WHERE s.id = _shop_id
      AND s.partner_directory_opt_in = true
      AND pp.is_published = true
      AND (pp.visible_public = true OR pp.visible_pro = true)
  );
$$;

GRANT EXECUTE ON FUNCTION public.shop_is_publicly_visible(uuid) TO anon, authenticated, service_role;

-- 1) Sélecteur de magasin pour le rachat
CREATE OR REPLACE FUNCTION public.get_buyback_shops(p_category text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS TABLE(shop_id uuid, slug text, name text, city text, postal_code text, logo_url text, categories text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND public.shop_is_publicly_visible(s.id)
    AND (p_category IS NULL OR p_category = ANY (c.buyback_categories))
    AND (
      coalesce(trim(p_search), '') = ''
      OR public.fx_norm(s.name) LIKE '%' || public.fx_norm(p_search) || '%'
      OR public.fx_norm(coalesce(pp.city, '')) LIKE '%' || public.fx_norm(p_search) || '%'
      OR coalesce(pp.postal_code, '') LIKE trim(p_search) || '%'
    )
  ORDER BY s.name
  LIMIT 60;
$function$;

-- 2) Site vitrine
CREATE OR REPLACE FUNCTION public.get_shop_website(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_shop record; v_cfg record; v_result jsonb; v_partner_slug text;
BEGIN
  SELECT id, name, slug, address, phone, email, logo_url, website_title, website_description, review_link
  INTO v_shop FROM public.shops WHERE lower(trim(slug)) = lower(trim(p_slug));
  IF v_shop.id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF NOT public.shop_is_publicly_visible(v_shop.id) THEN
    RETURN jsonb_build_object(
      'status', 'disabled',
      'shop_name', v_shop.name,
      'partner_slug', NULL
    );
  END IF;

  SELECT btrim(pp.slug) INTO v_partner_slug
    FROM public.partner_profiles pp
    JOIN public.shops s ON s.id = pp.shop_id
   WHERE pp.shop_id = v_shop.id AND pp.is_published = true
     AND pp.visible_public = true AND s.partner_directory_opt_in = true;

  SELECT * INTO v_cfg FROM public.shop_website_config WHERE shop_id = v_shop.id;
  IF v_cfg.id IS NULL OR v_cfg.enabled = false THEN
    RETURN jsonb_build_object(
      'status', 'disabled',
      'shop_name', v_shop.name,
      'partner_slug', v_partner_slug
    );
  END IF;

  v_result := jsonb_build_object(
    'status', 'ok',
    'partner_slug', v_partner_slug,
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
      SELECT jsonb_agg(jsonb_build_object(
        'name', i.label,
        'description', i.note,
        'price', i.public_price,
        'category', i.device_family,
        'kind', i.kind,
        'delay_days', i.delay_days)
        ORDER BY i.display_order, i.label)
      FROM public.partner_price_items i
      WHERE i.shop_id = v_shop.id AND i.visible_public = true AND i.published = true), '[]'::jsonb),
    'partner', COALESCE((
      SELECT jsonb_build_object('specialties', pp.specialties, 'specialty_tags', to_jsonb(pp.specialty_tags),
        'certifications', pp.certifications, 'warranty_terms', pp.warranty_terms,
        'avg_delay_days', pp.avg_delay_days, 'city', pp.city, 'postal_code', pp.postal_code,
        'prices_include_vat', pp.prices_include_vat, 'vat_rate', pp.vat_rate, 'vat_exempt', pp.vat_exempt)
      FROM public.partner_profiles pp WHERE pp.shop_id = v_shop.id), '{}'::jsonb)
  );
  RETURN v_result;
END;
$function$;

-- 3) Annuaire public
CREATE OR REPLACE FUNCTION public.get_public_partner_directory(_search text DEFAULT NULL::text)
 RETURNS TABLE(slug text, public_name text, logo_url text, city text, postal_code text, coverage_area text, description text, specialties text, specialty_tags text[], avg_delay_days integer, certifications text, shop_slug text, has_website boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH q AS (SELECT public.fx_norm(NULLIF(btrim(COALESCE(_search, '')), '')) AS s,
                    NULLIF(btrim(COALESCE(_search, '')), '') AS raw)
  SELECT btrim(pp.slug), btrim(pp.public_name), pp.logo_url, pp.city, pp.postal_code, pp.coverage_area,
         pp.description, pp.specialties, pp.specialty_tags, pp.avg_delay_days, pp.certifications,
         btrim(s.slug),
         COALESCE(wc.enabled, false) AND s.slug IS NOT NULL
    FROM public.partner_profiles pp
    JOIN public.shops s ON s.id = pp.shop_id
    LEFT JOIN public.shop_website_config wc ON wc.shop_id = pp.shop_id
   CROSS JOIN q
   WHERE pp.is_published = true AND s.partner_directory_opt_in = true
     AND pp.visible_public = true
     AND public.shop_is_publicly_visible(s.id)
     AND (
       q.raw IS NULL OR
       public.fx_norm(pp.public_name) LIKE '%' || q.s || '%' OR
       public.fx_norm(s.name) LIKE '%' || q.s || '%' OR
       public.fx_norm(pp.city) LIKE '%' || q.s || '%' OR
       COALESCE(pp.postal_code,'') LIKE q.raw || '%' OR
       public.fx_norm(pp.coverage_area) LIKE '%' || q.s || '%' OR
       public.fx_norm(pp.specialties) LIKE '%' || q.s || '%' OR
       public.fx_norm(array_to_string(pp.specialty_tags, ',')) LIKE '%' || q.s || '%' OR
       public.fx_norm(pp.description) LIKE '%' || q.s || '%'
     )
   ORDER BY btrim(pp.public_name);
$function$;

-- 4) Annuaire pro
CREATE OR REPLACE FUNCTION public.get_pro_partner_directory(_search text DEFAULT NULL::text)
 RETURNS TABLE(shop_id uuid, partner_code text, slug text, public_name text, logo_url text, city text, postal_code text, coverage_area text, public_phone text, public_email text, description text, specialties text, specialty_tags text[], certifications text, warranty_terms text, shipping_modes text, avg_delay_days integer, return_policy text, failure_policy text, prices_include_vat boolean, vat_rate numeric, vat_exempt boolean, pro_prices jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH q AS (SELECT public.fx_norm(NULLIF(btrim(COALESCE(_search, '')), '')) AS s,
                    NULLIF(btrim(COALESCE(_search, '')), '') AS raw)
  SELECT s.id, s.partner_code, btrim(pp.slug), btrim(pp.public_name), pp.logo_url, pp.city, pp.postal_code,
         pp.coverage_area, pp.public_phone, pp.public_email, pp.description, pp.specialties,
         pp.specialty_tags,
         pp.certifications, pp.warranty_terms, pp.shipping_modes, pp.avg_delay_days,
         pp.return_policy, pp.failure_policy, pp.prices_include_vat, pp.vat_rate, pp.vat_exempt,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'label', pi.label,
             'device_family', pi.device_family,
             'pro_price', pi.pro_price,
             'public_price', pi.public_price,
             'delay_days', pi.delay_days,
             'note', pi.note
           ) ORDER BY pi.display_order, pi.label)
           FROM public.partner_price_items pi
           WHERE pi.profile_id = pp.id AND pi.visible_pro = true
         ), '[]'::jsonb)
    FROM public.partner_profiles pp
    JOIN public.shops s ON s.id = pp.shop_id
   CROSS JOIN q
   WHERE pp.is_published = true
     AND s.partner_directory_opt_in = true
     AND pp.visible_pro = true
     AND public.shop_is_publicly_visible(s.id)
     AND s.id <> COALESCE(public.get_current_user_shop_id(), '00000000-0000-0000-0000-000000000000'::uuid)
     AND (
       q.raw IS NULL OR
       public.fx_norm(pp.public_name) LIKE '%' || q.s || '%' OR
       public.fx_norm(s.name) LIKE '%' || q.s || '%' OR
       public.fx_norm(pp.city) LIKE '%' || q.s || '%' OR
       COALESCE(pp.postal_code,'') LIKE q.raw || '%' OR
       public.fx_norm(pp.coverage_area) LIKE '%' || q.s || '%' OR
       public.fx_norm(pp.specialties) LIKE '%' || q.s || '%' OR
       public.fx_norm(array_to_string(pp.specialty_tags, ',')) LIKE '%' || q.s || '%'
     )
   ORDER BY btrim(pp.public_name);
$function$;

-- 5) Fiche partenaire publique
CREATE OR REPLACE FUNCTION public.get_public_partner(_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'slug', pp.slug,
    'public_name', pp.public_name,
    'logo_url', pp.logo_url,
    'city', pp.city,
    'postal_code', pp.postal_code,
    'coverage_area', pp.coverage_area,
    'public_phone', pp.public_phone,
    'public_email', pp.public_email,
    'website_url', pp.website_url,
    'shop_slug', s.slug,
    'has_website', COALESCE(wc.enabled, false) AND s.slug IS NOT NULL,
    'description', pp.description,
    'specialties', pp.specialties,
    'specialty_tags', to_jsonb(pp.specialty_tags),
    'certifications', pp.certifications,
    'warranty_terms', pp.warranty_terms,
    'shipping_modes', pp.shipping_modes,
    'avg_delay_days', pp.avg_delay_days,
    'return_policy', pp.return_policy,
    'failure_policy', pp.failure_policy,
    'prices_include_vat', pp.prices_include_vat,
    'vat_rate', pp.vat_rate,
    'vat_exempt', pp.vat_exempt,
    'prices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', pi.label,
        'device_family', pi.device_family,
        'price', pi.public_price,
        'delay_days', pi.delay_days,
        'note', pi.note
      ) ORDER BY pi.display_order, pi.label)
      FROM public.partner_price_items pi
      WHERE pi.profile_id = pp.id AND pi.visible_public = true AND pi.public_price IS NOT NULL
    ), '[]'::jsonb)
  )
  FROM public.partner_profiles pp
  JOIN public.shops s ON s.id = pp.shop_id
  LEFT JOIN public.shop_website_config wc ON wc.shop_id = pp.shop_id
  WHERE pp.slug = _slug AND pp.is_published = true
    AND s.partner_directory_opt_in = true AND pp.visible_public = true
    AND public.shop_is_publicly_visible(s.id)
  LIMIT 1;
$function$;

-- 6) Demandes de rachat réseau
CREATE OR REPLACE FUNCTION public.get_network_buyback_requests()
 RETURNS TABLE(id uuid, category text, brand text, model text, answers jsonb, media jsonb, customer_city text, customer_postal_code text, created_at timestamp with time zone, network_deadline timestamp with time zone, origin_shop_city text, my_offer_amount numeric, offers_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_shop_id uuid; v_categories text[];
BEGIN
  v_shop_id := public.get_current_user_shop_id();
  IF v_shop_id IS NULL THEN RETURN; END IF;
  IF NOT public.shop_is_publicly_visible(v_shop_id) THEN RETURN; END IF;

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
$function$;