-- Check for any remaining SECURITY DEFINER functions that might be the issue
-- and make sure no functions are marked as SECURITY DEFINER unless necessary

-- List all functions to identify potential issues
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true;