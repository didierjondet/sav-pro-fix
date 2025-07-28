-- Corriger la fonction update_active_sav_count pour utiliser les bonnes valeurs d'enum
CREATE OR REPLACE FUNCTION update_active_sav_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the active SAV count for the shop
  UPDATE public.shops 
  SET active_sav_count = (
    SELECT COUNT(*) 
    FROM public.sav_cases 
    WHERE shop_id = COALESCE(NEW.shop_id, OLD.shop_id) 
    AND status NOT IN ('delivered', 'cancelled')
  )
  WHERE id = COALESCE(NEW.shop_id, OLD.shop_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;