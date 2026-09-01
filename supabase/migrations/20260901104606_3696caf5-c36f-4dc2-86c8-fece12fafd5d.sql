ALTER TABLE public.partner_profiles
  ADD COLUMN IF NOT EXISTS visible_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visible_pro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS specialty_tags text[] NOT NULL DEFAULT '{}';

-- Backfill : les fiches déjà publiées et opt-in restent visibles partout
UPDATE public.partner_profiles pp
   SET visible_public = true, visible_pro = true
  FROM public.shops s
 WHERE s.id = pp.shop_id
   AND pp.is_published = true
   AND s.partner_directory_opt_in = true;

-- Backfill des tags depuis le champ texte libre
UPDATE public.partner_profiles
   SET specialty_tags = ARRAY(
     SELECT btrim(x) FROM unnest(string_to_array(specialties, ',')) AS x WHERE btrim(x) <> ''
   )
 WHERE COALESCE(specialties, '') <> ''
   AND cardinality(specialty_tags) = 0;

DROP FUNCTION IF EXISTS public.get_public_partner_directory(text);
DROP FUNCTION IF EXISTS public.get_pro_partner_directory(text);

CREATE OR REPLACE FUNCTION public.get_public_partner_directory(_search text DEFAULT NULL::text)
 RETURNS TABLE(slug text, public_name text, logo_url text, city text, postal_code text, coverage_area text, description text, specialties text, specialty_tags text[], avg_delay_days integer, certifications text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pp.slug, pp.public_name, pp.logo_url, pp.city, pp.postal_code, pp.coverage_area,
         pp.description, pp.specialties, pp.specialty_tags, pp.avg_delay_days, pp.certifications
    FROM public.partner_profiles pp
    JOIN public.shops s ON s.id = pp.shop_id
   WHERE pp.is_published = true AND s.partner_directory_opt_in = true
     AND pp.visible_public = true
     AND (
       _search IS NULL OR _search = '' OR
       pp.public_name ILIKE '%' || _search || '%' OR
       COALESCE(pp.city,'') ILIKE '%' || _search || '%' OR
       COALESCE(pp.postal_code,'') ILIKE '%' || _search || '%' OR
       COALESCE(pp.specialties,'') ILIKE '%' || _search || '%' OR
       array_to_string(pp.specialty_tags, ',') ILIKE '%' || _search || '%' OR
       COALESCE(pp.description,'') ILIKE '%' || _search || '%'
     )
   ORDER BY pp.public_name;
$function$;

CREATE OR REPLACE FUNCTION public.get_pro_partner_directory(_search text DEFAULT NULL::text)
 RETURNS TABLE(shop_id uuid, partner_code text, slug text, public_name text, logo_url text, city text, postal_code text, coverage_area text, public_phone text, public_email text, description text, specialties text, specialty_tags text[], certifications text, warranty_terms text, shipping_modes text, avg_delay_days integer, return_policy text, failure_policy text, prices_include_vat boolean, vat_rate numeric, vat_exempt boolean, pro_prices jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.partner_code, pp.slug, pp.public_name, pp.logo_url, pp.city, pp.postal_code,
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
   WHERE pp.is_published = true
     AND s.partner_directory_opt_in = true
     AND pp.visible_pro = true
     AND s.id <> COALESCE(public.get_current_user_shop_id(), '00000000-0000-0000-0000-000000000000'::uuid)
     AND (
       _search IS NULL OR _search = '' OR
       pp.public_name ILIKE '%' || _search || '%' OR
       COALESCE(pp.city,'') ILIKE '%' || _search || '%' OR
       COALESCE(pp.postal_code,'') ILIKE '%' || _search || '%' OR
       COALESCE(pp.specialties,'') ILIKE '%' || _search || '%' OR
       array_to_string(pp.specialty_tags, ',') ILIKE '%' || _search || '%'
     )
   ORDER BY pp.public_name;
$function$;

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
  WHERE pp.slug = _slug AND pp.is_published = true
    AND s.partner_directory_opt_in = true AND pp.visible_public = true
  LIMIT 1;
$function$;