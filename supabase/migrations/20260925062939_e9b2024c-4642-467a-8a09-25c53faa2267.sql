REVOKE EXECUTE ON FUNCTION public.get_my_buyback_account() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.update_my_buyback_profile(text, text, text, text, boolean) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.delete_my_buyback_account() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_my_buyback_request(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_my_buyback_request(uuid) TO authenticated;