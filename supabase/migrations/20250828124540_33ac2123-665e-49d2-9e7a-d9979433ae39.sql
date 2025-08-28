-- Corriger la fonction get_tracking_messages pour la sécurité
CREATE OR REPLACE FUNCTION get_tracking_messages(p_tracking_slug text)
RETURNS TABLE(
  id uuid,
  sender_type text,
  sender_name text,
  message text,
  created_at timestamptz,
  attachments jsonb
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Vérifier que le tracking_slug existe et n'est pas vide
  IF NOT EXISTS (
    SELECT 1 FROM sav_cases 
    WHERE tracking_slug = p_tracking_slug 
    AND tracking_slug IS NOT NULL 
    AND tracking_slug <> ''
  ) THEN
    RAISE EXCEPTION 'Invalid tracking slug';
  END IF;

  -- Retourner les messages pour ce tracking_slug
  RETURN QUERY
  SELECT 
    sm.id,
    sm.sender_type,
    sm.sender_name,
    sm.message,
    sm.created_at,
    sm.attachments
  FROM sav_messages sm
  JOIN sav_cases sc ON sm.sav_case_id = sc.id
  WHERE sc.tracking_slug = p_tracking_slug
  ORDER BY sm.created_at ASC;
END;
$$;