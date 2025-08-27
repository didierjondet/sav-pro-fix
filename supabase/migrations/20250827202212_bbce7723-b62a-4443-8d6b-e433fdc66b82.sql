-- Ajouter une colonne discount_info aux tables sav_cases et quotes pour stocker les informations de remise
ALTER TABLE public.sav_cases ADD COLUMN discount_info jsonb;
ALTER TABLE public.quotes ADD COLUMN discount_info jsonb;

-- Ajouter des commentaires pour documenter le format JSON
COMMENT ON COLUMN public.sav_cases.discount_info IS 'Stocke les informations de remise au format JSON: {"type": "percentage|fixed", "value": number, "amount": number}';
COMMENT ON COLUMN public.quotes.discount_info IS 'Stocke les informations de remise au format JSON: {"type": "percentage|fixed", "value": number, "amount": number}';