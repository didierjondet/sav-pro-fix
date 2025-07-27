-- Fix the ambiguous column reference in generate_case_number function
CREATE OR REPLACE FUNCTION public.generate_case_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  new_case_number TEXT;
BEGIN
  -- Get the next sequence number for today with explicit table reference
  SELECT COALESCE(MAX(CAST(SUBSTRING(sav_cases.case_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.sav_cases
  WHERE sav_cases.case_number LIKE TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') || '-%';
  
  -- Format: YYYY-MM-DD-001
  new_case_number := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') || '-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN new_case_number;
END;
$function$;