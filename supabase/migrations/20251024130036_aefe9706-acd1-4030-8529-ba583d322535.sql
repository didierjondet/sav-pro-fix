-- DERNIÈRES OPTIMISATIONS : shop_sav_types et shop_sav_statuses

-- ========================================
-- SHOP_SAV_TYPES
-- ========================================
DROP POLICY IF EXISTS "Shop users can view only their shop SAV types" ON public.shop_sav_types;

CREATE POLICY "Shop users can view only their shop SAV types" ON public.shop_sav_types FOR SELECT
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

-- ========================================
-- SHOP_SAV_STATUSES
-- ========================================
DROP POLICY IF EXISTS "Shop users can view only their shop SAV statuses" ON public.shop_sav_statuses;

CREATE POLICY "Shop users can view only their shop SAV statuses" ON public.shop_sav_statuses FOR SELECT
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);