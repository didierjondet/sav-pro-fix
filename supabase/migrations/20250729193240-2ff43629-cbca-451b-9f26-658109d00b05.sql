-- Permettre aux utilisateurs authentifiés de créer leur premier magasin
-- lors de la configuration de leur profil

-- Supprimer l'ancienne politique restrictive pour l'insertion
DROP POLICY IF EXISTS "Super admins can insert shops" ON public.shops;

-- Créer une nouvelle politique qui permet aux utilisateurs authentifiés 
-- de créer un magasin s'ils n'en ont pas encore
CREATE POLICY "Users can create their first shop" 
ON public.shops 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Soit l'utilisateur est super admin
  is_super_admin() 
  OR 
  -- Soit il n'a pas encore de profil avec un shop_id (donc premier magasin)
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND shop_id IS NOT NULL
  )
);