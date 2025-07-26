-- Fix function search path security issues
ALTER FUNCTION generate_case_number() SET search_path = public;
ALTER FUNCTION set_case_number() SET search_path = public;
ALTER FUNCTION update_updated_at_column() SET search_path = public;