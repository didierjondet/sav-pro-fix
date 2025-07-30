-- Créer les politiques pour permettre aux utilisateurs de magasin d'uploader et gérer leurs logos

-- Politique pour permettre la visualisation des logos (public)
CREATE POLICY "Logos are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'shop-logos');

-- Politique pour permettre aux utilisateurs de magasin d'uploader leur logo
CREATE POLICY "Shop users can upload their logo" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'shop-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT shop_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Politique pour permettre aux utilisateurs de magasin de mettre à jour leur logo
CREATE POLICY "Shop users can update their logo" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'shop-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT shop_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Politique pour permettre aux utilisateurs de magasin de supprimer leur logo
CREATE POLICY "Shop users can delete their logo" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'shop-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT shop_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Politique pour les super admins
CREATE POLICY "Super admins can manage all logos" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'shop-logos' 
  AND is_super_admin()
);