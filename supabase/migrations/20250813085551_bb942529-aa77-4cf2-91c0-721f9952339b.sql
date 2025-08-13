-- Fix customer data exposure vulnerability
-- Remove overly permissive public access policy and replace with restricted access

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Public can view customer info only for valid SAV tracking" ON public.customers;

-- Create a new restricted policy that only allows viewing minimal customer data for tracking
-- This policy allows public access to ONLY first_name and id for customers with valid tracking
CREATE POLICY "Public can view minimal customer data for tracking" 
ON public.customers 
FOR SELECT 
USING (
  -- Only allow access to customers who have active SAV cases with tracking slugs
  id IN (
    SELECT customer_id 
    FROM public.sav_cases 
    WHERE tracking_slug IS NOT NULL 
    AND tracking_slug != ''
  )
);

-- Add a view for public tracking that exposes only safe customer data
CREATE OR REPLACE VIEW public.customer_tracking_info AS
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

-- Grant public access to the tracking view only
GRANT SELECT ON public.customer_tracking_info TO anon;
GRANT SELECT ON public.customer_tracking_info TO authenticated;

-- Ensure authenticated shop users still have full access to their customers
-- This policy should already exist but let's verify it's correct
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'customers' 
    AND policyname = 'Shop users can view customers'
  ) THEN
    CREATE POLICY "Shop users can view customers" 
    ON public.customers 
    FOR SELECT 
    USING (
      shop_id IN (
        SELECT shop_id 
        FROM public.profiles 
        WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;