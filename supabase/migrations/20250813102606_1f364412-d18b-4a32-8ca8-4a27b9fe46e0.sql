-- Fix customer data exposure vulnerability
-- Drop the problematic public read policy
DROP POLICY IF EXISTS "Public can view minimal customer data for tracking" ON public.customers;

-- Create a secure view for tracking that only exposes non-sensitive data
CREATE OR REPLACE VIEW public.customer_tracking_view AS
SELECT 
  c.id,
  c.first_name,
  CASE 
    WHEN c.email IS NOT NULL THEN 
      SUBSTRING(c.email FROM 1 FOR 2) || '***@' || 
      SUBSTRING(c.email FROM POSITION('@' IN c.email) + 1)
    ELSE NULL 
  END as masked_email,
  CASE 
    WHEN c.phone IS NOT NULL THEN 
      SUBSTRING(c.phone FROM 1 FOR 2) || '***' || 
      RIGHT(c.phone, 2)
    ELSE NULL 
  END as masked_phone
FROM public.customers c
WHERE EXISTS (
  SELECT 1 FROM public.sav_cases sc 
  WHERE sc.customer_id = c.id 
  AND sc.tracking_slug IS NOT NULL 
  AND sc.tracking_slug != ''
);

-- Grant access to the tracking view for public use
GRANT SELECT ON public.customer_tracking_view TO anon;
GRANT SELECT ON public.customer_tracking_view TO authenticated;

-- Enable RLS on the view (though it's not strictly necessary for views)
ALTER VIEW public.customer_tracking_view SET (security_invoker = true);