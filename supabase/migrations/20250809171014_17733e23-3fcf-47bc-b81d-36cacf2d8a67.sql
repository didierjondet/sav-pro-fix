-- Monthly backup reminder cron job and extensions
-- Ensure required extensions are enabled
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Schedule daily run at 09:00 (local project timezone) to trigger the edge function,
-- the function itself only acts on the last day of the month
select
  cron.schedule(
    'monthly-backup-reminder-daily',
    '0 9 * * *',
    $$
    select net.http_post(
      url:='https://jljkrthymaqxkebosqko.supabase.co/functions/v1/monthly-backup-reminder',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsamtydGh5bWFxeGtlYm9zcWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzIyNzAsImV4cCI6MjA2OTEwODI3MH0._0zuhHNvENoU0vpuOTT8OmksA59xLG-KaaTg9SU0OxA"}'::jsonb,
      body:='{}'::jsonb
    );
    $$
  );