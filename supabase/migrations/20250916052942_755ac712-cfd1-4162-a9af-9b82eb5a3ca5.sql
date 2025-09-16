-- Nettoyer les notifications corrompues et anciennes
DELETE FROM notifications 
WHERE shop_id = 'add89e6c-2bff-4799-a062-63cd0a9b33c0' 
AND (
  -- Supprimer les notifications lues de plus de 7 jours
  (read = true AND created_at < (NOW() - INTERVAL '7 days'))
  OR
  -- Supprimer les notifications de messages SAV déjà lues (doublons)
  (type = 'general' AND title = 'Nouveau message client' AND read = true)
);