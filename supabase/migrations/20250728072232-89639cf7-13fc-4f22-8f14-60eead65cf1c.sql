-- Corriger les politiques RLS pour la table shops
-- Supprimer l'ancienne politique d'insertion pour les super admins
DROP POLICY IF EXISTS "Super admins can insert shops" ON public.shops;

-- Créer une nouvelle politique d'insertion simplifiée pour les super admins
CREATE POLICY "Super admins can insert shops" ON public.shops
FOR INSERT 
TO authenticated
WITH CHECK (is_super_admin());

-- Vérifier que la politique de mise à jour utilise aussi la fonction is_super_admin
DROP POLICY IF EXISTS "Super admins can update all shops" ON public.shops;

CREATE POLICY "Super admins can update all shops" ON public.shops
FOR UPDATE 
TO authenticated
USING (is_super_admin());

-- Vérifier que la politique de sélection utilise aussi la fonction is_super_admin  
DROP POLICY IF EXISTS "Super admins can view all shops" ON public.shops;

CREATE POLICY "Super admins can view all shops" ON public.shops
FOR SELECT 
TO authenticated
USING (is_super_admin());