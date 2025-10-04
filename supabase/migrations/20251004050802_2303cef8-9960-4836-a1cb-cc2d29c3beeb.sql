-- ============================================
-- CORRECTION DES FAILLES DE SÉCURITÉ RLS
-- ============================================
-- Ajout de politiques DENY explicites pour bloquer
-- tout accès non autorisé aux données sensibles

-- ============================================
-- 1. PROTECTION TABLE CUSTOMERS
-- ============================================
-- Bloquer TOUT accès si l'utilisateur n'est pas authentifié
CREATE POLICY "DENY: Block all unauthenticated access to customers"
ON public.customers
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Bloquer l'accès si le shop_id ne correspond pas
CREATE POLICY "DENY: Block access to customers from other shops"
ON public.customers
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  shop_id = get_current_user_shop_id() 
  OR is_super_admin()
);

-- ============================================
-- 2. PROTECTION TABLE PROFILES
-- ============================================
-- Bloquer TOUT accès si l'utilisateur n'est pas authentifié
CREATE POLICY "DENY: Block all unauthenticated access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Bloquer l'accès si le shop_id ne correspond pas (sauf super_admin)
CREATE POLICY "DENY: Block access to profiles from other shops"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  shop_id = get_current_user_shop_id() 
  OR user_id = auth.uid()
  OR is_super_admin()
);

-- ============================================
-- 3. PROTECTION TABLE SMS_HISTORY
-- ============================================
-- Bloquer TOUT accès si l'utilisateur n'est pas authentifié
CREATE POLICY "DENY: Block all unauthenticated access to sms_history"
ON public.sms_history
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Bloquer l'accès si le shop_id ne correspond pas
CREATE POLICY "DENY: Block access to sms_history from other shops"
ON public.sms_history
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  shop_id = get_current_user_shop_id() 
  OR is_super_admin()
);

-- ============================================
-- COMMENTAIRES EXPLICATIFS
-- ============================================
-- Les politiques RESTRICTIVE (DENY) fonctionnent comme des AND
-- Toutes les conditions RESTRICTIVE ET PERMISSIVE doivent être vraies
-- Cela crée une défense en profondeur :
-- 1. Les politiques PERMISSIVE (existantes) définissent qui PEUT accéder
-- 2. Les politiques RESTRICTIVE (nouvelles) définissent qui NE PEUT PAS accéder
-- 
-- Résultat : même si une politique PERMISSIVE a un bug,
-- les politiques RESTRICTIVE bloquent l'accès non autorisé