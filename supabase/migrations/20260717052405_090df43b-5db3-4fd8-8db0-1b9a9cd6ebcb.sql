
CREATE OR REPLACE FUNCTION public.add_default_sav_statuses_to_new_shop()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO shop_sav_statuses (shop_id, status_key, status_label, status_color, display_order, is_default, pause_timer, show_in_sidebar, is_final_status, include_in_metrics)
  VALUES 
    (NEW.id, 'pending', 'En attente', '#f59e0b', 1, true, false, true, false, false),
    (NEW.id, 'in_progress', 'En cours', '#3b82f6', 2, true, false, true, false, false),
    (NEW.id, 'parts_ordered', 'Pièces commandées', '#8b5cf6', 3, true, true, true, false, false),
    (NEW.id, 'testing', 'Tests en cours', '#06b6d4', 4, true, false, true, false, false),
    (NEW.id, 'ready', 'Prêt', '#10b981', 5, true, false, true, true, true);
  RETURN NEW;
END;
$function$;
