-- Fix the storage calculation function to properly handle text to bigint conversion
CREATE OR REPLACE FUNCTION public.calculate_shop_storage_usage(p_shop_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_size bigint := 0;
  bucket_size bigint;
BEGIN
  -- Calculate total size from storage buckets
  -- Shop logos
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO bucket_size
  FROM storage.objects
  WHERE bucket_id = 'shop-logos' 
  AND name LIKE p_shop_id::text || '/%'
  AND metadata ? 'size';
  
  total_size := total_size + bucket_size;
  
  -- Part photos
  SELECT COALESCE(SUM((so.metadata->>'size')::bigint), 0) INTO bucket_size
  FROM storage.objects so
  JOIN parts p ON so.name LIKE '%' || p.id::text || '%'
  WHERE so.bucket_id = 'part-photos'
  AND p.shop_id = p_shop_id
  AND so.metadata ? 'size';
  
  total_size := total_size + bucket_size;
  
  -- Part attachments  
  SELECT COALESCE(SUM((so.metadata->>'size')::bigint), 0) INTO bucket_size
  FROM storage.objects so
  JOIN parts p ON so.name LIKE '%' || p.id::text || '%'
  WHERE so.bucket_id = 'part-attachments'
  AND p.shop_id = p_shop_id
  AND so.metadata ? 'size';
  
  total_size := total_size + bucket_size;
  
  -- SAV attachments
  SELECT COALESCE(SUM((so.metadata->>'size')::bigint), 0) INTO bucket_size
  FROM storage.objects so
  JOIN sav_cases sc ON so.name LIKE '%' || sc.id::text || '%'
  WHERE so.bucket_id = 'sav-attachments'
  AND sc.shop_id = p_shop_id
  AND so.metadata ? 'size';
  
  total_size := total_size + bucket_size;
  
  RETURN total_size;
END;
$$;