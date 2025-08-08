-- Add new SAV type 'external' to enum sav_type if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'sav_type' AND e.enumlabel = 'external'
  ) THEN
    ALTER TYPE public.sav_type ADD VALUE 'external';
  END IF;
END $$;