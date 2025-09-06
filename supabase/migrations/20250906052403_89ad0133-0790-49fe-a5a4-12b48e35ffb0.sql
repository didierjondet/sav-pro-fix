-- Modifier la colonne status pour accepter les statuts personnalisés
-- Changer le type de l'enum vers text pour les SAV cases
ALTER TABLE public.sav_cases 
ALTER COLUMN status TYPE text;

-- Changer le type de l'enum vers text pour l'historique des statuts
ALTER TABLE public.sav_status_history 
ALTER COLUMN status TYPE text;

-- Ajouter un commentaire pour clarifier l'usage
COMMENT ON COLUMN public.sav_cases.status IS 'Status key from shop_sav_statuses table or default status values';
COMMENT ON COLUMN public.sav_status_history.status IS 'Status key from shop_sav_statuses table or default status values';