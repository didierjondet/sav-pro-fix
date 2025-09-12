-- Ajouter le champ pause_timer aux statuts SAV existants
ALTER TABLE public.shop_sav_statuses 
ADD COLUMN pause_timer boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.shop_sav_statuses.pause_timer IS 'Si true, ce statut ne fait pas avancer le compteur de temps pour les délais SAV';