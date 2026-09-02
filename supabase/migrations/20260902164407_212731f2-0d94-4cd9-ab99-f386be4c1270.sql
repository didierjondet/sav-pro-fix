DROP FUNCTION IF EXISTS public.get_public_partner_directory(text);

CREATE FUNCTION public.get_public_partner_directory(_search text DEFAULT NULL::text)
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

GRANT EXECUTE ON FUNCTION public.get_public_partner_directory(text) TO anon, authenticated, service_role;

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
  LIMIT 1;
$function$;

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
$function$;