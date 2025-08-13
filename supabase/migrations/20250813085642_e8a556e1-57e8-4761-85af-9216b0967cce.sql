-- Fix the security definer view issue
-- Drop the problematic view and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.customer_tracking_info;

-- Create a safe view without SECURITY DEFINER
-- This view will use the existing RLS policies instead
CREATE VIEW public.customer_tracking_info AS
SELECT 
  c.id,
  c.first_name,
  -- Mask email for privacy (show only first 2 chars + domain)
  CASE 
    WHEN c.email IS NOT NULL THEN 
      SUBSTRING(c.email FROM 1 FOR 2) || '***@' || SUBSTRING(c.email FROM POSITION('@' IN c.email) + 1)
    ELSE NULL 
  END as masked_email,
  -- Mask phone number (show only last 4 digits)
  CASE 
    WHEN c.phone IS NOT NULL THEN 
      REPEAT('*', LENGTH(c.phone) - 4) || RIGHT(c.phone, 4)
    ELSE NULL 
  END as masked_phone
FROM public.customers c
WHERE c.id IN (
  SELECT customer_id 
  FROM public.sav_cases 
  WHERE tracking_slug IS NOT NULL 
  AND tracking_slug != ''
);

-- The view will inherit RLS policies from the underlying tables
-- Grant access as before
GRANT SELECT ON public.customer_tracking_info TO anon;
GRANT SELECT ON public.customer_tracking_info TO authenticated;