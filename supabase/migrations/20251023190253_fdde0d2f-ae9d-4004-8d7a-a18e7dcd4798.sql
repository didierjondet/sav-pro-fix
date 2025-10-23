-- Migration: Nettoyer les order_items lors de la complétion d'un SAV

-- Modifier le trigger handle_sav_completion_stock pour supprimer les order_items
CREATE OR REPLACE FUNCTION public.handle_sav_completion_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- 🛡️ PROTECTION 5: Si passage de statut actif vers "ready"
    -- → Consommer le stock ET libérer la réservation (une seule fois)
    IF OLD.status IN ('pending', 'in_progress', 'parts_ordered', 'testing') 
       AND NEW.status = 'ready' THEN
      UPDATE public.parts 
      SET 
        quantity = parts.quantity - sp.quantity,
        reserved_quantity = GREATEST(0, parts.reserved_quantity - sp.quantity)
      FROM public.sav_parts sp
      WHERE parts.id = sp.part_id 
      AND sp.sav_case_id = NEW.id
      AND sp.part_id IS NOT NULL;
      
      -- 🆕 NOUVEAU: Supprimer tous les order_items liés à ce SAV
      DELETE FROM public.order_items 
      WHERE sav_case_id = NEW.id;
    END IF;
    
    -- 🛡️ PROTECTION 6: Si passage direct vers "cancelled" (sans passer par ready)
    -- → Libérer seulement la réservation, ne pas toucher au stock
    IF OLD.status IN ('pending', 'in_progress', 'parts_ordered', 'testing')
       AND NEW.status = 'cancelled' THEN
      UPDATE public.parts 
      SET reserved_quantity = GREATEST(0, parts.reserved_quantity - sp.quantity)
      FROM public.sav_parts sp
      WHERE parts.id = sp.part_id 
      AND sp.sav_case_id = NEW.id
      AND sp.part_id IS NOT NULL;
      
      -- 🆕 NOUVEAU: Supprimer tous les order_items liés à ce SAV annulé
      DELETE FROM public.order_items 
      WHERE sav_case_id = NEW.id;
    END IF;
    
  END IF;
  
  -- Si suppression du SAV, libérer toutes les réservations ET nettoyer order_items
  IF TG_OP = 'DELETE' THEN
    UPDATE public.parts 
    SET reserved_quantity = GREATEST(0, parts.reserved_quantity - sp.quantity)
    FROM public.sav_parts sp
    WHERE parts.id = sp.part_id 
    AND sp.sav_case_id = OLD.id
    AND sp.part_id IS NOT NULL;
    
    -- 🆕 NOUVEAU: Supprimer tous les order_items liés à ce SAV supprimé
    DELETE FROM public.order_items 
    WHERE sav_case_id = OLD.id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;