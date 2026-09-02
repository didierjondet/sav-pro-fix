CREATE POLICY "Public can upload buyback media"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'buyback-media');

CREATE POLICY "Pros can read buyback media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'buyback-media');