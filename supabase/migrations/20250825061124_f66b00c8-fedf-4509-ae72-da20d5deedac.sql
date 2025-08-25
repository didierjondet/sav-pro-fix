-- Créer une fonction sécurisée pour permettre aux clients de supprimer leurs propres messages
-- dans un délai de 1 minute après l'envoi
CREATE OR REPLACE FUNCTION public.delete_client_tracking_message(
  p_tracking_slug text,
  p_message_id text,
  p_sender_name text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_message_record RECORD;
  v_sav_case_id UUID;
BEGIN
  -- Récupérer l'ID du SAV case via le tracking slug
  SELECT sc.id INTO v_sav_case_id
  FROM sav_cases sc
  WHERE sc.tracking_slug = p_tracking_slug;
  
  -- Vérifier que le SAV case existe
  IF v_sav_case_id IS NULL THEN
    RAISE EXCEPTION 'SAV case not found for tracking slug: %', p_tracking_slug;
  END IF;
  
  -- Récupérer le message et vérifier les permissions
  SELECT * INTO v_message_record
  FROM sav_messages
  WHERE id = p_message_id::uuid
  AND sav_case_id = v_sav_case_id
  AND sender_type = 'client'
  AND sender_name = p_sender_name;
  
  -- Vérifier que le message existe et appartient au bon expéditeur
  IF v_message_record IS NULL THEN
    RAISE EXCEPTION 'Message not found or permission denied';
  END IF;
  
  -- Vérifier que le message a été envoyé il y a moins de 1 minute
  IF v_message_record.created_at < (NOW() - INTERVAL '1 minute') THEN
    RAISE EXCEPTION 'Message can only be deleted within 1 minute of sending';
  END IF;
  
  -- Supprimer le message
  DELETE FROM sav_messages 
  WHERE id = p_message_id::uuid;
  
  RETURN 'Message deleted successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting message: %', SQLERRM;
END;
$function$;