-- Ajouter les nouvelles colonnes pour la gestion avancée des types de SAV
ALTER TABLE public.shop_sav_types 
ADD COLUMN IF NOT EXISTS show_customer_info boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS max_processing_days integer,
ADD COLUMN IF NOT EXISTS pause_timer boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS show_in_sidebar boolean NOT NULL DEFAULT true;

-- Mettre à jour les types par défaut existants avec les nouvelles valeurs
UPDATE public.shop_sav_types 
SET 
  show_customer_info = true,
  max_processing_days = CASE 
    WHEN type_key = 'internal' THEN 7
    WHEN type_key = 'external' THEN 9
    WHEN type_key = 'client' THEN 7
    ELSE 7
  END,
  pause_timer = false,
  show_in_sidebar = true
WHERE is_default = true;