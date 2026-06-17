
-- Phase 1.A : subscribers UPDATE scopé
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
CREATE POLICY "update_own_subscription"
ON public.subscribers
FOR UPDATE
TO public
USING (user_id = auth.uid() OR email = auth.email())
WITH CHECK (user_id = auth.uid() OR email = auth.email());

-- Phase 1.B : storage sav-attachments — retirer les policies trop larges
-- Les policies folder-scopées (Shop users can upload/delete their SAV attachments) couvrent déjà l'usage.
DROP POLICY IF EXISTS "Users can upload sav attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own sav attachments" ON storage.objects;
