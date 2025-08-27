-- Ajouter une colonne discount_info aux tables sav_parts et quote_items pour stocker les informations de remise par pièce
ALTER TABLE public.sav_parts ADD COLUMN discount_info jsonb;

-- Ajouter des commentaires pour documenter le format JSON
COMMENT ON COLUMN public.sav_parts.discount_info IS 'Stocke les informations de remise par pièce au format JSON: {"type": "percentage|fixed", "value": number, "amount": number}';