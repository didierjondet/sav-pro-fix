-- Add public read access to SAV cases for client tracking
-- This allows anyone with a case number to view the SAV case details (for client tracking)
CREATE POLICY "Public can view SAV cases by case number" 
ON public.sav_cases 
FOR SELECT 
USING (true);

-- Also ensure customers table allows public read access for client tracking
CREATE POLICY "Public can view customer info for SAV tracking" 
ON public.customers 
FOR SELECT 
USING (true);