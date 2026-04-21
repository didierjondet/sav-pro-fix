CREATE OR REPLACE FUNCTION public.inventory_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_shop_role_permission(_shop_id uuid, _permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile_role text;
  _shop_permission jsonb;
  _default_permission jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.role::text
  INTO _profile_role
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
    AND p.shop_id = _shop_id
  LIMIT 1;

  IF _profile_role IS NULL THEN
    RETURN false;
  END IF;

  IF _profile_role = 'super_admin' THEN
    RETURN true;
  END IF;

  SELECT srp.permissions
  INTO _shop_permission
  FROM public.shop_role_permissions srp
  WHERE srp.shop_id = _shop_id
    AND srp.role = _profile_role
  LIMIT 1;

  IF _shop_permission ? _permission THEN
    RETURN COALESCE((_shop_permission ->> _permission)::boolean, false);
  END IF;

  SELECT drp.permissions
  INTO _default_permission
  FROM public.default_role_permissions drp
  WHERE drp.role = _profile_role
  LIMIT 1;

  IF _default_permission ? _permission THEN
    RETURN COALESCE((_default_permission ->> _permission)::boolean, false);
  END IF;

  IF _permission = 'settings_inventory' THEN
    RETURN _profile_role = 'admin';
  ELSIF _permission = 'inventory_apply_stock' THEN
    RETURN _profile_role = 'admin';
  END IF;

  RETURN false;
END;
$$;

CREATE TABLE public.inventory_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  created_by_profile_id uuid,
  created_by_name text,
  name text NOT NULL,
  mode text NOT NULL DEFAULT 'assisted',
  status text NOT NULL DEFAULT 'draft',
  notes text,
  forced_stop boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  applied_at timestamptz,
  total_items integer NOT NULL DEFAULT 0,
  counted_items integer NOT NULL DEFAULT 0,
  found_items integer NOT NULL DEFAULT 0,
  missing_items integer NOT NULL DEFAULT 0,
  expected_total_cost numeric NOT NULL DEFAULT 0,
  counted_total_cost numeric NOT NULL DEFAULT 0,
  missing_total_cost numeric NOT NULL DEFAULT 0,
  variance_total_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_sessions_mode_check CHECK (mode IN ('assisted', 'scan', 'manual')),
  CONSTRAINT inventory_sessions_status_check CHECK (status IN ('draft', 'in_progress', 'paused', 'completed', 'applied', 'cancelled')),
  CONSTRAINT inventory_sessions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
  CONSTRAINT inventory_sessions_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_inventory_sessions_shop_status ON public.inventory_sessions(shop_id, status, created_at DESC);
CREATE INDEX idx_inventory_sessions_shop_mode ON public.inventory_sessions(shop_id, mode);

CREATE TABLE public.inventory_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_session_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  part_id uuid,
  position integer NOT NULL DEFAULT 0,
  part_name text NOT NULL,
  part_reference text,
  part_sku text,
  part_supplier text,
  unit_cost numeric NOT NULL DEFAULT 0,
  expected_quantity integer NOT NULL DEFAULT 0,
  counted_quantity integer,
  variance_quantity integer NOT NULL DEFAULT 0,
  variance_value numeric NOT NULL DEFAULT 0,
  line_status text NOT NULL DEFAULT 'pending',
  entry_method text,
  is_missing boolean NOT NULL DEFAULT false,
  last_scanned_code text,
  scan_count integer NOT NULL DEFAULT 0,
  counted_at timestamptz,
  applied_previous_quantity integer,
  applied_new_quantity integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_session_items_inventory_session_id_fkey FOREIGN KEY (inventory_session_id) REFERENCES public.inventory_sessions(id) ON DELETE CASCADE,
  CONSTRAINT inventory_session_items_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
  CONSTRAINT inventory_session_items_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id) ON DELETE SET NULL,
  CONSTRAINT inventory_session_items_line_status_check CHECK (line_status IN ('pending', 'found', 'missing', 'adjusted', 'skipped', 'applied')),
  CONSTRAINT inventory_session_items_entry_method_check CHECK (entry_method IS NULL OR entry_method IN ('assisted', 'scan', 'manual')),
  CONSTRAINT inventory_session_items_expected_quantity_check CHECK (expected_quantity >= 0),
  CONSTRAINT inventory_session_items_counted_quantity_check CHECK (counted_quantity IS NULL OR counted_quantity >= 0),
  CONSTRAINT inventory_session_items_scan_count_check CHECK (scan_count >= 0)
);

