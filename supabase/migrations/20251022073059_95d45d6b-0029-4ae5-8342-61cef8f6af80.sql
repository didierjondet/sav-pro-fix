-- Enable pg_cron extension (si pas déjà activé)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Planifier l'exécution de la fonction check-sav-delays toutes les heures
SELECT cron.schedule(
  'check-sav-delays-hourly',
  '0 * * * *', -- Toutes les heures à la minute 0
  $$
  SELECT
    net.http_post(
        url:='https://jljkrthymaqxkebosqko.supabase.co/functions/v1/check-sav-delays',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsamtydGh5bWFxeGtlYm9zcWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzIyNzAsImV4cCI6MjA2OTEwODI3MH0._0zuhHNvENoU0vpuOTT8OmksA59xLG-KaaTg9SU0OxA"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);