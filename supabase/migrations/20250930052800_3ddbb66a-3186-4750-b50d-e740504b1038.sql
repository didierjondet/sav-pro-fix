-- Ajouter une colonne pour l'acompte client dans sav_cases
ALTER TABLE public.sav_cases
ADD COLUMN deposit_amount numeric DEFAULT 0;

-- Ajouter une colonne pour l'acompte client dans quotes
ALTER TABLE public.quotes
ADD COLUMN deposit_amount numeric DEFAULT 0;