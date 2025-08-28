-- Permettre l'accès public aux photos des messages SAV pour les clients via tracking slug
CREATE OR REPLACE FUNCTION public.get_tracking_messages(p_tracking_slug text)
RETURNS TABLE(
  id uuid,
  sender_type text, 
  sender_name text, 
  message text, 
  created_at timestamp with time zone,
  attachments jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
  AND sc.tracking_slug IS NOT NULL
  AND sc.tracking_slug != ''
  ORDER BY sm.created_at ASC;
END;
$function$;