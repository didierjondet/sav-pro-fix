
-- 1. Trigger: release reservations when a SAV reaches a final status
CREATE OR REPLACE FUNCTION public.release_part_reservations_on_final_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_old_final boolean := false;
  is_new_final boolean := false;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Built-in final statuses
  IF OLD.status IN ('ready','delivered','cancelled') THEN is_old_final := true; END IF;
  IF NEW.status IN ('ready','delivered','cancelled') THEN is_new_final := true; END IF;

  -- Custom final statuses for this shop
  IF NOT is_old_final THEN
    SELECT COALESCE(BOOL_OR(is_final_status), false) INTO is_old_final
    FROM public.shop_sav_statuses
    WHERE shop_id = NEW.shop_id AND status_key = OLD.status;
  END IF;
  IF NOT is_new_final THEN
    SELECT COALESCE(BOOL_OR(is_final_status), false) INTO is_new_final
    FROM public.shop_sav_statuses
    WHERE shop_id = NEW.shop_id AND status_key = NEW.status;
  END IF;

  IF NOT is_old_final AND is_new_final THEN
    UPDATE public.parts p
    SET reserved_quantity = GREATEST(0, p.reserved_quantity - sp.quantity)
    FROM public.sav_parts sp
    WHERE sp.sav_case_id = NEW.id
      AND sp.part_id = p.id;
  ELSIF is_old_final AND NOT is_new_final THEN
    -- Reopening: re-add reservations
    UPDATE public.parts p
    SET reserved_quantity = GREATEST(0, p.reserved_quantity + sp.quantity)
    FROM public.sav_parts sp
    WHERE sp.sav_case_id = NEW.id
      AND sp.part_id = p.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_part_reservations_on_final_status ON public.sav_cases;
CREATE TRIGGER trg_release_part_reservations_on_final_status
BEFORE UPDATE OF status ON public.sav_cases
FOR EACH ROW
EXECUTE FUNCTION public.release_part_reservations_on_final_status();

-- 2. Recalculate reservations from scratch for a shop (or all if NULL)
CREATE OR REPLACE FUNCTION public.recalculate_part_reservations(p_shop_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  -- Admin/super-admin gate when scoping to a shop via UI button
  IF p_shop_id IS NOT NULL THEN
    IF NOT (public.is_super_admin() OR (public.get_current_user_shop_id() = p_shop_id AND public.is_shop_admin())) THEN
      RAISE EXCEPTION 'Accès refusé';
    END IF;
  END IF;

  WITH expected AS (
    SELECT p.id AS part_id,
           p.shop_id,
           COALESCE(SUM(sp.quantity), 0)::int AS expected
    FROM public.parts p
    LEFT JOIN public.sav_parts sp ON sp.part_id = p.id
    LEFT JOIN public.sav_cases sc ON sc.id = sp.sav_case_id
    LEFT JOIN public.shop_sav_statuses sss
      ON sss.shop_id = sc.shop_id AND sss.status_key = sc.status
    WHERE (p_shop_id IS NULL OR p.shop_id = p_shop_id)
      AND (
        sp.id IS NULL
        OR (
          sc.status NOT IN ('ready','delivered','cancelled')
          AND COALESCE(sss.is_final_status, false) = false
        )
      )
    GROUP BY p.id, p.shop_id
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

-- 3. List ghost reserved parts for a shop
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
    SELECT p.id AS part_id,
           COALESCE(SUM(sp.quantity) FILTER (
             WHERE sc.status NOT IN ('ready','delivered','cancelled')
               AND COALESCE(sss.is_final_status, false) = false
           ), 0)::int AS expected
    FROM public.parts p
    LEFT JOIN public.sav_parts sp ON sp.part_id = p.id
    LEFT JOIN public.sav_cases sc ON sc.id = sp.sav_case_id
    LEFT JOIN public.shop_sav_statuses sss
      ON sss.shop_id = sc.shop_id AND sss.status_key = sc.status
    WHERE p.shop_id = p_shop_id
    GROUP BY p.id
  )
  SELECT p.id, p.name, p.reference, p.sku,
         COALESCE(p.reserved_quantity, 0) AS reserved_quantity,
         e.expected AS expected_reserved,
         (COALESCE(p.reserved_quantity, 0) - e.expected) AS ghost_units
  FROM public.parts p
  JOIN expected e ON e.part_id = p.id
  WHERE COALESCE(p.reserved_quantity, 0) > e.expected
  ORDER BY (COALESCE(p.reserved_quantity, 0) - e.expected) DESC, p.name;
END;
$$;

-- 4. One-shot cleanup of currently existing ghost reservations
SELECT public.recalculate_part_reservations(NULL);
