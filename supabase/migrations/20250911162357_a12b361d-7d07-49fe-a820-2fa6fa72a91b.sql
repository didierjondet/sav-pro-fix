-- Corriger la fonction de gestion du stock lors de la finalisation des SAV
CREATE OR REPLACE FUNCTION public.handle_sav_completion_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Quand un SAV passe en status 'ready' ou 'delivered' - consommer définitivement le stock
  IF TG_OP = 'UPDATE' THEN
    -- Si le statut change vers 'ready' - consommer le stock et libérer la réservation
    IF OLD.status != NEW.status AND NEW.status = 'ready' THEN
      -- Décrémenter le stock réel et libérer la réservation
      UPDATE public.parts 
      SET 
        quantity = parts.quantity - sp.quantity,
        reserved_quantity = parts.reserved_quantity - sp.quantity
      FROM public.sav_parts sp
      WHERE parts.id = sp.part_id 
      AND sp.sav_case_id = NEW.id
      AND sp.part_id IS NOT NULL;
    END IF;
    
    -- Si le statut change vers 'delivered' depuis un autre statut que 'ready'
    IF OLD.status != NEW.status AND NEW.status = 'delivered' AND OLD.status != 'ready' THEN
      -- Décrémenter le stock réel et libérer la réservation
      UPDATE public.parts 
      SET 
        quantity = parts.quantity - sp.quantity,
        reserved_quantity = parts.reserved_quantity - sp.quantity
      FROM public.sav_parts sp
      WHERE parts.id = sp.part_id 
      AND sp.sav_case_id = NEW.id
      AND sp.part_id IS NOT NULL;
    END IF;
    
    -- Si le statut change vers 'delivered' depuis 'ready' - juste libérer la réservation (stock déjà décompté)
    IF OLD.status = 'ready' AND NEW.status = 'delivered' THEN
      -- Le stock a déjà été décompté lors du passage à 'ready', on ne fait rien
      NULL;
    END IF;
    
    -- Si le statut change vers 'cancelled' - libérer la réservation seulement
    IF OLD.status != NEW.status AND NEW.status = 'cancelled' THEN
      UPDATE public.parts 
      SET reserved_quantity = parts.reserved_quantity - sp.quantity
      FROM public.sav_parts sp
      WHERE parts.id = sp.part_id 
      AND sp.sav_case_id = NEW.id
      AND sp.part_id IS NOT NULL;
    END IF;
  END IF;
  
  -- Si le SAV est supprimé - libérer toutes les réservations
  IF TG_OP = 'DELETE' THEN
    UPDATE public.parts 
    SET reserved_quantity = parts.reserved_quantity - sp.quantity
    FROM public.sav_parts sp
    WHERE parts.id = sp.part_id 
    AND sp.sav_case_id = OLD.id
    AND sp.part_id IS NOT NULL;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Maintenant, corriger les SAV existants qui sont "ready" mais ont encore des pièces réservées
UPDATE public.parts 
SET 
  quantity = parts.quantity - sp.quantity,
  reserved_quantity = parts.reserved_quantity - sp.quantity
FROM public.sav_parts sp
JOIN public.sav_cases sc ON sp.sav_case_id = sc.id
WHERE parts.id = sp.part_id 
AND sc.status = 'ready'
AND sp.part_id IS NOT NULL
AND parts.reserved_quantity > 0;