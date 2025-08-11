-- Créer un bucket pour les photos de pièces
INSERT INTO storage.buckets (id, name, public) 
VALUES ('part-photos', 'part-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Créer les politiques pour les photos de pièces
CREATE POLICY "Shop users can view their part photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'part-photos' 
  AND (storage.foldername(name))[1] IN (
    SELECT profiles.shop_id::text
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Shop users can upload their part photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'part-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT profiles.shop_id::text
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Shop users can delete their part photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'part-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT profiles.shop_id::text
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
);