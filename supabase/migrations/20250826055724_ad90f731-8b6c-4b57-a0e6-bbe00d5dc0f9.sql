-- Corriger les problèmes de sécurité des fonctions en définissant le search_path
CREATE OR REPLACE FUNCTION public.handle_sav_part_stock_reservation()
RETURNS TRIGGER AS $$
BEGIN
  -- Lors de l'ajout d'une pièce SAV
  IF TG_OP = 'INSERT' THEN
    -- Vérifier si la pièce a assez de stock disponible
    IF NEW.part_id IS NOT NULL THEN
      UPDATE public.parts 
      SET reserved_quantity = reserved_quantity + NEW.quantity
      WHERE id = NEW.part_id
      AND (quantity - reserved_quantity) >= NEW.quantity;
      
      -- Vérifier que la mise à jour a bien eu lieu (stock suffisant)
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock insuffisant pour la pièce. Stock disponible: %', 
          (SELECT (quantity - reserved_quantity) FROM public.parts WHERE id = NEW.part_id);
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Lors de la suppression d'une pièce SAV
  IF TG_OP = 'DELETE' THEN
    -- Remettre la quantité dans le stock disponible
    IF OLD.part_id IS NOT NULL THEN
      UPDATE public.parts 
      SET reserved_quantity = reserved_quantity - OLD.quantity
      WHERE id = OLD.part_id;
    END IF;
    
    RETURN OLD;
  END IF;
  
  -- Lors de la modification d'une quantité de pièce SAV
  IF TG_OP = 'UPDATE' THEN
    -- Si la pièce a changé ou la quantité a changé
    IF OLD.part_id != NEW.part_id OR OLD.quantity != NEW.quantity THEN
      -- Remettre l'ancienne quantité dans le stock
      IF OLD.part_id IS NOT NULL THEN
        UPDATE public.parts 
        SET reserved_quantity = reserved_quantity - OLD.quantity
        WHERE id = OLD.part_id;
      END IF;
      
      -- Réserver la nouvelle quantité
      IF NEW.part_id IS NOT NULL THEN
        UPDATE public.parts 
        SET reserved_quantity = reserved_quantity + NEW.quantity
        WHERE id = NEW.part_id
        AND (quantity - reserved_quantity) >= NEW.quantity;
        
        -- Vérifier que la mise à jour a bien eu lieu
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Stock insuffisant pour la pièce. Stock disponible: %', 
            (SELECT (quantity - reserved_quantity) FROM public.parts WHERE id = NEW.part_id);
        END IF;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_sav_completion_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand un SAV passe en status 'delivered', 'cancelled', ou est supprimé
  -- On doit gérer différemment selon le statut
  
  IF TG_OP = 'UPDATE' THEN
    -- Si le statut change vers 'delivered' - consommer définitivement le stock
    IF OLD.status != NEW.status AND NEW.status = 'delivered' THEN
      -- Décrémenter le stock réel et libérer la réservation
      UPDATE public.parts 
      SET 
        quantity = quantity - sp.quantity,
        reserved_quantity = reserved_quantity - sp.quantity
      FROM public.sav_parts sp
      WHERE parts.id = sp.part_id 
      AND sp.sav_case_id = NEW.id
      AND sp.part_id IS NOT NULL;
    END IF;
    
    -- Si le statut change vers 'cancelled' - libérer la réservation
    IF OLD.status != NEW.status AND NEW.status = 'cancelled' THEN
      UPDATE public.parts 
      SET reserved_quantity = reserved_quantity - sp.quantity
      FROM public.sav_parts sp
      WHERE parts.id = sp.part_id 
      AND sp.sav_case_id = NEW.id
      AND sp.part_id IS NOT NULL;
    END IF;
  END IF;
  
  -- Si le SAV est supprimé - libérer toutes les réservations
  IF TG_OP = 'DELETE' THEN
    UPDATE public.parts 
    SET reserved_quantity = reserved_quantity - sp.quantity
    FROM public.sav_parts sp
    WHERE parts.id = sp.part_id 
    AND sp.sav_case_id = OLD.id
    AND sp.part_id IS NOT NULL;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_available_stock(part_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COALESCE(quantity - reserved_quantity, 0) 
    FROM public.parts 
    WHERE id = part_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;