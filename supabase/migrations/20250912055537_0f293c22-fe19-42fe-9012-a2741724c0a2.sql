-- Ajouter le champ show_in_sidebar aux statuts SAV
ALTER TABLE public.shop_sav_statuses 
ADD COLUMN show_in_sidebar boolean NOT NULL DEFAULT false;

-- Mettre les statuts "pending" comme visibles par défaut dans la sidebar
UPDATE public.shop_sav_statuses 
SET show_in_sidebar = true 
WHERE status_key = 'pending';

COMMENT ON COLUMN public.shop_sav_statuses.show_in_sidebar IS 'Si true, ce statut apparaît dans la sidebar avec son compteur';