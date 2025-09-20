-- Corriger la fonction avec un search_path sécurisé
CREATE OR REPLACE FUNCTION sync_sms_credits_after_purchase()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Quand un package SMS est marqué comme complété, on met à jour les totaux
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Optionnel: Log de la transaction
    INSERT INTO public.sms_history (
      shop_id,
      type,
      message,
      to_number,
      status
    ) VALUES (
      NEW.shop_id,
      'package_purchase',
      format('Achat de %s crédits SMS - Package %s', NEW.sms_count, NEW.package_id),
      'system',
      'completed'
    );
  END IF;
  
  RETURN NEW;
END;
$$;