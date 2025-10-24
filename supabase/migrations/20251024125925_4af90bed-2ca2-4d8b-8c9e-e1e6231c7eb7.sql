-- CONTINUER : Corriger les autres tables avec sous-requêtes coûteuses

-- ========================================
-- SAV_PARTS (double sous-requête imbriquée !)
-- ========================================
DROP POLICY IF EXISTS "Shop users can manage SAV parts" ON public.sav_parts;

CREATE POLICY "Shop users can manage SAV parts" ON public.sav_parts FOR ALL
USING (
  sav_case_id IN (
    SELECT id FROM public.sav_cases 
    WHERE shop_id = get_current_user_shop_id()
  )
  AND auth.uid() IS NOT NULL
);

-- ========================================
-- SHOPS
-- ========================================
DROP POLICY IF EXISTS "Shop users can view their shop" ON public.shops;

CREATE POLICY "Shop users can view their shop" ON public.shops FOR SELECT
USING (id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

-- ========================================
-- SAV_STATUS_HISTORY
-- ========================================
DROP POLICY IF EXISTS "Shop users can view SAV status history" ON public.sav_status_history;

CREATE POLICY "Shop users can view SAV status history" ON public.sav_status_history FOR ALL
USING (
  sav_case_id IN (
    SELECT id FROM public.sav_cases 
    WHERE shop_id = get_current_user_shop_id()
  )
  AND auth.uid() IS NOT NULL
);

-- ========================================
-- IMPORT_CONFIGURATIONS
-- ========================================
DROP POLICY IF EXISTS "Shop users can manage their import configurations" ON public.import_configurations;

CREATE POLICY "Shop users can manage their import configurations" ON public.import_configurations FOR ALL
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

-- ========================================
-- SHOP_SEO_CONFIG
-- ========================================
DROP POLICY IF EXISTS "Shop users can view their SEO config" ON public.shop_seo_config;
DROP POLICY IF EXISTS "Shop admins can manage their SEO config" ON public.shop_seo_config;

CREATE POLICY "Shop users can view their SEO config" ON public.shop_seo_config FOR SELECT
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop admins can manage their SEO config" ON public.shop_seo_config FOR ALL
USING (shop_id = get_current_user_shop_id() AND is_shop_admin() AND auth.uid() IS NOT NULL)
WITH CHECK (shop_id = get_current_user_shop_id() AND is_shop_admin() AND auth.uid() IS NOT NULL);

-- ========================================
-- SHOP_SERVICES
-- ========================================
DROP POLICY IF EXISTS "Shop users can manage their services" ON public.shop_services;

CREATE POLICY "Shop users can manage their services" ON public.shop_services FOR ALL
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

-- ========================================
-- SHOP_STATISTICS_CONFIG
-- ========================================
DROP POLICY IF EXISTS "Shop users can manage their statistics config" ON public.shop_statistics_config;

CREATE POLICY "Shop users can manage their statistics config" ON public.shop_statistics_config FOR ALL
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL)
WITH CHECK (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);