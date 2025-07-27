-- Fix the ambiguous column reference in generate_quote_number function
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  next_number INTEGER;
  quote_number TEXT;
BEGIN
  -- Get the next sequence number for today with explicit table reference
  SELECT COALESCE(MAX(CAST(SUBSTRING(q.quote_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.quotes q
  WHERE q.quote_number LIKE 'DEV-' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') || '-%';
  
  -- Format: DEV-YYYY-MM-DD-001
  quote_number := 'DEV-' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') || '-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN quote_number;
END;
$function$;