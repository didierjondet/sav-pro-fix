-- Vérifier et corriger les politiques RLS pour le bucket sav-attachments

-- Supprimer les anciennes politiques s'il y en a
DROP POLICY IF EXISTS "Shop users can view their SAV attachments" ON storage.objects;
DROP POLICY IF EXISTS "Shop users can upload SAV attachments" ON storage.objects;
DROP POLICY IF EXISTS "Shop users can update their SAV attachments" ON storage.objects;
DROP POLICY IF EXISTS "Shop users can delete their SAV attachments" ON storage.objects;

-- Créer des politiques RLS pour permettre l'accès aux pièces jointes SAV
CREATE POLICY "Shop users can view their SAV attachments" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'sav-attachments' 
  AND EXISTS (
    SELECT 1 FROM public.sav_cases 
    WHERE sav_cases.id::text = (string_to_array(name, '/'))[1]
    AND sav_cases.shop_id IN (
      SELECT profiles.shop_id 
      FROM public.profiles 
      WHERE profiles.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Shop users can upload SAV attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'sav-attachments'
  AND EXISTS (
    SELECT 1 FROM public.sav_cases 
    WHERE sav_cases.id::text = (string_to_array(name, '/'))[1]
    AND sav_cases.shop_id IN (
      SELECT profiles.shop_id 
      FROM public.profiles 
      WHERE profiles.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Shop users can update their SAV attachments" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'sav-attachments'
  AND EXISTS (
    SELECT 1 FROM public.sav_cases 
    WHERE sav_cases.id::text = (string_to_array(name, '/'))[1]
    AND sav_cases.shop_id IN (
      SELECT profiles.shop_id 
      FROM public.profiles 
      WHERE profiles.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Shop users can delete their SAV attachments" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'sav-attachments'
  AND EXISTS (
    SELECT 1 FROM public.sav_cases 
    WHERE sav_cases.id::text = (string_to_array(name, '/'))[1]
    AND sav_cases.shop_id IN (
      SELECT profiles.shop_id 
      FROM public.profiles 
      WHERE profiles.user_id = auth.uid()
    )
  )
);