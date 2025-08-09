-- Add time_minutes to parts and ensure non-negative values with trigger

-- 1) Add column to parts
ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS time_minutes INTEGER NOT NULL DEFAULT 15;

-- 2) Ensure function exists and is secured
CREATE OR REPLACE FUNCTION public.ensure_non_negative_time_minutes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.time_minutes IS NULL THEN
    NEW.time_minutes := 15;
  END IF;
  IF NEW.time_minutes < 0 THEN
    NEW.time_minutes := 0;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Create trigger on parts to enforce constraints on insert/update
DROP TRIGGER IF EXISTS parts_ensure_non_negative_time_minutes ON public.parts;
CREATE TRIGGER parts_ensure_non_negative_time_minutes
BEFORE INSERT OR UPDATE ON public.parts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_non_negative_time_minutes();