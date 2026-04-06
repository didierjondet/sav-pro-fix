
-- Table des permissions par rôle par boutique
CREATE TABLE public.shop_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, role)
);

-- Table des permissions par défaut (Super Admin)
CREATE TABLE public.default_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL UNIQUE,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Trigger updated_at pour shop_role_permissions
CREATE OR REPLACE FUNCTION update_shop_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_shop_role_permissions_updated_at
BEFORE UPDATE ON public.shop_role_permissions
FOR EACH ROW EXECUTE FUNCTION update_shop_role_permissions_updated_at();

CREATE TRIGGER set_default_role_permissions_updated_at
BEFORE UPDATE ON public.default_role_permissions
FOR EACH ROW EXECUTE FUNCTION update_shop_role_permissions_updated_at();

-- RLS
ALTER TABLE public.shop_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_role_permissions ENABLE ROW LEVEL SECURITY;

-- shop_role_permissions: shop users can read their own
CREATE POLICY "Shop users can view their role permissions"
ON public.shop_role_permissions FOR SELECT
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

-- shop_role_permissions: admins can manage
CREATE POLICY "Shop admins can manage role permissions"
ON public.shop_role_permissions FOR ALL
USING (shop_id = get_current_user_shop_id() AND is_shop_admin())
WITH CHECK (shop_id = get_current_user_shop_id() AND is_shop_admin());

-- shop_role_permissions: super admins
CREATE POLICY "Super admins can manage all role permissions"
ON public.shop_role_permissions FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- default_role_permissions: everyone authenticated can read
CREATE POLICY "Authenticated users can read default role permissions"
ON public.default_role_permissions FOR SELECT
USING (auth.uid() IS NOT NULL);

-- default_role_permissions: super admins can manage
CREATE POLICY "Super admins can manage default role permissions"
ON public.default_role_permissions FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Insert default permissions for the 3 roles
INSERT INTO public.default_role_permissions (role, permissions) VALUES
('admin', '{"menu_dashboard": true, "menu_sav": true, "menu_parts": true, "menu_quotes": true, "menu_orders": true, "menu_customers": true, "menu_chats": true, "menu_agenda": true, "menu_reports": true, "menu_statistics": true, "menu_settings": true, "settings_subscription": true, "settings_sms_purchase": true, "settings_users": true, "settings_import_export": true, "sav_logs": true, "can_delete_sav": true, "can_create_quotes": true, "can_manage_stock": true, "simplified_view_default": false}'::jsonb),
('technician', '{"menu_dashboard": true, "menu_sav": true, "menu_parts": true, "menu_quotes": true, "menu_orders": true, "menu_customers": true, "menu_chats": true, "menu_agenda": true, "menu_reports": false, "menu_statistics": false, "menu_settings": true, "settings_subscription": false, "settings_sms_purchase": false, "settings_users": false, "settings_import_export": false, "sav_logs": false, "can_delete_sav": false, "can_create_quotes": true, "can_manage_stock": true, "simplified_view_default": false}'::jsonb),
('shop_admin', '{"menu_dashboard": true, "menu_sav": true, "menu_parts": true, "menu_quotes": true, "menu_orders": true, "menu_customers": true, "menu_chats": true, "menu_agenda": true, "menu_reports": true, "menu_statistics": true, "menu_settings": false, "settings_subscription": false, "settings_sms_purchase": false, "settings_users": false, "settings_import_export": false, "sav_logs": false, "can_delete_sav": false, "can_create_quotes": true, "can_manage_stock": true, "simplified_view_default": true}'::jsonb);

-- Function to copy default permissions to a new shop
CREATE OR REPLACE FUNCTION public.copy_default_role_permissions()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.shop_role_permissions (shop_id, role, permissions)
  SELECT NEW.id, drp.role, drp.permissions
  FROM public.default_role_permissions drp
  ON CONFLICT (shop_id, role) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER copy_default_permissions_on_shop_create
AFTER INSERT ON public.shops
FOR EACH ROW EXECUTE FUNCTION public.copy_default_role_permissions();
