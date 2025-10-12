-- Ajouter une colonne pour stocker le nom des pièces personnalisées dans sav_parts
ALTER TABLE public.sav_parts 
ADD COLUMN IF NOT EXISTS custom_part_name text;

COMMENT ON COLUMN public.sav_parts.custom_part_name IS 'Nom de la pièce personnalisée (utilisé seulement si part_id est NULL)';