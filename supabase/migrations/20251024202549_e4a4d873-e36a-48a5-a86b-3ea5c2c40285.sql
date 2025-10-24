-- Fix RLS performance issues by wrapping auth.uid() in SELECT
-- This prevents re-evaluation for each row and significantly improves query performance

-- ===== CUSTOMERS TABLE =====
DROP POLICY IF EXISTS "Shop users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Shop users can insert customers for their shop" ON public.customers;
DROP POLICY IF EXISTS "Shop users can update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Shop users can delete their own customers" ON public.customers;
DROP POLICY IF EXISTS "Block unauthenticated access to customers" ON public.customers;
DROP POLICY IF EXISTS "Deny access to users without valid shop access" ON public.customers;
DROP POLICY IF EXISTS "DENY: Block all unauthenticated access to customers" ON public.customers;

CREATE POLICY "Shop users can view their own customers" 
ON public.customers FOR SELECT 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop users can insert customers for their shop" 
ON public.customers FOR INSERT 
WITH CHECK ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop users can update their own customers" 
ON public.customers FOR UPDATE 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop users can delete their own customers" 
ON public.customers FOR DELETE 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Deny access to users without valid shop access" 
ON public.customers FOR ALL 
USING ((select auth.uid()) IS NOT NULL AND get_current_user_shop_id() IS NOT NULL AND shop_id = get_current_user_shop_id())
WITH CHECK ((select auth.uid()) IS NOT NULL AND get_current_user_shop_id() IS NOT NULL AND shop_id = get_current_user_shop_id());

-- ===== PARTS TABLE =====
DROP POLICY IF EXISTS "Shop users can manage parts" ON public.parts;

CREATE POLICY "Shop users can manage parts" 
ON public.parts FOR ALL 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

-- ===== PROFILES TABLE =====
DROP POLICY IF EXISTS "Shop users can view profiles in their shop only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "DENY: Block all unauthenticated access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "DENY: Block access to profiles from other shops" ON public.profiles;
DROP POLICY IF EXISTS "Shop admins can delete profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Shop admins can update profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Shop admins can update their shop profiles" ON public.profiles;
DROP POLICY IF EXISTS "New users and admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Shop admins can insert profiles" ON public.profiles;

CREATE POLICY "Shop users can view profiles in their shop only" 
ON public.profiles FOR SELECT 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (user_id = (select auth.uid()));

CREATE POLICY "DENY: Block all unauthenticated access to profiles" 
ON public.profiles FOR ALL 
USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "DENY: Block access to profiles from other shops" 
ON public.profiles FOR ALL 
USING ((shop_id = get_current_user_shop_id()) OR (user_id = (select auth.uid())) OR is_super_admin());

CREATE POLICY "Shop admins can delete profiles in their shop" 
ON public.profiles FOR DELETE 
USING ((shop_id = get_current_user_shop_id()) AND is_shop_admin() AND (user_id <> (select auth.uid())));

CREATE POLICY "Shop admins can update profiles in their shop" 
ON public.profiles FOR UPDATE 
USING ((shop_id = get_current_user_shop_id()) AND is_shop_admin());

CREATE POLICY "Shop admins can insert profiles" 
ON public.profiles FOR INSERT 
WITH CHECK ((shop_id = get_current_user_shop_id()) AND is_shop_admin());

CREATE POLICY "New users and admins can create profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (
  (user_id = (select auth.uid())) OR 
  (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = (select auth.uid()) AND role = 'admin'::user_role)) OR 
  is_super_admin()
);

-- ===== SHOPS TABLE =====
DROP POLICY IF EXISTS "Shop users can view their shop" ON public.shops;
DROP POLICY IF EXISTS "Shop admins can update their shop" ON public.shops;
DROP POLICY IF EXISTS "New authenticated users can create shop" ON public.shops;

CREATE POLICY "Shop users can view their shop" 
ON public.shops FOR SELECT 
USING ((id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop admins can update their shop" 
ON public.shops FOR UPDATE 
USING (id IN (SELECT shop_id FROM profiles WHERE user_id = (select auth.uid()) AND role = 'admin'::user_role));

CREATE POLICY "New authenticated users can create shop" 
ON public.shops FOR INSERT 
WITH CHECK (NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = (select auth.uid())));

-- ===== NOTIFICATIONS TABLE =====
DROP POLICY IF EXISTS "Shop users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Shop users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Shop users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Shop users can delete their notifications" ON public.notifications;

CREATE POLICY "Shop users can view their notifications" 
ON public.notifications FOR SELECT 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop users can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop users can update their notifications" 
ON public.notifications FOR UPDATE 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop users can delete their notifications" 
ON public.notifications FOR DELETE 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

-- ===== QUOTES TABLE =====
DROP POLICY IF EXISTS "Shop users can view their shop quotes only" ON public.quotes;
DROP POLICY IF EXISTS "Shop users can insert quotes for their shop only" ON public.quotes;
DROP POLICY IF EXISTS "Shop users can update their shop quotes only" ON public.quotes;
DROP POLICY IF EXISTS "Shop users can delete their shop quotes only" ON public.quotes;

CREATE POLICY "Shop users can view their shop quotes only" 
ON public.quotes FOR SELECT 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop users can insert quotes for their shop only" 
ON public.quotes FOR INSERT 
WITH CHECK ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop users can update their shop quotes only" 
ON public.quotes FOR UPDATE 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop users can delete their shop quotes only" 
ON public.quotes FOR DELETE 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

-- ===== SMS HISTORY TABLE =====
DROP POLICY IF EXISTS "Shop users can view their SMS history only" ON public.sms_history;
DROP POLICY IF EXISTS "Shop users can insert SMS history for their shop only" ON public.sms_history;
DROP POLICY IF EXISTS "DENY: Block all unauthenticated access to sms_history" ON public.sms_history;

CREATE POLICY "Shop users can view their SMS history only" 
ON public.sms_history FOR SELECT 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop users can insert SMS history for their shop only" 
ON public.sms_history FOR INSERT 
WITH CHECK ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "DENY: Block all unauthenticated access to sms_history" 
ON public.sms_history FOR ALL 
USING ((select auth.uid()) IS NOT NULL);

-- ===== SAV MESSAGES TABLE =====
DROP POLICY IF EXISTS "Unified view messages policy" ON public.sav_messages;
DROP POLICY IF EXISTS "Unified update messages policy" ON public.sav_messages;
DROP POLICY IF EXISTS "Unified delete messages policy" ON public.sav_messages;
DROP POLICY IF EXISTS "Clients can insert messages via tracking" ON public.sav_messages;
DROP POLICY IF EXISTS "Shop users can insert SAV messages" ON public.sav_messages;

CREATE POLICY "Unified view messages policy" 
ON public.sav_messages FOR SELECT 
USING (
  (((select auth.uid()) IS NOT NULL) AND (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = (select auth.uid())))) OR 
  (((select auth.uid()) IS NULL) AND (sav_case_id IN (SELECT id FROM sav_cases WHERE tracking_slug IS NOT NULL AND tracking_slug <> '')))
);

