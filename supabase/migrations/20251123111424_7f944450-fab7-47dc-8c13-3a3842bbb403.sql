-- Politique : Permettre l'upload pour les utilisateurs authentifiés dans leur shop
CREATE POLICY "Users can upload assets to their shop folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT shop_id::text
    FROM profiles
    WHERE user_id = auth.uid()
  )
);

-- Politique : Lecture publique (nécessaire pour jouer les sons et afficher les logos)
CREATE POLICY "Anyone can read shop assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shop-assets');

-- Politique : Les utilisateurs peuvent mettre à jour leurs propres assets
CREATE POLICY "Users can update their shop assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT shop_id::text
    FROM profiles
    WHERE user_id = auth.uid()
  )
);

-- Politique : Les utilisateurs peuvent supprimer leurs propres assets
CREATE POLICY "Users can delete their shop assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT shop_id::text
    FROM profiles
    WHERE user_id = auth.uid()
  )
);