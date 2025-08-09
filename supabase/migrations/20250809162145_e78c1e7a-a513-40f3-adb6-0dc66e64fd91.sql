-- Normalize customer names: first_name lowercase, last_name uppercase
-- 1) Create function
CREATE OR REPLACE FUNCTION public.normalize_customer_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.first_name IS NOT NULL THEN
    NEW.first_name := lower(trim(NEW.first_name));
  END IF;
  IF NEW.last_name IS NOT NULL THEN
    NEW.last_name := upper(trim(NEW.last_name));
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Attach trigger to customers table
DROP TRIGGER IF EXISTS trg_normalize_customer_name ON public.customers;
CREATE TRIGGER trg_normalize_customer_name
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.normalize_customer_name();

-- 3) Backfill existing data
UPDATE public.customers
SET 
  first_name = lower(trim(first_name)),
  last_name = upper(trim(last_name))
WHERE first_name IS NOT NULL OR last_name IS NOT NULL;