CREATE POLICY "Unified update messages policy" 
ON public.sav_messages FOR UPDATE 
USING (
  (((select auth.uid()) IS NOT NULL) AND (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = (select auth.uid())))) OR 
  (((select auth.uid()) IS NULL) AND (sav_case_id IN (SELECT id FROM sav_cases WHERE tracking_slug IS NOT NULL AND tracking_slug <> '')))
);

CREATE POLICY "Unified delete messages policy" 
ON public.sav_messages FOR DELETE 
USING (
  (created_at > (now() - interval '1 minute')) AND 
  (
    ((sender_type = 'shop') AND ((select auth.uid()) IS NOT NULL) AND (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = (select auth.uid())))) OR 
    ((sender_type = 'client') AND ((select auth.uid()) IS NULL) AND (sav_case_id IN (SELECT id FROM sav_cases WHERE tracking_slug IS NOT NULL AND tracking_slug <> '')))
  )
);

CREATE POLICY "Shop users can insert SAV messages" 
ON public.sav_messages FOR INSERT 
WITH CHECK ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Clients can insert messages via tracking" 
ON public.sav_messages FOR INSERT 
WITH CHECK (
  (sender_type = 'client') AND 
  ((select auth.uid()) IS NULL) AND 
  (sav_case_id IN (SELECT id FROM sav_cases WHERE tracking_slug IS NOT NULL AND tracking_slug <> ''))
);

-- ===== SHOP SAV TYPES TABLE =====
DROP POLICY IF EXISTS "Shop users can view only their shop SAV types" ON public.shop_sav_types;
DROP POLICY IF EXISTS "Shop admins can create SAV types for their shop" ON public.shop_sav_types;
DROP POLICY IF EXISTS "Shop admins can update their shop SAV types" ON public.shop_sav_types;
DROP POLICY IF EXISTS "Shop admins can delete their shop SAV types" ON public.shop_sav_types;

CREATE POLICY "Shop users can view only their shop SAV types" 
ON public.shop_sav_types FOR SELECT 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop admins can create SAV types for their shop" 
ON public.shop_sav_types FOR INSERT 
WITH CHECK ((shop_id = get_current_user_shop_id()) AND is_shop_admin() AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop admins can update their shop SAV types" 
ON public.shop_sav_types FOR UPDATE 
USING ((shop_id = get_current_user_shop_id()) AND is_shop_admin() AND ((select auth.uid()) IS NOT NULL))
WITH CHECK ((shop_id = get_current_user_shop_id()) AND is_shop_admin() AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop admins can delete their shop SAV types" 
ON public.shop_sav_types FOR DELETE 
USING ((shop_id = get_current_user_shop_id()) AND is_shop_admin() AND ((select auth.uid()) IS NOT NULL));

-- ===== SHOP SAV STATUSES TABLE =====
DROP POLICY IF EXISTS "Shop users can view only their shop SAV statuses" ON public.shop_sav_statuses;
DROP POLICY IF EXISTS "Shop admins can create SAV statuses for their shop" ON public.shop_sav_statuses;
DROP POLICY IF EXISTS "Shop admins can update their shop SAV statuses" ON public.shop_sav_statuses;
DROP POLICY IF EXISTS "Shop admins can delete their shop SAV statuses" ON public.shop_sav_statuses;

CREATE POLICY "Shop users can view only their shop SAV statuses" 
ON public.shop_sav_statuses FOR SELECT 
USING ((shop_id = get_current_user_shop_id()) AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop admins can create SAV statuses for their shop" 
ON public.shop_sav_statuses FOR INSERT 
WITH CHECK ((shop_id = get_current_user_shop_id()) AND is_shop_admin() AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop admins can update their shop SAV statuses" 
ON public.shop_sav_statuses FOR UPDATE 
USING ((shop_id = get_current_user_shop_id()) AND is_shop_admin() AND ((select auth.uid()) IS NOT NULL))
WITH CHECK ((shop_id = get_current_user_shop_id()) AND is_shop_admin() AND ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Shop admins can delete their shop SAV statuses" 
ON public.shop_sav_statuses FOR DELETE 
USING ((shop_id = get_current_user_shop_id()) AND is_shop_admin() AND ((select auth.uid()) IS NOT NULL));