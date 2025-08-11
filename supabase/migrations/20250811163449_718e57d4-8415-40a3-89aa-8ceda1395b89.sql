-- Ajouter une colonne attachments pour les dossiers SAV
ALTER TABLE sav_cases 
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;

-- Créer un bucket pour les attachments SAV si nécessaire
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sav-attachments', 'sav-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Créer les politiques pour les attachments SAV
CREATE POLICY "Shop users can view their SAV attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'sav-attachments' 
  AND (storage.foldername(name))[1] IN (
    SELECT sav_cases.id::text
    FROM sav_cases
    WHERE sav_cases.shop_id IN (
      SELECT profiles.shop_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Shop users can upload their SAV attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'sav-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT sav_cases.id::text
    FROM sav_cases
    WHERE sav_cases.shop_id IN (
      SELECT profiles.shop_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Shop users can delete their SAV attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'sav-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT sav_cases.id::text
    FROM sav_cases
    WHERE sav_cases.shop_id IN (
      SELECT profiles.shop_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
  )
);