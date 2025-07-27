-- Reset all parts quantities to zero for the current user's shop
UPDATE public.parts 
SET quantity = 0, updated_at = now()
WHERE shop_id = get_current_user_shop_id();