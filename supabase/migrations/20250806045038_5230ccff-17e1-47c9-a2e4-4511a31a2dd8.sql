-- Ajouter une colonne pour indiquer si le SAV est pris en charge partiellement ou totalement
ALTER TABLE public.sav_cases 
ADD COLUMN partial_takeover BOOLEAN DEFAULT false;

-- Ajouter une colonne pour stocker le montant pris en charge par le magasin
ALTER TABLE public.sav_cases 
ADD COLUMN takeover_amount NUMERIC DEFAULT 0;

-- Ajouter un commentaire pour documenter les nouvelles colonnes
COMMENT ON COLUMN public.sav_cases.partial_takeover IS 'Indique si le magasin prend en charge partiellement le SAV (true) ou totalement (false)';
COMMENT ON COLUMN public.sav_cases.takeover_amount IS 'Montant pris en charge par le magasin en cas de prise en charge partielle';