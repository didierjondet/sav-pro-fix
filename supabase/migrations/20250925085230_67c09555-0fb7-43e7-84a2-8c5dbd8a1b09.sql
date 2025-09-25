-- Ajouter les colonnes pour contrôler l'affichage des éléments de la sidebar
ALTER TABLE public.shops 
ADD COLUMN sidebar_nav_visible boolean DEFAULT true,
ADD COLUMN sidebar_sav_types_visible boolean DEFAULT true, 
ADD COLUMN sidebar_sav_statuses_visible boolean DEFAULT true,
ADD COLUMN sidebar_late_sav_visible boolean DEFAULT true;