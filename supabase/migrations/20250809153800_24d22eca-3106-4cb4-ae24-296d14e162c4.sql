-- Add device-related fields to quotes for parity with sav_cases
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS device_brand text NULL,
  ADD COLUMN IF NOT EXISTS device_model text NULL,
  ADD COLUMN IF NOT EXISTS device_imei text NULL,
  ADD COLUMN IF NOT EXISTS sku text NULL,
  ADD COLUMN IF NOT EXISTS problem_description text NULL,
  ADD COLUMN IF NOT EXISTS repair_notes text NULL;

-- Optional indexes for search usability (brand/model/imei)
CREATE INDEX IF NOT EXISTS idx_quotes_device_brand ON public.quotes (device_brand);
CREATE INDEX IF NOT EXISTS idx_quotes_device_model ON public.quotes (device_model);
CREATE INDEX IF NOT EXISTS idx_quotes_device_imei ON public.quotes (device_imei);
