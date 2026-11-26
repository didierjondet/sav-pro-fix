UPDATE public.shop_sav_statuses t SET display_order = t.display_order + 1
FROM public.shop_sav_statuses p
WHERE p.shop_id = t.shop_id AND p.status_key = 'parts_ordered' AND t.display_order >= p.display_order
  AND NOT EXISTS (SELECT 1 FROM public.shop_sav_statuses x WHERE x.shop_id = t.shop_id AND x.status_key = 'parts_to_order');

INSERT INTO public.shop_sav_statuses (shop_id, status_key, status_label, status_color, display_order, is_default, pause_timer, show_in_sidebar, is_final_status, include_in_metrics, is_active)
SELECT s.id, 'parts_to_order', 'Pièce(s) à commander', '#f97316',
  COALESCE((SELECT p.display_order - 1 FROM public.shop_sav_statuses p WHERE p.shop_id = s.id AND p.status_key = 'parts_ordered'),
           (SELECT COALESCE(max(display_order),0)+1 FROM public.shop_sav_statuses m WHERE m.shop_id = s.id)),
  true, true, true, false, false, true
FROM public.shops s
WHERE NOT EXISTS (SELECT 1 FROM public.shop_sav_statuses x WHERE x.shop_id = s.id AND x.status_key = 'parts_to_order');

CREATE OR REPLACE FUNCTION public.add_default_sav_statuses_to_new_shop()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO shop_sav_statuses (shop_id, status_key, status_label, status_color, display_order, is_default, pause_timer, show_in_sidebar, is_final_status, include_in_metrics)
  VALUES 
    (NEW.id, 'pending', 'En attente', '#f59e0b', 1, true, false, true, false, false),
    (NEW.id, 'in_progress', 'En cours', '#3b82f6', 2, true, false, true, false, false),
    (NEW.id, 'parts_to_order', 'Pièce(s) à commander', '#f97316', 3, true, true, true, false, false),
    (NEW.id, 'parts_ordered', 'Pièces commandées', '#8b5cf6', 4, true, true, true, false, false),
    (NEW.id, 'testing', 'Tests en cours', '#06b6d4', 5, true, false, true, false, false),
    (NEW.id, 'ready', 'Prêt', '#10b981', 6, true, false, true, true, true);
  RETURN NEW;
END;
$function$;