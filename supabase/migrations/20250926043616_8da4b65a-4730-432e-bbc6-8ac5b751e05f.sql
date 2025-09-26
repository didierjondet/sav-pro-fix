-- Fix security issues by adding restrictive RLS policies (handle existing policies)

-- 1. Drop existing policy on alert_history if it exists and recreate as RESTRICTIVE
DROP POLICY IF EXISTS "Deny all public access to alert history" ON public.alert_history;

-- Create restrictive policy for alert_history
CREATE POLICY "Deny all public access to alert history" 
ON public.alert_history 
AS RESTRICTIVE
FOR ALL 
TO public
USING (false) 
WITH CHECK (false);

-- 2. Fix customers table policy - drop and recreate as RESTRICTIVE
DROP POLICY IF EXISTS "Deny all access to unauthenticated users" ON public.customers;

-- Recreate as RESTRICTIVE policy to force authentication
CREATE POLICY "Deny all access to unauthenticated users" 
ON public.customers 
AS RESTRICTIVE
FOR ALL 
TO public
USING (false) 
WITH CHECK (false);