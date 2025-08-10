-- Create storage bucket for part attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('part-attachments', 'part-attachments', false);

-- Create storage policies for part attachments
CREATE POLICY "Shop users can view their part attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'part-attachments' AND (storage.foldername(name))[1] IN (
  SELECT s.id::text 
  FROM shops s 
  JOIN profiles p ON p.shop_id = s.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Shop users can upload part attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'part-attachments' AND (storage.foldername(name))[1] IN (
  SELECT s.id::text 
  FROM shops s 
  JOIN profiles p ON p.shop_id = s.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Shop users can delete their part attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'part-attachments' AND (storage.foldername(name))[1] IN (
  SELECT s.id::text 
  FROM shops s 
  JOIN profiles p ON p.shop_id = s.id 
  WHERE p.user_id = auth.uid()
));

-- Add attachments column to sav_parts table
ALTER TABLE sav_parts ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;

-- Add attachments column to quotes items (stored as jsonb in items field)
-- No schema change needed as quotes.items is already jsonb