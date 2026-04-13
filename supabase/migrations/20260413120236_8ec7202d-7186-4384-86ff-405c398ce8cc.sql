
-- 1. Trigger statuts en SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.add_default_sav_statuses_to_new_shop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO shop_sav_statuses (shop_id, status_key, status_label, status_color, display_order, is_default, pause_timer, show_in_sidebar, is_final_status)
  VALUES 
    (NEW.id, 'pending', 'En attente', '#f59e0b', 1, true, false, true, false),
    (NEW.id, 'in_progress', 'En cours', '#3b82f6', 2, true, false, true, false),
    (NEW.id, 'parts_ordered', 'Pièces commandées', '#8b5cf6', 3, true, true, true, false),
    (NEW.id, 'testing', 'Tests en cours', '#06b6d4', 4, true, false, true, false),
    (NEW.id, 'ready', 'Prêt', '#10b981', 5, true, false, true, true),
    (NEW.id, 'cancelled', 'Annulé', '#ef4444', 6, true, false, false, true);
  RETURN NEW;
END;
$$;

-- 2. Trigger types en SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.add_default_sav_types_to_new_shop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.shop_sav_types (shop_id, type_key, type_label, type_color, display_order, is_default)
  VALUES 
    (NEW.id, 'internal', 'SAV INTERNE', '#3b82f6', 1, true),
    (NEW.id, 'external', 'SAV EXTERNE', '#10b981', 2, true);
  RETURN NEW;
END;
$$;

-- 3. Remplacer la politique INSERT profiles recursive
DROP POLICY IF EXISTS "New users and admins can create profiles" ON profiles;
CREATE POLICY "New users and admins can create profiles" ON profiles
FOR INSERT TO authenticated
WITH CHECK (
  (user_id = auth.uid() AND get_current_user_shop_id() IS NULL)
  OR is_shop_admin()
  OR is_super_admin()
);
