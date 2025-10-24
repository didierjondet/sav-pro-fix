-- Create function to get parts statistics for a shop
CREATE OR REPLACE FUNCTION get_parts_statistics(p_shop_id uuid)
RETURNS TABLE (
  total_quantity bigint,
  total_value numeric,
  low_stock_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(quantity), 0)::bigint as total_quantity,
    COALESCE(SUM(quantity * COALESCE(purchase_price, 0)), 0) as total_value,
    COUNT(CASE WHEN quantity <= min_stock THEN 1 END)::bigint as low_stock_count
  FROM parts
  WHERE shop_id = p_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;