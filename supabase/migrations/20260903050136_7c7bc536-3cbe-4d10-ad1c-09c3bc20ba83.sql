ALTER TABLE public.partner_price_items
  ADD COLUMN IF NOT EXISTS part_id uuid REFERENCES public.parts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'service',
  ADD COLUMN IF NOT EXISTS components jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_partner_price_items_part_id ON public.partner_price_items(part_id);

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