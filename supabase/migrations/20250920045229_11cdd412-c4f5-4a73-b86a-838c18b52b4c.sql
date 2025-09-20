-- Fonction pour synchroniser les crédits SMS après achat d'un package
CREATE OR REPLACE FUNCTION sync_sms_credits_after_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand un package SMS est marqué comme complété, on met à jour les totaux
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Optionnel: Log de la transaction
    INSERT INTO sms_history (
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
$$ LANGUAGE plpgsql;

-- Trigger pour automatiser la synchronisation
DROP TRIGGER IF EXISTS sync_after_sms_purchase ON sms_package_purchases;
CREATE TRIGGER sync_after_sms_purchase
  AFTER UPDATE ON sms_package_purchases
  FOR EACH ROW
  EXECUTE FUNCTION sync_sms_credits_after_purchase();