-- Fix security issues by adding restrictive RLS policies

-- 1. Add restrictive default policy for alert_history table
-- This will block all public access to alert history (only super admins can access via existing policy)
CREATE POLICY "Deny all public access to alert history" 
ON public.alert_history 
AS RESTRICTIVE
FOR ALL 
TO public
USING (false) 
WITH CHECK (false);

-- 2. Fix customers table policy - change from PERMISSIVE to RESTRICTIVE
-- First drop the existing permissive policy
DROP POLICY IF EXISTS "Deny all access to unauthenticated users" ON public.customers;

-- Recreate as RESTRICTIVE policy to force authentication
CREATE POLICY "Deny all access to unauthenticated users" 
ON public.customers 
AS RESTRICTIVE
FOR ALL 
TO public
USING (false) 
WITH CHECK (false);