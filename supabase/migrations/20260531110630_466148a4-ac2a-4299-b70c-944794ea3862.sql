-- Create private bucket for loaner condition photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('loaner-photos', 'loaner-photos', false, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies scoped strictly to bucket 'loaner-photos' (no impact on other buckets/public links)
DROP POLICY IF EXISTS "loaner_photos_select_own_shop" ON storage.objects;
DROP POLICY IF EXISTS "loaner_photos_insert_own_shop" ON storage.objects;
DROP POLICY IF EXISTS "loaner_photos_update_own_shop" ON storage.objects;
DROP POLICY IF EXISTS "loaner_photos_delete_own_shop" ON storage.objects;

CREATE POLICY "loaner_photos_select_own_shop" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'loaner-photos'
    AND (storage.foldername(name))[1] = public.get_current_user_shop_id()::text);

CREATE POLICY "loaner_photos_insert_own_shop" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'loaner-photos'
    AND (storage.foldername(name))[1] = public.get_current_user_shop_id()::text);

CREATE POLICY "loaner_photos_update_own_shop" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'loaner-photos'
    AND (storage.foldername(name))[1] = public.get_current_user_shop_id()::text);

CREATE POLICY "loaner_photos_delete_own_shop" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'loaner-photos'
    AND (storage.foldername(name))[1] = public.get_current_user_shop_id()::text);