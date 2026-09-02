REVOKE EXECUTE ON FUNCTION public.close_buyback_round(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_network_buyback_requests() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.submit_network_buyback_offer(uuid, numeric, text, text, numeric, numeric, numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_network_buyback_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_network_buyback_offer(uuid, numeric, text, text, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_buyback_round(uuid) TO service_role;