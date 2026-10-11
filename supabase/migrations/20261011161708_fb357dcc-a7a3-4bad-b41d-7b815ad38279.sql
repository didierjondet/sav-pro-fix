CREATE OR REPLACE FUNCTION public.notify_super_admin_new_shop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://jljkrthymaqxkebosqko.supabase.co/functions/v1/notify-super-admin',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsamtydGh5bWFxeGtlYm9zcWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzIyNzAsImV4cCI6MjA2OTEwODI3MH0._0zuhHNvENoU0vpuOTT8OmksA59xLG-KaaTg9SU0OxA"}'::jsonb,
    body := jsonb_build_object('kind', 'new_shop', 'shop_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer l'inscription si l'alerte échoue
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_super_admin_new_shop ON public.shops;
CREATE TRIGGER trg_notify_super_admin_new_shop
AFTER INSERT ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.notify_super_admin_new_shop();