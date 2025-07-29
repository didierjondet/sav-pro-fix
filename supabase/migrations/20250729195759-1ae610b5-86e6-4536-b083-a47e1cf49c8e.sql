-- Corriger le problème RLS - l'utilisateur ne peut pas créer de magasin car il n'a pas encore de profil
-- Il faut une politique spécifique pour les nouveaux utilisateurs

-- D'abord, vérifier l'état actuel des politiques
-- Supprimer la politique existante qui ne fonctionne pas
DROP POLICY IF EXISTS "Allow first shop creation" ON public.shops;

-- Créer une politique plus spécifique pour les utilisateurs qui n'ont pas encore de profil
CREATE POLICY "New users can create first shop" 
ON public.shops 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- L'utilisateur doit être authentifié ET ne pas avoir encore de profil
  auth.uid() IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);