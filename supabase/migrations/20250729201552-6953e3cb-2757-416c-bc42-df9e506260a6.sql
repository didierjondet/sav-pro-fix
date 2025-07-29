-- Réactiver RLS et corriger les politiques pour la création de profils et magasins

-- Réactiver RLS sur les deux tables
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Pour shops: permettre aux utilisateurs authentifiés sans profil de créer leur premier magasin
DROP POLICY IF EXISTS "Temporary shop creation debug" ON public.shops;

CREATE POLICY "New authenticated users can create shop" 
ON public.shops 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- L'utilisateur peut créer un magasin s'il n'a pas encore de profil
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pour profiles: permettre la création de profils pour les nouveaux utilisateurs
-- et par les admins de boutique
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow super admin to create any profile" ON public.profiles;

CREATE POLICY "New users and admins can create profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- L'utilisateur peut créer son propre profil OU c'est un admin qui crée un profil pour sa boutique
  user_id = auth.uid() 
  OR 
  (
    shop_id IN (
      SELECT shop_id FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  OR
  is_super_admin()
);