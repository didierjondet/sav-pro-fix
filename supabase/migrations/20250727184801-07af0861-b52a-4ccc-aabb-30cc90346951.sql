-- Delete all parts for the current user's shop
DELETE FROM public.parts 
WHERE shop_id = get_current_user_shop_id();