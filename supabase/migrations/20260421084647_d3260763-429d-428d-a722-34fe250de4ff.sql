
-- 1. Create part_categories table
CREATE TABLE IF NOT EXISTS public.part_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, name)
);

CREATE INDEX IF NOT EXISTS idx_part_categories_shop_id ON public.part_categories(shop_id);

ALTER TABLE public.part_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view their categories"
  ON public.part_categories FOR SELECT
  USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE POLICY "Authorized members can insert categories"
  ON public.part_categories FOR INSERT
  WITH CHECK (
    (shop_id = public.get_current_user_shop_id()
     AND public.has_shop_role_permission(shop_id, 'settings_part_categories'))
    OR public.is_super_admin()
  );

CREATE POLICY "Authorized members can update categories"
  ON public.part_categories FOR UPDATE
  USING (
    (shop_id = public.get_current_user_shop_id()
     AND public.has_shop_role_permission(shop_id, 'settings_part_categories'))
    OR public.is_super_admin()
  );

CREATE POLICY "Authorized members can delete categories"
  ON public.part_categories FOR DELETE
  USING (
    (shop_id = public.get_current_user_shop_id()
     AND public.has_shop_role_permission(shop_id, 'settings_part_categories'))
    OR public.is_super_admin()
  );

CREATE TRIGGER trg_part_categories_updated_at
  BEFORE UPDATE ON public.part_categories
  FOR EACH ROW EXECUTE FUNCTION public.inventory_set_updated_at();

-- 2. Add category_id column to parts
ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.part_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parts_category_id ON public.parts(category_id);

-- 3. Add category_filter column to inventory_sessions
ALTER TABLE public.inventory_sessions
  ADD COLUMN IF NOT EXISTS category_filter jsonb;

-- 4. Update default_role_permissions to include settings_part_categories
UPDATE public.default_role_permissions
SET permissions = permissions || jsonb_build_object('settings_part_categories', true)
WHERE role = 'admin' AND NOT (permissions ? 'settings_part_categories');

UPDATE public.default_role_permissions
SET permissions = permissions || jsonb_build_object('settings_part_categories', false)
WHERE role IN ('technician', 'shop_admin') AND NOT (permissions ? 'settings_part_categories');

-- 5. Update existing shop_role_permissions
UPDATE public.shop_role_permissions
SET permissions = permissions || jsonb_build_object('settings_part_categories', true)
WHERE role = 'admin' AND NOT (permissions ? 'settings_part_categories');

UPDATE public.shop_role_permissions
SET permissions = permissions || jsonb_build_object('settings_part_categories', false)
WHERE role IN ('technician', 'shop_admin') AND NOT (permissions ? 'settings_part_categories');

-- 6. Update has_shop_role_permission fallback for new permission
CREATE OR REPLACE FUNCTION public.has_shop_role_permission(_shop_id uuid, _permission text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _profile_role text;
  _shop_permission jsonb;
  _default_permission jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.role::text INTO _profile_role
  FROM public.profiles p
  WHERE p.user_id = auth.uid() AND p.shop_id = _shop_id
  LIMIT 1;

  IF _profile_role IS NULL THEN RETURN false; END IF;
  IF _profile_role = 'super_admin' THEN RETURN true; END IF;

  SELECT srp.permissions INTO _shop_permission
  FROM public.shop_role_permissions srp
  WHERE srp.shop_id = _shop_id AND srp.role = _profile_role
  LIMIT 1;

  IF _shop_permission ? _permission THEN
    RETURN COALESCE((_shop_permission ->> _permission)::boolean, false);
  END IF;

  SELECT drp.permissions INTO _default_permission
  FROM public.default_role_permissions drp
  WHERE drp.role = _profile_role
  LIMIT 1;

  IF _default_permission ? _permission THEN
    RETURN COALESCE((_default_permission ->> _permission)::boolean, false);
  END IF;

  IF _permission = 'settings_inventory' THEN RETURN _profile_role = 'admin'; END IF;
  IF _permission = 'inventory_apply_stock' THEN RETURN _profile_role = 'admin'; END IF;
  IF _permission = 'settings_part_categories' THEN RETURN _profile_role = 'admin'; END IF;

  RETURN false;
END;
$function$;

-- 7. Update begin_inventory_session to accept category filter
CREATE OR REPLACE FUNCTION public.begin_inventory_session(
  _name text,
  _mode text DEFAULT 'assisted',
  _notes text DEFAULT NULL,
  _category_ids uuid[] DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _shop_id uuid;
  _profile_id uuid;
  _full_name text;
  _session_id uuid;
  _category_filter jsonb;
BEGIN
  _shop_id := public.get_current_user_shop_id();
  IF _shop_id IS NULL THEN RAISE EXCEPTION 'Aucune boutique active'; END IF;

  IF NOT public.has_shop_role_permission(_shop_id, 'settings_inventory') THEN
    RAISE EXCEPTION 'Accès inventaire non autorisé';
  END IF;

  IF _mode NOT IN ('assisted', 'scan', 'manual') THEN
    RAISE EXCEPTION 'Mode d''inventaire invalide';
  END IF;

  SELECT p.id, TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
  INTO _profile_id, _full_name
  FROM public.profiles p
  WHERE p.user_id = auth.uid() AND p.shop_id = _shop_id
  LIMIT 1;

  IF _category_ids IS NOT NULL AND array_length(_category_ids, 1) > 0 THEN
    _category_filter := to_jsonb(_category_ids);
  ELSE
    _category_filter := NULL;
  END IF;

  INSERT INTO public.inventory_sessions (
    shop_id, created_by_profile_id, created_by_name,
    name, mode, status, notes, started_at, category_filter
  )
  VALUES (
    _shop_id, _profile_id, NULLIF(_full_name, ''),
    COALESCE(NULLIF(BTRIM(_name), ''), 'Inventaire ' || to_char(now(), 'DD/MM/YYYY HH24:MI')),
    _mode, 'in_progress', NULLIF(BTRIM(_notes), ''), now(), _category_filter
  )
  RETURNING id INTO _session_id;

  INSERT INTO public.inventory_session_items (
    inventory_session_id, shop_id, part_id, position,
    part_name, part_reference, part_sku, part_supplier,
    unit_cost, expected_quantity, counted_quantity, line_status
  )
  SELECT
    _session_id, p.shop_id, p.id,
    ROW_NUMBER() OVER (ORDER BY p.name, p.reference, p.id),
    p.name, p.reference, p.sku, p.supplier,
    COALESCE(p.purchase_price, 0),
    COALESCE(p.quantity, 0),
    NULL, 'pending'
  FROM public.parts p
  WHERE p.shop_id = _shop_id
    AND (
      _category_ids IS NULL
      OR array_length(_category_ids, 1) IS NULL
      OR p.category_id = ANY(_category_ids)
    )
  ORDER BY p.name, p.reference, p.id;

  INSERT INTO public.inventory_audit_logs (
    shop_id, inventory_session_id, action, new_value,
    changed_by_profile_id, changed_by_name, metadata
  )
  VALUES (
    _shop_id, _session_id, 'session_created', _mode,
    _profile_id, COALESCE(NULLIF(_full_name, ''), 'Utilisateur'),
    jsonb_build_object('mode', _mode, 'category_filter', _category_filter)
  );

  PERFORM public.recalculate_inventory_session_totals(_session_id);

  RETURN _session_id;
END;
$function$;
