CREATE OR REPLACE FUNCTION public.set_inventory_item_count(
  _session_id uuid,
  _item_id uuid,
  _counted_quantity integer,
  _line_status text,
  _entry_method text DEFAULT 'manual',
  _notes text DEFAULT NULL
)
RETURNS public.inventory_session_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session public.inventory_sessions%ROWTYPE;
  _row public.inventory_session_items%ROWTYPE;
BEGIN
  SELECT * INTO _session FROM public.inventory_sessions WHERE id = _session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session d''inventaire introuvable';
  END IF;

  IF _session.shop_id <> public.get_current_user_shop_id() AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Session hors boutique';
  END IF;

  IF NOT public.has_shop_role_permission(_session.shop_id, 'settings_inventory') THEN
    RAISE EXCEPTION 'Accès inventaire non autorisé';
  END IF;

  IF _session.status NOT IN ('draft', 'in_progress', 'paused') THEN
    RAISE EXCEPTION 'La session est clôturée, vous ne pouvez plus modifier les lignes';
  END IF;

  IF _line_status NOT IN ('pending', 'found', 'missing', 'adjusted', 'skipped') THEN
    RAISE EXCEPTION 'Statut de ligne invalide';
  END IF;

  IF _entry_method IS NOT NULL AND _entry_method NOT IN ('assisted', 'scan', 'manual') THEN
    RAISE EXCEPTION 'Méthode de saisie invalide';
  END IF;

  UPDATE public.inventory_session_items
  SET
    counted_quantity = _counted_quantity,
    line_status = _line_status,
    entry_method = COALESCE(_entry_method, entry_method),
    notes = _notes,
    counted_at = CASE WHEN _counted_quantity IS NULL THEN NULL ELSE now() END,
    updated_at = now()
  WHERE id = _item_id
    AND inventory_session_id = _session_id
    AND shop_id = _session.shop_id
  RETURNING * INTO _row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ligne d''inventaire introuvable pour cette session';
  END IF;

  PERFORM public.recalculate_inventory_session_totals(_session_id);

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_inventory_item_count(uuid, uuid, integer, text, text, text) TO authenticated;