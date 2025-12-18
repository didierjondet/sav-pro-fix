-- Ajouter une colonne couleur à la table parts
ALTER TABLE public.parts 
ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;

-- Créer un index pour améliorer les performances de filtrage
CREATE INDEX IF NOT EXISTS idx_parts_color ON public.parts(color);