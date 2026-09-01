CREATE OR REPLACE FUNCTION public.fx_norm(_t text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT lower(translate(COALESCE(_t,''),
    'àáâäãåÀÁÂÄÃÅéèêëÉÈÊËíìîïÍÌÎÏóòôöõÓÒÔÖÕúùûüÚÙÛÜçÇñÑ',
    'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN'));
$function$;

REVOKE ALL ON FUNCTION public.fx_norm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fx_norm(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_partner_directory(_search text DEFAULT NULL::text)
 RETURNS TABLE(slug text, public_name text, logo_url text, city text, postal_code text, coverage_area text, description text, specialties text, specialty_tags text[], avg_delay_days integer, certifications text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH q AS (SELECT public.fx_norm(NULLIF(btrim(COALESCE(_search, '')), '')) AS s,
                    NULLIF(btrim(COALESCE(_search, '')), '') AS raw)
  SELECT btrim(pp.slug), btrim(pp.public_name), pp.logo_url, pp.city, pp.postal_code, pp.coverage_area,
         pp.description, pp.specialties, pp.specialty_tags, pp.avg_delay_days, pp.certifications
    FROM public.partner_profiles pp
    JOIN public.shops s ON s.id = pp.shop_id
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

DROP EXTENSION IF EXISTS unaccent;