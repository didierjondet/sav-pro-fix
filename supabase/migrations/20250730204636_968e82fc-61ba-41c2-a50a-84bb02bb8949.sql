-- Add subscription_menu_visible field to shops table
ALTER TABLE public.shops 
ADD COLUMN subscription_menu_visible BOOLEAN NOT NULL DEFAULT true;