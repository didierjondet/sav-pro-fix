-- Supprimer le trigger qui décrémente le compteur SAV lors de la suppression
-- Car cela pourrait être exploité pour contourner les limites du plan
DROP TRIGGER IF EXISTS sav_monthly_counter_delete ON public.sav_cases;

-- Supprimer la fonction associée
DROP FUNCTION IF EXISTS public.decrement_monthly_sav_counter();