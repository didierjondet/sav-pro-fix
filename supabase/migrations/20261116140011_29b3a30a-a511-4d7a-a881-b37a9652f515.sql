CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE OR REPLACE FUNCTION public.normalize_shop_name(_name text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$
  SELECT regexp_replace(lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(_name,''))), '\s+', ' ', 'g') $$;
CREATE OR REPLACE FUNCTION public.shop_name_key(_name text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$ SELECT btrim(public.normalize_shop_name(_name)) $$;
CREATE UNIQUE INDEX IF NOT EXISTS shops_unique_normalized_name ON public.shops (public.shop_name_key(name))
  WHERE public.shop_name_key(name) <> 'mon magasin' AND public.shop_name_key(name) <> '';
CREATE OR REPLACE FUNCTION public.is_shop_name_available(_name text, _exclude_shop_id uuid DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.shop_name_key(_name) = 'mon magasin' OR NOT EXISTS (
    SELECT 1 FROM public.shops WHERE public.shop_name_key(name) = public.shop_name_key(_name)
    AND (_exclude_shop_id IS NULL OR id <> _exclude_shop_id)) $$;
GRANT EXECUTE ON FUNCTION public.is_shop_name_available(text, uuid) TO authenticated;