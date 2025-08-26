-- Créer le bucket pour les pièces jointes des messages SAV s'il n'existe pas déjà
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sav-attachments', 'sav-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Créer les politiques RLS pour les pièces jointes des messages SAV
-- Permettre aux utilisateurs authentifiés de voir les pièces jointes de leur magasin
CREATE POLICY "Users can view sav attachments from their shop" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'sav-attachments' 
  AND auth.uid() IN (
    SELECT user_id FROM profiles WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

-- Permettre aux utilisateurs authentifiés d'uploader des pièces jointes
CREATE POLICY "Users can upload sav attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'sav-attachments' 
  AND auth.uid() IS NOT NULL
);

-- Permettre aux utilisateurs de supprimer leurs propres pièces jointes
CREATE POLICY "Users can delete their own sav attachments" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'sav-attachments' 
  AND auth.uid() IS NOT NULL
);