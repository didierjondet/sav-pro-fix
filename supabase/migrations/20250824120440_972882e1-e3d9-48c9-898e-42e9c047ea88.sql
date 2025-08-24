-- Créer la fonction RPC pour envoyer des messages côté client public
CREATE OR REPLACE FUNCTION send_client_tracking_message(
  p_tracking_slug TEXT,
  p_sender_name TEXT,
  p_message TEXT
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_sav_case_id UUID;
  v_shop_id UUID;
BEGIN
  -- Récupérer l'ID du SAV case et du shop via le tracking slug
  SELECT sc.id, sc.shop_id 
  INTO v_sav_case_id, v_shop_id
  FROM sav_cases sc
  WHERE sc.tracking_slug = p_tracking_slug;
  
  -- Vérifier que le SAV case existe
  IF v_sav_case_id IS NULL THEN
    RAISE EXCEPTION 'SAV case not found for tracking slug: %', p_tracking_slug;
  END IF;
  
  -- Insérer le message
  INSERT INTO sav_messages (
    sav_case_id,
    shop_id,
    sender_type,
    sender_name,
    message,
    read_by_client,
    read_by_shop
  ) VALUES (
    v_sav_case_id,
    v_shop_id,
    'client',
    p_sender_name,
    p_message,
    true,
    false
  );
  
  RETURN 'Message sent successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error sending message: %', SQLERRM;
END;
$$;