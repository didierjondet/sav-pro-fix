-- Créer un bucket pour les logos des magasins
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-logos', 'shop-logos', true);

-- Ajouter une colonne logo_url dans la table shops
ALTER TABLE public.shops ADD COLUMN logo_url TEXT;

-- Créer des politiques pour le bucket shop-logos
CREATE POLICY "Shop logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'shop-logos');

CREATE POLICY "Shop admins can upload their logo" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'shop-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR is_super_admin()
  )
);

CREATE POLICY "Shop admins can update their logo" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'shop-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR is_super_admin()
  )
);

CREATE POLICY "Shop admins can delete their logo" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'shop-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR is_super_admin()
  )
);