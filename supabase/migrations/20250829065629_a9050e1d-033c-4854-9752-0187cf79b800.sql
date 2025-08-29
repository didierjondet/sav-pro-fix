-- Sécuriser la table customers avec des politiques DENY explicites pour les utilisateurs non authentifiés
-- Ces politiques n'affecteront pas les fonctions get_tracking_info et get_tracking_messages 
-- car elles sont SECURITY DEFINER et contournent les politiques RLS

-- Politique DENY explicite pour les accès non authentifiés
CREATE POLICY "Deny all access to unauthenticated users" 
ON public.customers 
FOR ALL 
TO anon, public
USING (false)
WITH CHECK (false);

-- Politique DENY pour les utilisateurs authentifiés sans shop_id valide
CREATE POLICY "Deny access to users without valid shop access" 
ON public.customers 
FOR ALL 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND get_current_user_shop_id() IS NOT NULL 
  AND shop_id = get_current_user_shop_id()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND get_current_user_shop_id() IS NOT NULL 
  AND shop_id = get_current_user_shop_id()
);