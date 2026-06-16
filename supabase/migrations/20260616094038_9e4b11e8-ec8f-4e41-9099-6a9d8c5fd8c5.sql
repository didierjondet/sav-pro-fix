DROP TRIGGER IF EXISTS sync_part_updates_trigger ON public.parts;

CREATE TRIGGER sync_part_updates_trigger
AFTER UPDATE OF selling_price, purchase_price, time_minutes ON public.parts
FOR EACH ROW
WHEN (
  OLD.selling_price IS DISTINCT FROM NEW.selling_price
  OR OLD.purchase_price IS DISTINCT FROM NEW.purchase_price
  OR OLD.time_minutes IS DISTINCT FROM NEW.time_minutes
)
EXECUTE FUNCTION public.sync_part_updates_to_sav();