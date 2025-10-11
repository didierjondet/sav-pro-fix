-- Supprimer toutes les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Shop users can view their SAV attachments" ON storage.objects;
DROP POLICY IF EXISTS "Shop users can upload SAV attachments" ON storage.objects;
DROP POLICY IF EXISTS "Shop users can delete their SAV attachments" ON storage.objects;
DROP POLICY IF EXISTS "Shop users can update their SAV attachments" ON storage.objects;

-- Politique pour lire les fichiers SAV du shop
CREATE POLICY "Shop users can view their SAV attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'sav-attachments' 
  AND (storage.foldername(name))[1] IN (
    SELECT shop_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Politique pour uploader des fichiers SAV
CREATE POLICY "Shop users can upload SAV attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sav-attachments' 
  AND (storage.foldername(name))[1] IN (
    SELECT shop_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Politique pour supprimer des fichiers SAV
CREATE POLICY "Shop users can delete their SAV attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'sav-attachments' 
  AND (storage.foldername(name))[1] IN (
    SELECT shop_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Politique pour mettre à jour les métadonnées
CREATE POLICY "Shop users can update their SAV attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sav-attachments' 
  AND (storage.foldername(name))[1] IN (
    SELECT shop_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);