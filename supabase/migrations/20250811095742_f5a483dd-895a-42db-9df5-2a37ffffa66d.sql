-- Créer une fonction pour synchroniser les modifications de pièces avec les SAV
CREATE OR REPLACE FUNCTION public.sync_part_updates_to_sav()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour automatiquement les pièces dans les SAV quand une pièce est modifiée
  UPDATE public.sav_parts 
  SET 
    unit_price = NEW.selling_price,
    purchase_price = NEW.purchase_price,
    time_minutes = NEW.time_minutes
  WHERE part_id = NEW.id;
  
  -- Recalculer les coûts totaux pour tous les SAV affectés
  UPDATE public.sav_cases 
  SET 
    total_cost = (
      SELECT COALESCE(SUM(sp.quantity * sp.unit_price), 0)
      FROM public.sav_parts sp 
      WHERE sp.sav_case_id = sav_cases.id
    ),
    total_time_minutes = (
      SELECT COALESCE(SUM(sp.quantity * sp.time_minutes), 0)
      FROM public.sav_parts sp 
      WHERE sp.sav_case_id = sav_cases.id
    )
  WHERE id IN (
    SELECT DISTINCT sav_case_id 
    FROM public.sav_parts 
    WHERE part_id = NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Créer le trigger pour synchroniser automatiquement
CREATE TRIGGER sync_part_updates_trigger
  AFTER UPDATE ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_part_updates_to_sav();