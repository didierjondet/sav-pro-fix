REVOKE EXECUTE ON FUNCTION public.is_shop_name_available(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_shop_name_available(text, uuid) TO authenticated;