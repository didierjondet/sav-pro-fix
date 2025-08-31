-- Add supplier column to parts table
ALTER TABLE public.parts 
ADD COLUMN supplier TEXT;