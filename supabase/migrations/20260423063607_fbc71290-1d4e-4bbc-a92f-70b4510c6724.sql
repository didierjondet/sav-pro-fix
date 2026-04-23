-- Function to prevent negative stock and notify
CREATE OR REPLACE FUNCTION public.prevent_negative_part_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  attempted_quantity integer;
BEGIN
  -- Only act if quantity would be negative
  IF NEW.quantity IS NOT NULL AND NEW.quantity < 0 THEN
    attempted_quantity := NEW.quantity;
    NEW.quantity := 0;

    -- Create a notification for the shop (best-effort, don't block update)
    BEGIN
      IF NEW.shop_id IS NOT NULL THEN
        INSERT INTO public.notifications (
          shop_id,
          part_id,
          type,
          title,
          message,
          read
        ) VALUES (
          NEW.shop_id,
          NEW.id,
          'stock_negative_blocked',
          'Stock insuffisant : ' || COALESCE(NEW.name, 'Pièce'),
          format(
            'Une opération a tenté de mettre la pièce "%s" à %s unité(s). La quantité a été automatiquement ramenée à 0. Vérifiez les SAV ou commandes en cours.',
            COALESCE(NEW.name, 'sans nom'),
            attempted_quantity
          ),
          false
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- swallow notification errors to never block the parts update
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any then create
DROP TRIGGER IF EXISTS prevent_negative_part_quantity_trigger ON public.parts;

CREATE TRIGGER prevent_negative_part_quantity_trigger
BEFORE INSERT OR UPDATE OF quantity ON public.parts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_negative_part_quantity();