CREATE INDEX idx_inventory_session_items_session ON public.inventory_session_items(inventory_session_id, position);
CREATE INDEX idx_inventory_session_items_shop ON public.inventory_session_items(shop_id, line_status);
CREATE INDEX idx_inventory_session_items_part_sku ON public.inventory_session_items(part_sku);
CREATE INDEX idx_inventory_session_items_part_id ON public.inventory_session_items(part_id);

CREATE TABLE public.inventory_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  inventory_session_id uuid NOT NULL,
  inventory_session_item_id uuid,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_by_profile_id uuid,
  changed_by_name text NOT NULL DEFAULT 'Système',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_audit_logs_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
  CONSTRAINT inventory_audit_logs_inventory_session_id_fkey FOREIGN KEY (inventory_session_id) REFERENCES public.inventory_sessions(id) ON DELETE CASCADE,
  CONSTRAINT inventory_audit_logs_inventory_session_item_id_fkey FOREIGN KEY (inventory_session_item_id) REFERENCES public.inventory_session_items(id) ON DELETE SET NULL,
  CONSTRAINT inventory_audit_logs_changed_by_profile_id_fkey FOREIGN KEY (changed_by_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_inventory_audit_logs_session_created_at ON public.inventory_audit_logs(inventory_session_id, created_at DESC);
CREATE INDEX idx_inventory_audit_logs_shop_created_at ON public.inventory_audit_logs(shop_id, created_at DESC);

CREATE TRIGGER set_inventory_sessions_updated_at
BEFORE UPDATE ON public.inventory_sessions
FOR EACH ROW
EXECUTE FUNCTION public.inventory_set_updated_at();

CREATE TRIGGER set_inventory_session_items_updated_at
BEFORE UPDATE ON public.inventory_session_items
FOR EACH ROW
EXECUTE FUNCTION public.inventory_set_updated_at();

ALTER TABLE public.inventory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory viewers can see sessions"
ON public.inventory_sessions
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR (
    shop_id = public.get_current_user_shop_id()
    AND public.has_shop_role_permission(shop_id, 'settings_inventory')
  )
);

CREATE POLICY "Inventory managers can create sessions"
ON public.inventory_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (
    shop_id = public.get_current_user_shop_id()
    AND public.has_shop_role_permission(shop_id, 'settings_inventory')
  )
);

CREATE POLICY "Inventory managers can update sessions"
ON public.inventory_sessions
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR (
    shop_id = public.get_current_user_shop_id()
    AND public.has_shop_role_permission(shop_id, 'settings_inventory')
  )
)
WITH CHECK (
  is_super_admin()
  OR (
    shop_id = public.get_current_user_shop_id()
    AND public.has_shop_role_permission(shop_id, 'settings_inventory')
  )
);

CREATE POLICY "Inventory managers can delete draft sessions"
ON public.inventory_sessions
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR (
    shop_id = public.get_current_user_shop_id()
    AND status IN ('draft', 'cancelled')
    AND public.has_shop_role_permission(shop_id, 'settings_inventory')
  )
);

CREATE POLICY "Inventory viewers can see session items"
ON public.inventory_session_items
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR (
    shop_id = public.get_current_user_shop_id()
    AND public.has_shop_role_permission(shop_id, 'settings_inventory')
  )
);

CREATE POLICY "Inventory managers can create session items"
ON public.inventory_session_items
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (
    shop_id = public.get_current_user_shop_id()
    AND public.has_shop_role_permission(shop_id, 'settings_inventory')
  )
);

CREATE POLICY "Inventory managers can update session items"
ON public.inventory_session_items
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR (
    shop_id = public.get_current_user_shop_id()
    AND public.has_shop_role_permission(shop_id, 'settings_inventory')
  )
)
WITH CHECK (
  is_super_admin()
  OR (
    shop_id = public.get_current_user_shop_id()
    AND public.has_shop_role_permission(shop_id, 'settings_inventory')
  )
);

CREATE POLICY "Inventory managers can delete session items"
ON public.inventory_session_items
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR (
    shop_id = public.get_current_user_shop_id()
    AND public.has_shop_role_permission(shop_id, 'settings_inventory')
  )
);

CREATE POLICY "Inventory viewers can see audit logs"
ON public.inventory_audit_logs
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR (
    shop_id = public.get_current_user_shop_id()
    AND public.has_shop_role_permission(shop_id, 'settings_inventory')
  )
);

CREATE POLICY "Inventory managers can create audit logs"
ON public.inventory_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (
    shop_id = public.get_current_user_shop_id()
    AND public.has_shop_role_permission(shop_id, 'settings_inventory')
  )
);

