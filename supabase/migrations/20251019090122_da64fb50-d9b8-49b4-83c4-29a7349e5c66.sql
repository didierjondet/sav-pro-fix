-- Modifier la valeur par défaut du stock minimum à 1
ALTER TABLE public.parts 
ALTER COLUMN min_stock SET DEFAULT 1;