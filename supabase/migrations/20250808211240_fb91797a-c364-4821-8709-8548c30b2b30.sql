-- Add purchase price to sav_parts to track cost alongside public price
ALTER TABLE public.sav_parts
ADD COLUMN IF NOT EXISTS purchase_price numeric;