CREATE TABLE public.storage_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#3b82f6',
  parent_id uuid REFERENCES public.storage_zones(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_zones TO authenticated;
GRANT ALL ON public.storage_zones TO service_role;
ALTER TABLE public.storage_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop members manage storage zones" ON public.storage_zones FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE INDEX idx_storage_zones_shop ON public.storage_zones(shop_id);
CREATE TRIGGER update_storage_zones_updated_at BEFORE UPDATE ON public.storage_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS storage_zone_id uuid REFERENCES public.storage_zones(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_parts_storage_zone ON public.parts(storage_zone_id);
ALTER TABLE public.inventory_sessions ADD COLUMN IF NOT EXISTS zone_filter jsonb;

DROP FUNCTION IF EXISTS public.begin_inventory_session(text, text, text);
DROP FUNCTION IF EXISTS public.begin_inventory_session(text, text, text, uuid[]);

CREATE FUNCTION public.begin_inventory_session(_name text, _mode text DEFAULT 'assisted', _notes text DEFAULT NULL, _category_ids uuid[] DEFAULT NULL, _zone_ids uuid[] DEFAULT NULL, _include_no_zone boolean DEFAULT false)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _shop_id uuid; _profile_id uuid; _full_name text; _session_id uuid;
  _category_filter jsonb; _zone_filter jsonb; _zone_mode boolean;
BEGIN
  _shop_id := public.get_current_user_shop_id();
  IF _shop_id IS NULL THEN RAISE EXCEPTION 'Aucune boutique active'; END IF;
  IF NOT public.has_shop_role_permission(_shop_id, 'settings_inventory') THEN
    RAISE EXCEPTION 'Accès inventaire non autorisé';
  END IF;
  IF _mode NOT IN ('assisted', 'scan', 'manual') THEN RAISE EXCEPTION 'Mode d''inventaire invalide'; END IF;

  SELECT p.id, TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
  INTO _profile_id, _full_name FROM public.profiles p
  WHERE p.user_id = auth.uid() AND p.shop_id = _shop_id LIMIT 1;

  _category_filter := CASE WHEN array_length(_category_ids, 1) > 0 THEN to_jsonb(_category_ids) END;
  _zone_mode := COALESCE(array_length(_zone_ids, 1), 0) > 0 OR COALESCE(_include_no_zone, false);
  _zone_filter := CASE WHEN _zone_mode THEN jsonb_build_object('zone_ids', COALESCE(to_jsonb(_zone_ids), '[]'::jsonb), 'include_no_zone', COALESCE(_include_no_zone, false)) END;

  INSERT INTO public.inventory_sessions (shop_id, created_by_profile_id, created_by_name, name, mode, status, notes, started_at, category_filter, zone_filter)
  VALUES (_shop_id, _profile_id, NULLIF(_full_name, ''),
    COALESCE(NULLIF(BTRIM(_name), ''), 'Inventaire ' || to_char(now(), 'DD/MM/YYYY HH24:MI')),
    _mode, 'in_progress', NULLIF(BTRIM(_notes), ''), now(), _category_filter, _zone_filter)
  RETURNING id INTO _session_id;

  INSERT INTO public.inventory_session_items (inventory_session_id, shop_id, part_id, position, part_name, part_reference, part_sku, part_supplier, unit_cost, expected_quantity, counted_quantity, line_status)
  SELECT _session_id, p.shop_id, p.id,
    ROW_NUMBER() OVER (ORDER BY z.code NULLS LAST, p.name, p.reference, p.id),
    p.name, p.reference, p.sku, p.supplier, COALESCE(p.purchase_price, 0), COALESCE(p.quantity, 0), NULL, 'pending'
  FROM public.parts p LEFT JOIN public.storage_zones z ON z.id = p.storage_zone_id
  WHERE p.shop_id = _shop_id
    AND (_category_filter IS NULL OR p.category_id = ANY(_category_ids))
    AND (NOT _zone_mode
         OR (p.storage_zone_id IS NOT NULL AND p.storage_zone_id = ANY(COALESCE(_zone_ids, '{}')))
         OR (COALESCE(_include_no_zone, false) AND p.storage_zone_id IS NULL));

  INSERT INTO public.inventory_audit_logs (shop_id, inventory_session_id, action, new_value, changed_by_profile_id, changed_by_name, metadata)
  VALUES (_shop_id, _session_id, 'session_created', _mode, _profile_id, COALESCE(NULLIF(_full_name, ''), 'Utilisateur'),
    jsonb_build_object('mode', _mode, 'category_filter', _category_filter, 'zone_filter', _zone_filter));

  PERFORM public.recalculate_inventory_session_totals(_session_id);
  RETURN _session_id;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.begin_inventory_session(text, text, text, uuid[], uuid[], boolean) TO authenticated;