
-- 1. Helper: is a status final for a given shop?
CREATE OR REPLACE FUNCTION public.is_final_sav_status(p_shop_id uuid, p_status text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_status IN ('ready','delivered','cancelled')
    OR EXISTS (
      SELECT 1 FROM public.shop_sav_statuses
      WHERE shop_id = p_shop_id AND status_key = p_status AND is_final_status = true
    );
$$;

-- 2. Updated trigger: release/restore reservations on final status transitions
CREATE OR REPLACE FUNCTION public.release_part_reservations_on_final_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_final boolean;
  is_now_final boolean;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  was_final := public.is_final_sav_status(NEW.shop_id, OLD.status);
  is_now_final := public.is_final_sav_status(NEW.shop_id, NEW.status);

  IF NOT was_final AND is_now_final THEN
    UPDATE public.parts p
    SET reserved_quantity = GREATEST(0, COALESCE(p.reserved_quantity,0) - sp.quantity)
    FROM public.sav_parts sp
    WHERE sp.sav_case_id = NEW.id AND sp.part_id = p.id;
  ELSIF was_final AND NOT is_now_final THEN
    UPDATE public.parts p
    SET reserved_quantity = GREATEST(0, COALESCE(p.reserved_quantity,0) + sp.quantity)
    FROM public.sav_parts sp
    WHERE sp.sav_case_id = NEW.id AND sp.part_id = p.id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Fix sav_parts trigger: do not reserve when SAV is already in a final status
CREATE OR REPLACE FUNCTION public.handle_sav_part_stock_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
  v_status text;
  v_final boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.part_id IS NOT NULL THEN
      SELECT shop_id, status INTO v_shop_id, v_status FROM public.sav_cases WHERE id = NEW.sav_case_id;
      v_final := v_shop_id IS NOT NULL AND public.is_final_sav_status(v_shop_id, v_status);
      IF NOT v_final THEN
        UPDATE public.parts
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity,0) + NEW.quantity)
        WHERE id = NEW.part_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.part_id IS NOT NULL THEN
      SELECT shop_id, status INTO v_shop_id, v_status FROM public.sav_cases WHERE id = OLD.sav_case_id;
      v_final := v_shop_id IS NOT NULL AND public.is_final_sav_status(v_shop_id, v_status);
      IF NOT v_final THEN
        UPDATE public.parts
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity,0) - OLD.quantity)
        WHERE id = OLD.part_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.part_id IS DISTINCT FROM NEW.part_id OR OLD.quantity IS DISTINCT FROM NEW.quantity THEN
      SELECT shop_id, status INTO v_shop_id, v_status FROM public.sav_cases WHERE id = NEW.sav_case_id;
      v_final := v_shop_id IS NOT NULL AND public.is_final_sav_status(v_shop_id, v_status);
      IF NOT v_final THEN
        IF OLD.part_id IS NOT NULL THEN
          UPDATE public.parts
          SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity,0) - OLD.quantity)
          WHERE id = OLD.part_id;
        END IF;
        IF NEW.part_id IS NOT NULL THEN
          UPDATE public.parts
          SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity,0) + NEW.quantity)
          WHERE id = NEW.part_id;
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Fixed recalculation: forces ALL parts (including those with no open SAV) to expected value
CREATE OR REPLACE FUNCTION public.recalculate_part_reservations(p_shop_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  IF p_shop_id IS NOT NULL THEN
    IF NOT (public.is_super_admin() OR (public.get_current_user_shop_id() = p_shop_id AND public.is_shop_admin())) THEN
      RAISE EXCEPTION 'Accès refusé';
    END IF;
  END IF;

  WITH expected AS (
    SELECT
      p.id AS part_id,
      COALESCE((
        SELECT SUM(sp.quantity)
        FROM public.sav_parts sp
        JOIN public.sav_cases sc ON sc.id = sp.sav_case_id
        WHERE sp.part_id = p.id
          AND NOT public.is_final_sav_status(sc.shop_id, sc.status)
      ), 0)::int AS expected
    FROM public.parts p
    WHERE (p_shop_id IS NULL OR p.shop_id = p_shop_id)
  ), upd AS (
    UPDATE public.parts p
    SET reserved_quantity = e.expected
    FROM expected e
    WHERE p.id = e.part_id
      AND COALESCE(p.reserved_quantity, 0) IS DISTINCT FROM e.expected
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_updated FROM upd;

  RETURN jsonb_build_object('updated_parts', v_updated);
END;
$$;

-- 5. Replace ghost listing using shared helper
CREATE OR REPLACE FUNCTION public.list_ghost_reserved_parts(p_shop_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  reference text,
  sku text,
  reserved_quantity integer,
  expected_reserved integer,
  ghost_units integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin() OR public.get_current_user_shop_id() = p_shop_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN QUERY
  WITH expected AS (
    SELECT
      p.id AS part_id,
      COALESCE((
        SELECT SUM(sp.quantity)
        FROM public.sav_parts sp
        JOIN public.sav_cases sc ON sc.id = sp.sav_case_id
        WHERE sp.part_id = p.id
          AND NOT public.is_final_sav_status(sc.shop_id, sc.status)
      ), 0)::int AS expected
    FROM public.parts p
    WHERE p.shop_id = p_shop_id
  )
  SELECT p.id, p.name, p.reference, p.sku,
         COALESCE(p.reserved_quantity,0)::int,
         e.expected,
         (COALESCE(p.reserved_quantity,0) - e.expected)::int AS ghost_units
  FROM public.parts p
  JOIN expected e ON e.part_id = p.id
  WHERE COALESCE(p.reserved_quantity,0) > e.expected
  ORDER BY (COALESCE(p.reserved_quantity,0) - e.expected) DESC, p.name;
END;
$$;

-- 6. Full audit of reservations (reserved > 0 OR ghost > 0), with the open SAVs that justify them
CREATE OR REPLACE FUNCTION public.audit_part_reservations(p_shop_id uuid)
RETURNS TABLE(
  part_id uuid,
  name text,
  reference text,
  sku text,
  quantity integer,
  reserved_quantity integer,
  expected_reserved integer,
  ghost_units integer,
  open_sav_count integer,
  open_savs jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin() OR public.get_current_user_shop_id() = p_shop_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN QUERY
  WITH open_links AS (
    SELECT sp.part_id, sp.quantity AS qty, sc.id AS sav_id, sc.case_number, sc.status, sc.sav_type,
           sc.device_brand, sc.device_model, sc.created_at
    FROM public.sav_parts sp
    JOIN public.sav_cases sc ON sc.id = sp.sav_case_id
    WHERE sc.shop_id = p_shop_id
      AND NOT public.is_final_sav_status(sc.shop_id, sc.status)
  ), agg AS (
    SELECT part_id,
           SUM(qty)::int AS expected,
           COUNT(DISTINCT sav_id)::int AS sav_count,
           jsonb_agg(jsonb_build_object(
             'case_number', case_number, 'status', status, 'sav_type', sav_type,
             'device_brand', device_brand, 'device_model', device_model,
             'created_at', created_at, 'quantity', qty
           ) ORDER BY created_at DESC) AS savs
    FROM open_links GROUP BY part_id
  )
  SELECT p.id, p.name, p.reference, p.sku,
         COALESCE(p.quantity,0)::int,
         COALESCE(p.reserved_quantity,0)::int,
         COALESCE(a.expected,0)::int,
         (COALESCE(p.reserved_quantity,0) - COALESCE(a.expected,0))::int AS ghost_units,
         COALESCE(a.sav_count,0)::int,
         COALESCE(a.savs, '[]'::jsonb)
  FROM public.parts p
  LEFT JOIN agg a ON a.part_id = p.id
  WHERE p.shop_id = p_shop_id
    AND (COALESCE(p.reserved_quantity,0) > 0 OR COALESCE(a.expected,0) > 0)
  ORDER BY (COALESCE(p.reserved_quantity,0) - COALESCE(a.expected,0)) DESC,
           COALESCE(p.reserved_quantity,0) DESC, p.name;
END;
$$;

-- 7. List historical SAVs (any status) attached to parts that currently have ghost units
CREATE OR REPLACE FUNCTION public.list_savs_for_ghost_reserved_parts(p_shop_id uuid)
RETURNS TABLE(
  part_id uuid,
  part_name text,
  part_reference text,
  ghost_units integer,
  sav_case_id uuid,
  case_number text,
  status text,
  sav_type text,
  device_brand text,
  device_model text,
  quantity integer,
  is_final boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin() OR public.get_current_user_shop_id() = p_shop_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN QUERY
  WITH ghosts AS (
    SELECT * FROM public.list_ghost_reserved_parts(p_shop_id)
  )
  SELECT
    g.id AS part_id,
    g.name AS part_name,
    g.reference AS part_reference,
    g.ghost_units,
    sc.id AS sav_case_id,
    sc.case_number,
    sc.status,
    sc.sav_type,
    sc.device_brand,
    sc.device_model,
    sp.quantity::int,
    public.is_final_sav_status(sc.shop_id, sc.status) AS is_final,
    sc.created_at
  FROM ghosts g
  JOIN public.sav_parts sp ON sp.part_id = g.id
  JOIN public.sav_cases sc ON sc.id = sp.sav_case_id AND sc.shop_id = p_shop_id
  ORDER BY g.ghost_units DESC, g.name, sc.created_at DESC;
END;
$$;

-- 8. One-shot cleanup with the fixed logic
SELECT public.recalculate_part_reservations(NULL);
