-- Corriger le trigger pour permettre l'ajout de pièces même avec stock zéro
-- Le système doit pouvoir valider un SAV avec des pièces en rupture pour ensuite créer les commandes automatiquement

CREATE OR REPLACE FUNCTION public.handle_sav_part_stock_reservation()
RETURNS TRIGGER AS $$
BEGIN
  -- Lors de l'ajout d'une pièce SAV
  IF TG_OP = 'INSERT' THEN
    -- Toujours permettre l'ajout, même avec stock zéro
    -- Le système de commandes automatiques s'occupera des pièces manquantes
    IF NEW.part_id IS NOT NULL THEN
      UPDATE public.parts 
      SET reserved_quantity = GREATEST(0, reserved_quantity + NEW.quantity)
      WHERE id = NEW.part_id;
      
      -- Ne pas lancer d'exception même si stock insuffisant
      -- Le système frontend gère les alertes et commandes automatiques
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Lors de la suppression d'une pièce SAV
  IF TG_OP = 'DELETE' THEN
    -- Remettre la quantité dans le stock disponible
    IF OLD.part_id IS NOT NULL THEN
      UPDATE public.parts 
      SET reserved_quantity = GREATEST(0, reserved_quantity - OLD.quantity)
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
        SET reserved_quantity = GREATEST(0, reserved_quantity - OLD.quantity)
        WHERE id = OLD.part_id;
      END IF;
      
      -- Réserver la nouvelle quantité (même si stock insuffisant)
      IF NEW.part_id IS NOT NULL THEN
        UPDATE public.parts 
        SET reserved_quantity = GREATEST(0, reserved_quantity + NEW.quantity)
        WHERE id = NEW.part_id;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';