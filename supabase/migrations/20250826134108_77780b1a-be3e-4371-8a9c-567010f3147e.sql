-- Ajouter le paramètre d'avertissement SAV dans les magasins
ALTER TABLE public.shops 
ADD COLUMN sav_warning_enabled boolean DEFAULT true;