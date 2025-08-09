-- Harden ensure_non_negative_time_minutes with explicit search_path
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