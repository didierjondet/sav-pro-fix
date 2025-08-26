-- Fix the storage calculation function to properly handle shop file paths
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
  -- Calculate total size from storage buckets using shop_id prefix
  -- All files are stored with shop_id as prefix: shop_id/filename
  
  -- Shop logos: shop_id/logo.png
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO bucket_size
  FROM storage.objects
  WHERE bucket_id = 'shop-logos' 
  AND name LIKE p_shop_id::text || '/%'
  AND metadata ? 'size';
  
  total_size := total_size + bucket_size;
  
  -- Part photos: shop_id/part_*
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO bucket_size
  FROM storage.objects
  WHERE bucket_id = 'part-photos'
  AND name LIKE p_shop_id::text || '/%'
  AND metadata ? 'size';
  
  total_size := total_size + bucket_size;
  
  -- Part attachments: shop_id/*
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO bucket_size
  FROM storage.objects
  WHERE bucket_id = 'part-attachments'
  AND name LIKE p_shop_id::text || '/%'
  AND metadata ? 'size';
  
  total_size := total_size + bucket_size;
  
  -- SAV attachments: shop_id/*
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO bucket_size
  FROM storage.objects
  WHERE bucket_id = 'sav-attachments'
  AND name LIKE p_shop_id::text || '/%'
  AND metadata ? 'size';
  
  total_size := total_size + bucket_size;
  
  RETURN total_size;
END;
$$;