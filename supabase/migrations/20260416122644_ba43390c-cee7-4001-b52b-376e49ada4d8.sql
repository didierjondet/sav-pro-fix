
-- 1. Fix the trigger to release reservations from ANY status to ready/cancelled
CREATE OR REPLACE FUNCTION public.handle_sav_completion_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Si passage vers "ready" depuis n'importe quel autre statut
    -- → Consommer le stock ET libérer la réservation
    IF NEW.status = 'ready' AND OLD.status <> 'ready' THEN
      UPDATE public.parts 
      SET 
        quantity = parts.quantity - sp.quantity,
        reserved_quantity = GREATEST(0, parts.reserved_quantity - sp.quantity)
      FROM public.sav_parts sp
      WHERE parts.id = sp.part_id 
      AND sp.sav_case_id = NEW.id
      AND sp.part_id IS NOT NULL;
      
      -- Supprimer tous les order_items liés à ce SAV
      DELETE FROM public.order_items 
      WHERE sav_case_id = NEW.id;
    END IF;
    
    -- Si passage vers "cancelled" depuis n'importe quel autre statut
    -- → Libérer seulement la réservation, ne pas toucher au stock
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
      UPDATE public.parts 
      SET reserved_quantity = GREATEST(0, parts.reserved_quantity - sp.quantity)
      FROM public.sav_parts sp
      WHERE parts.id = sp.part_id 
      AND sp.sav_case_id = NEW.id
      AND sp.part_id IS NOT NULL;
      
      -- Supprimer tous les order_items liés à ce SAV annulé
      DELETE FROM public.order_items 
      WHERE sav_case_id = NEW.id;
    END IF;
    
  END IF;
  
  -- Si suppression d'un SAV, libérer la réservation
  IF TG_OP = 'DELETE' THEN
    UPDATE public.parts 
    SET reserved_quantity = GREATEST(0, parts.reserved_quantity - sp.quantity)
    FROM public.sav_parts sp
    WHERE parts.id = sp.part_id 
    AND sp.sav_case_id = OLD.id
    AND sp.part_id IS NOT NULL;
    
    DELETE FROM public.order_items 
    WHERE sav_case_id = OLD.id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. Recalculate reserved_quantity for ALL parts based on active SAV cases
UPDATE parts SET reserved_quantity = COALESCE(
  (SELECT SUM(sp.quantity) FROM sav_parts sp 
   JOIN sav_cases sc ON sp.sav_case_id = sc.id
   WHERE sp.part_id = parts.id 
   AND sc.status NOT IN ('ready','delivered','cancelled')),
  0
);
