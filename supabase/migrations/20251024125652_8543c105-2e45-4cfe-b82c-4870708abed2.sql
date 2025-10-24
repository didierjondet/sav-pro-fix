-- CORRECTION MASSIVE : Remplacer TOUTES les sous-requêtes par get_current_user_shop_id()
-- C'est ça qui cause l'utilisation CPU à 80%+ !

-- ========================================
-- CUSTOMERS
-- ========================================
DROP POLICY IF EXISTS "Shop users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Shop users can insert customers for their shop" ON public.customers;
DROP POLICY IF EXISTS "Shop users can update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Shop users can delete their own customers" ON public.customers;

CREATE POLICY "Shop users can view their own customers" ON public.customers FOR SELECT
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can insert customers for their shop" ON public.customers FOR INSERT
WITH CHECK (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can update their own customers" ON public.customers FOR UPDATE
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can delete their own customers" ON public.customers FOR DELETE
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

-- ========================================
-- SAV_CASES
-- ========================================
DROP POLICY IF EXISTS "Shop users can view SAV cases" ON public.sav_cases;
DROP POLICY IF EXISTS "Shop users can insert SAV cases" ON public.sav_cases;
DROP POLICY IF EXISTS "Shop users can update SAV cases" ON public.sav_cases;
DROP POLICY IF EXISTS "Shop users can delete SAV cases" ON public.sav_cases;

CREATE POLICY "Shop users can view SAV cases" ON public.sav_cases FOR SELECT
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can insert SAV cases" ON public.sav_cases FOR INSERT
WITH CHECK (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can update SAV cases" ON public.sav_cases FOR UPDATE
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can delete SAV cases" ON public.sav_cases FOR DELETE
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

-- ========================================
-- PARTS
-- ========================================
DROP POLICY IF EXISTS "Shop users can manage parts" ON public.parts;

CREATE POLICY "Shop users can manage parts" ON public.parts FOR ALL
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

-- ========================================
-- ORDER_ITEMS
-- ========================================
DROP POLICY IF EXISTS "Shop users can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Shop users can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Shop users can update their order items" ON public.order_items;
DROP POLICY IF EXISTS "Shop users can delete their order items" ON public.order_items;

CREATE POLICY "Shop users can view their order items" ON public.order_items FOR SELECT
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can insert order items" ON public.order_items FOR INSERT
WITH CHECK (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can update their order items" ON public.order_items FOR UPDATE
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can delete their order items" ON public.order_items FOR DELETE
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

-- ========================================
-- SAV_MESSAGES
-- ========================================
DROP POLICY IF EXISTS "Shop users can insert SAV messages" ON public.sav_messages;

CREATE POLICY "Shop users can insert SAV messages" ON public.sav_messages FOR INSERT
WITH CHECK (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);