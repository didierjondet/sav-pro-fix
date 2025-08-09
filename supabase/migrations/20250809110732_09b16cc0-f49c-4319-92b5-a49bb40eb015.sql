-- Add time_minutes field to parts table
ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS time_minutes INTEGER NOT NULL DEFAULT 15;

-- Optional: ensure non-negative values
CREATE OR REPLACE FUNCTION public.ensure_non_negative_time_minutes()
RETURNS trigger AS $$
BEGIN
  IF NEW.time_minutes IS NULL THEN
    NEW.time_minutes := 15;
  END IF;
  IF NEW.time_minutes < 0 THEN
    NEW.time_minutes := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to parts for insert/update
DROP TRIGGER IF EXISTS trg_parts_time_minutes ON public.parts;
CREATE TRIGGER trg_parts_time_minutes
BEFORE INSERT OR UPDATE ON public.parts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_non_negative_time_minutes();