-- Add SKU field to sav_cases table
ALTER TABLE public.sav_cases 
ADD COLUMN sku text CHECK (sku IS NULL OR (sku ~ '^[0-9]+$' AND length(sku) <= 13));