CREATE OR REPLACE FUNCTION public.recalculate_inventory_session_totals(_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_id uuid;
BEGIN
  SELECT shop_id INTO _shop_id
  FROM public.inventory_sessions
  WHERE id = _session_id;

  IF _shop_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.inventory_sessions s
  SET
    total_items = agg.total_items,
    counted_items = agg.counted_items,
    found_items = agg.found_items,
    missing_items = agg.missing_items,
    expected_total_cost = agg.expected_total_cost,
    counted_total_cost = agg.counted_total_cost,
    missing_total_cost = agg.missing_total_cost,
    variance_total_cost = agg.variance_total_cost,
    updated_at = now()
  FROM (
    SELECT
      inventory_session_id,
      COUNT(*)::integer AS total_items,
      COUNT(*) FILTER (WHERE line_status <> 'pending')::integer AS counted_items,
      COUNT(*) FILTER (WHERE line_status IN ('found', 'adjusted', 'applied'))::integer AS found_items,
      COUNT(*) FILTER (WHERE line_status = 'missing')::integer AS missing_items,
      COALESCE(SUM(unit_cost * expected_quantity), 0) AS expected_total_cost,
      COALESCE(SUM(unit_cost * COALESCE(counted_quantity, 0)), 0) AS counted_total_cost,
      COALESCE(SUM(unit_cost * CASE WHEN line_status = 'missing' THEN expected_quantity ELSE 0 END), 0) AS missing_total_cost,
      COALESCE(SUM(variance_value), 0) AS variance_total_cost
    FROM public.inventory_session_items
    WHERE inventory_session_id = _session_id
    GROUP BY inventory_session_id
  ) agg
  WHERE s.id = agg.inventory_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_inventory_item_derived_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.variance_quantity = COALESCE(NEW.counted_quantity, 0) - COALESCE(NEW.expected_quantity, 0);
  NEW.variance_value = COALESCE(NEW.unit_cost, 0) * (COALESCE(NEW.counted_quantity, 0) - COALESCE(NEW.expected_quantity, 0));
  NEW.is_missing = (NEW.line_status = 'missing');

  IF NEW.line_status IN ('found', 'adjusted', 'missing', 'applied') AND NEW.counted_at IS NULL THEN
    NEW.counted_at = now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_inventory_item_derived_fields_trigger
BEFORE INSERT OR UPDATE ON public.inventory_session_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_item_derived_fields();

CREATE OR REPLACE FUNCTION public.after_inventory_item_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_inventory_session_totals(COALESCE(NEW.inventory_session_id, OLD.inventory_session_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER inventory_item_after_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_session_items
FOR EACH ROW
EXECUTE FUNCTION public.after_inventory_item_change();

CREATE OR REPLACE FUNCTION public.begin_inventory_session(_name text, _mode text DEFAULT 'assisted', _notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_id uuid;
  _profile_id uuid;
  _full_name text;
  _session_id uuid;
BEGIN
  _shop_id := public.get_current_user_shop_id();

  IF _shop_id IS NULL THEN
    RAISE EXCEPTION 'Aucune boutique active';
  END IF;

  IF NOT public.has_shop_role_permission(_shop_id, 'settings_inventory') THEN
    RAISE EXCEPTION 'Accès inventaire non autorisé';
  END IF;

  IF _mode NOT IN ('assisted', 'scan', 'manual') THEN
    RAISE EXCEPTION 'Mode d''inventaire invalide';
  END IF;

  SELECT p.id, TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
  INTO _profile_id, _full_name
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
    AND p.shop_id = _shop_id
  LIMIT 1;

  INSERT INTO public.inventory_sessions (
    shop_id,
    created_by_profile_id,
    created_by_name,
    name,
    mode,
    status,
    notes,
    started_at
  )
  VALUES (
    _shop_id,
    _profile_id,
    NULLIF(_full_name, ''),
    COALESCE(NULLIF(BTRIM(_name), ''), 'Inventaire ' || to_char(now(), 'DD/MM/YYYY HH24:MI')),
    _mode,
    'in_progress',
    NULLIF(BTRIM(_notes), ''),
    now()
  )
  RETURNING id INTO _session_id;

  INSERT INTO public.inventory_session_items (
    inventory_session_id,
    shop_id,
    part_id,
    position,
    part_name,
    part_reference,
    part_sku,
    part_supplier,
    unit_cost,
    expected_quantity,
    counted_quantity,
    line_status
  )
  SELECT
    _session_id,
    p.shop_id,
    p.id,
    ROW_NUMBER() OVER (ORDER BY p.name, p.reference, p.id),
    p.name,
    p.reference,
    p.sku,
    p.supplier,
    COALESCE(p.purchase_price, 0),
    COALESCE(p.quantity, 0),
    NULL,
    'pending'
  FROM public.parts p
  WHERE p.shop_id = _shop_id
  ORDER BY p.name, p.reference, p.id;

  INSERT INTO public.inventory_audit_logs (
    shop_id,
    inventory_session_id,
    action,
    new_value,
    changed_by_profile_id,
    changed_by_name,
    metadata
  )
  VALUES (
    _shop_id,
    _session_id,
    'session_created',
    _mode,
    _profile_id,
    COALESCE(NULLIF(_full_name, ''), 'Utilisateur'),
    jsonb_build_object('mode', _mode)
  );

  PERFORM public.recalculate_inventory_session_totals(_session_id);

  RETURN _session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_inventory_session(_session_id uuid)
RETURNS TABLE(updated_rows integer, missing_rows integer, blocked_reserved_rows integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session public.inventory_sessions%ROWTYPE;
  _profile_id uuid;
  _full_name text;
  _blocked_reserved_rows integer := 0;
BEGIN
  SELECT *
  INTO _session
  FROM public.inventory_sessions
  WHERE id = _session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventaire introuvable';
  END IF;

  IF _session.shop_id <> public.get_current_user_shop_id() AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Inventaire hors boutique';
  END IF;

  IF NOT public.has_shop_role_permission(_session.shop_id, 'inventory_apply_stock') THEN
    RAISE EXCEPTION 'Validation d''inventaire non autorisée';
  END IF;

  IF _session.status = 'applied' THEN
    RAISE EXCEPTION 'Inventaire déjà appliqué';
  END IF;

  SELECT p.id, TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
  INTO _profile_id, _full_name
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
    AND p.shop_id = _session.shop_id
  LIMIT 1;

  SELECT COUNT(*)::integer
  INTO _blocked_reserved_rows
  FROM public.inventory_session_items isi
  JOIN public.parts part ON part.id = isi.part_id
  WHERE isi.inventory_session_id = _session_id
    AND COALESCE(isi.counted_quantity, 0) < COALESCE(part.reserved_quantity, 0);

  UPDATE public.inventory_session_items isi
  SET
    applied_previous_quantity = part.quantity,
    applied_new_quantity = COALESCE(isi.counted_quantity, 0),
    line_status = CASE WHEN isi.line_status = 'pending' THEN 'missing' ELSE 'applied' END,
    counted_quantity = COALESCE(isi.counted_quantity, 0),
    counted_at = COALESCE(isi.counted_at, now()),
    updated_at = now()
  FROM public.parts part
  WHERE isi.inventory_session_id = _session_id
    AND isi.part_id = part.id;

  UPDATE public.parts part
  SET
    quantity = COALESCE(isi.counted_quantity, 0),
    updated_at = now()
  FROM public.inventory_session_items isi
  WHERE isi.inventory_session_id = _session_id
    AND isi.part_id = part.id;

  UPDATE public.inventory_sessions
  SET
    status = 'applied',
    completed_at = COALESCE(completed_at, now()),
    applied_at = now(),
    updated_at = now()
  WHERE id = _session_id;

  INSERT INTO public.inventory_audit_logs (
    shop_id,
    inventory_session_id,
    inventory_session_item_id,
    action,
    field_name,
    old_value,
    new_value,
    changed_by_profile_id,
    changed_by_name,
    metadata
  )
  SELECT
    _session.shop_id,
    isi.inventory_session_id,
    isi.id,
    'stock_applied',
    'quantity',
    COALESCE(isi.applied_previous_quantity, 0)::text,
    COALESCE(isi.applied_new_quantity, 0)::text,
    _profile_id,
    COALESCE(NULLIF(_full_name, ''), 'Utilisateur'),
    jsonb_build_object(
      'part_id', isi.part_id,
      'part_name', isi.part_name,
      'reserved_quantity', COALESCE(part.reserved_quantity, 0)
    )
  FROM public.inventory_session_items isi
  LEFT JOIN public.parts part ON part.id = isi.part_id
  WHERE isi.inventory_session_id = _session_id;

  INSERT INTO public.inventory_audit_logs (
    shop_id,
    inventory_session_id,
    action,
    old_value,
    new_value,
    changed_by_profile_id,
    changed_by_name,
    metadata
  )
  VALUES (
    _session.shop_id,
    _session_id,
    'session_applied',
    _session.status,
    'applied',
    _profile_id,
    COALESCE(NULLIF(_full_name, ''), 'Utilisateur'),
    jsonb_build_object('blocked_reserved_rows', _blocked_reserved_rows)
  );

  PERFORM public.recalculate_inventory_session_totals(_session_id);

  RETURN QUERY
  SELECT
    COUNT(*)::integer AS updated_rows,
    COUNT(*) FILTER (WHERE line_status = 'missing')::integer AS missing_rows,
    _blocked_reserved_rows AS blocked_reserved_rows
  FROM public.inventory_session_items
  WHERE inventory_session_id = _session_id;
END;
$$;