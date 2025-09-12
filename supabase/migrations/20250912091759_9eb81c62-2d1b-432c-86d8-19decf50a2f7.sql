-- Ajouter les colonnes pour traquer qui a accepté le devis et quand
ALTER TABLE public.quotes 
ADD COLUMN accepted_by TEXT,
ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE;