-- Supprimer l'ancienne politique d'insertion pour les clients
DROP POLICY IF EXISTS "Public can insert client messages" ON public.sav_messages;

-- Créer une nouvelle politique plus sécurisée pour l'insertion des messages clients
CREATE POLICY "Clients can insert messages via tracking" 
ON public.sav_messages 
FOR INSERT 
WITH CHECK (
  sender_type = 'client'::text 
  AND auth.uid() IS NULL 
  AND sav_case_id IN (
    SELECT sav_cases.id 
    FROM sav_cases 
    WHERE sav_cases.tracking_slug IS NOT NULL 
    AND sav_cases.tracking_slug <> ''::text
  )
);

-- Améliorer la fonction RPC pour récupérer les messages avec tracking_slug
CREATE OR REPLACE FUNCTION get_tracking_messages(p_tracking_slug text)
RETURNS TABLE(
  id uuid,
  sender_type text,
  sender_name text,
  message text,
  created_at timestamptz,
  attachments jsonb
) LANGUAGE plpgsql SECURITY DEFINER
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