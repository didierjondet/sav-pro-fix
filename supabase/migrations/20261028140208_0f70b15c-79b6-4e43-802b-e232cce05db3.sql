ALTER TABLE public.loaner_loans ADD COLUMN IF NOT EXISTS return_token text;
UPDATE public.loaner_loans SET return_token = encode(gen_random_bytes(18), 'hex') WHERE return_token IS NULL;
ALTER TABLE public.loaner_loans ALTER COLUMN return_token SET DEFAULT encode(gen_random_bytes(18), 'hex');
ALTER TABLE public.loaner_loans ALTER COLUMN return_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS loaner_loans_return_token_key ON public.loaner_loans(return_token);

CREATE OR REPLACE FUNCTION public.loaner_return_open(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF p_token IS NULL OR length(p_token) < 20 THEN RETURN jsonb_build_object('status','not_found'); END IF;
  SELECT l.returned_at, l.loaned_at, l.deposit_amount, e.name, e.brand, e.model, e.color, e.imei, e.serial_number
    INTO r FROM loaner_loans l JOIN loaner_equipment e ON e.id = l.equipment_id WHERE l.return_token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','not_found'); END IF;
  RETURN jsonb_build_object('status', CASE WHEN r.returned_at IS NULL THEN 'active' ELSE 'returned' END,
    'returned_at', r.returned_at, 'loaned_at', r.loaned_at, 'deposit_amount', r.deposit_amount,
    'name', r.name, 'brand', r.brand, 'model', r.model, 'color', r.color, 'imei', r.imei, 'serial_number', r.serial_number);
END $$;

CREATE OR REPLACE FUNCTION public.loaner_return_submit(p_token text, p_condition text, p_notes text, p_photos text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; v_photos text[];
BEGIN
  SELECT * INTO l FROM loaner_loans WHERE return_token = p_token FOR UPDATE;
  IF NOT FOUND OR p_token IS NULL OR length(p_token) < 20 THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF l.returned_at IS NOT NULL THEN RETURN jsonb_build_object('status','returned','returned_at',l.returned_at); END IF;
  -- seules les photos déposées dans le dossier du magasin par le flux téléphone sont acceptées
  SELECT coalesce(array_agg(p), '{}') INTO v_photos FROM (
    SELECT p FROM unnest(coalesce(p_photos,'{}')) p
    WHERE p LIKE 'sav:' || l.shop_id::text || '/loaner-return_%' LIMIT 12) s;
  UPDATE loaner_loans SET returned_at = now(),
    return_condition = nullif(left(coalesce(p_condition,''), 500), ''),
    notes = coalesce(nullif(left(coalesce(p_notes,''), 1000), ''), notes),
    return_photos = to_jsonb(v_photos)
  WHERE id = l.id;
  IF array_length(v_photos,1) > 0 THEN
    UPDATE loaner_equipment SET condition_photos = v_photos WHERE id = l.equipment_id;
  END IF;
  UPDATE loaner_equipment SET status = 'available' WHERE id = l.equipment_id AND status = 'loaned';
  RETURN jsonb_build_object('status','ok');
END $$;

CREATE OR REPLACE FUNCTION public.loaner_return_shop(p_token text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT shop_id FROM loaner_loans WHERE return_token = p_token AND returned_at IS NULL AND length(p_token) >= 20;
$$;
REVOKE ALL ON FUNCTION public.loaner_return_shop(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.loaner_return_shop(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.loaner_return_open(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.loaner_return_submit(text, text, text, text[]) TO anon, authenticated;