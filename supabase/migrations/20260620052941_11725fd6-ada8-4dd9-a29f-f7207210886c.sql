-- Étape 5: Figer search_path sur les fonctions publiques sans paramètre search_path défini.
-- Purement additive. Rollback (à exécuter dans SQL editor si besoin) :
--   ALTER FUNCTION public.copy_default_role_permissions() RESET search_path;
--   ALTER FUNCTION public.get_parts_statistics(uuid) RESET search_path;
--   ALTER FUNCTION public.mark_quote_completed_on_sav_delivery() RESET search_path;
--   ALTER FUNCTION public.update_carousel_items_updated_at() RESET search_path;
--   ALTER FUNCTION public.update_shop_role_permissions_updated_at() RESET search_path;
--   ALTER FUNCTION public.update_updated_at_column() RESET search_path;

ALTER FUNCTION public.copy_default_role_permissions() SET search_path = public;
ALTER FUNCTION public.get_parts_statistics(uuid) SET search_path = public;
ALTER FUNCTION public.mark_quote_completed_on_sav_delivery() SET search_path = public;
ALTER FUNCTION public.update_carousel_items_updated_at() SET search_path = public;
ALTER FUNCTION public.update_shop_role_permissions_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;