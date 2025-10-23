-- 1. Supprimer l'ancienne contrainte
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Créer la nouvelle contrainte avec le type 'general' existant + sav_delay_alert
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('stock_alert', 'support_message', 'sav_message', 'sav_delay_alert', 'general'));

-- 3. Activer les extensions nécessaires pour le cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 4. Supprimer le cron job s'il existe déjà (pour éviter les doublons)
SELECT cron.unschedule('check-sav-delays-hourly') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-sav-delays-hourly'
);

-- 5. Créer le cron job pour vérifier les retards SAV toutes les heures (8h-18h)
SELECT cron.schedule(
  'check-sav-delays-hourly',
  '0 8-18 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://jljkrthymaqxkebosqko.supabase.co/functions/v1/check-sav-delays',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsamtydGh5bWFxeGtlYm9zcWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzIyNzAsImV4cCI6MjA2OTEwODI3MH0._0zuhHNvENoU0vpuOTT8OmksA59xLG-KaaTg9SU0OxA"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);