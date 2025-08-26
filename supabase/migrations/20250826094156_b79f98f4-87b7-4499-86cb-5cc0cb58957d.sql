-- Function to calculate total storage usage per shop
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
  SELECT COALESCE(SUM(metadata->>'size')::bigint, 0) INTO bucket_size
  FROM storage.objects
  WHERE bucket_id = 'shop-logos' 
  AND name LIKE p_shop_id::text || '/%';
  
  total_size := total_size + bucket_size;
  
  -- Part photos
  SELECT COALESCE(SUM(metadata->>'size')::bigint, 0) INTO bucket_size
  FROM storage.objects so
  JOIN parts p ON so.name LIKE '%' || p.id::text || '%'
  WHERE so.bucket_id = 'part-photos'
  AND p.shop_id = p_shop_id;
  
  total_size := total_size + bucket_size;
  
  -- Part attachments  
  SELECT COALESCE(SUM(metadata->>'size')::bigint, 0) INTO bucket_size
  FROM storage.objects so
  JOIN parts p ON so.name LIKE '%' || p.id::text || '%'
  WHERE so.bucket_id = 'part-attachments'
  AND p.shop_id = p_shop_id;
  
  total_size := total_size + bucket_size;
  
  -- SAV attachments
  SELECT COALESCE(SUM(metadata->>'size')::bigint, 0) INTO bucket_size
  FROM storage.objects so
  JOIN sav_cases sc ON so.name LIKE '%' || sc.id::text || '%'
  WHERE so.bucket_id = 'sav-attachments'
  AND sc.shop_id = p_shop_id;
  
  total_size := total_size + bucket_size;
  
  RETURN total_size;
END;
$$;

-- Function to get storage usage for all shops (super admin only)
CREATE OR REPLACE FUNCTION public.get_all_shops_storage_usage()
RETURNS TABLE(shop_id uuid, shop_name text, storage_bytes bigint, storage_gb numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: only super admins can view all shops storage usage';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    calculate_shop_storage_usage(s.id),
    ROUND(calculate_shop_storage_usage(s.id)::numeric / (1024*1024*1024), 3)
  FROM shops s
  ORDER BY calculate_shop_storage_usage(s.id) DESC;
END;
$$;