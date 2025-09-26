-- Fix customers table policy only (alert_history policy already exists)

-- Drop and recreate customers policy as RESTRICTIVE
DROP POLICY IF EXISTS "Deny all access to unauthenticated users" ON public.customers;

-- Recreate as RESTRICTIVE policy to force authentication
CREATE POLICY "Deny all access to unauthenticated users" 
ON public.customers 
AS RESTRICTIVE
FOR ALL 
TO public
USING (false) 
WITH CHECK (false);