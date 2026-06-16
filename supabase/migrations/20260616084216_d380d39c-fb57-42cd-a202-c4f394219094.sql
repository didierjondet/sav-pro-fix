CREATE OR REPLACE FUNCTION public.release_part_reservations_on_final_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_final boolean;
  is_now_final boolean;
  old_builtin boolean;
  new_builtin boolean;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Statuts gérés par handle_sav_completion_stock (évite double UPDATE sur parts)
  old_builtin := OLD.status IN ('ready','cancelled','delivered');
  new_builtin := NEW.status IN ('ready','cancelled','delivered');

  was_final := public.is_final_sav_status(NEW.shop_id, OLD.status);
  is_now_final := public.is_final_sav_status(NEW.shop_id, NEW.status);

  -- Passage vers un statut final PERSONNALISÉ uniquement
  IF NOT was_final AND is_now_final AND NOT new_builtin THEN
    UPDATE public.parts p
    SET reserved_quantity = GREATEST(0, COALESCE(p.reserved_quantity,0) - sp.quantity)
    FROM public.sav_parts sp
    WHERE sp.sav_case_id = NEW.id AND sp.part_id = p.id;
  -- Réouverture depuis un statut final PERSONNALISÉ uniquement
  ELSIF was_final AND NOT is_now_final AND NOT old_builtin THEN
    UPDATE public.parts p
    SET reserved_quantity = GREATEST(0, COALESCE(p.reserved_quantity,0) + sp.quantity)
    FROM public.sav_parts sp
    WHERE sp.sav_case_id = NEW.id AND sp.part_id = p.id;
  END IF;

  RETURN NEW;
END;
$$;