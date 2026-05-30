DROP FUNCTION IF EXISTS public.get_tracking_info(text);

CREATE OR REPLACE FUNCTION public.get_tracking_info(p_tracking_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case RECORD;
  v_shop RECORD;
  v_loan RECORD;
  v_result jsonb;
BEGIN
  SELECT sc.id, sc.case_number, sc.status, sc.sav_type, sc.device_brand, sc.device_model,
         sc.problem_description, sc.created_at, sc.updated_at, sc.shop_id, sc.tracking_slug
  INTO v_case
  FROM public.sav_cases sc
  WHERE sc.tracking_slug = p_tracking_slug
  LIMIT 1;

  IF v_case.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT s.id, s.name, s.logo_url, s.address, s.phone, s.email
  INTO v_shop
  FROM public.shops s
  WHERE s.id = v_case.shop_id;

  SELECT ll.id, ll.loaned_at, ll.expected_return_at, ll.returned_at,
         le.name, le.category, le.brand, le.model, le.color
  INTO v_loan
  FROM public.loaner_loans ll
  JOIN public.loaner_equipment le ON le.id = ll.equipment_id
  WHERE ll.sav_case_id = v_case.id AND ll.returned_at IS NULL
  ORDER BY ll.loaned_at DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'case', jsonb_build_object(
      'id', v_case.id,
      'case_number', v_case.case_number,
      'status', v_case.status,
      'sav_type', v_case.sav_type,
      'device_brand', v_case.device_brand,
      'device_model', v_case.device_model,
      'problem_description', v_case.problem_description,
      'created_at', v_case.created_at,
      'updated_at', v_case.updated_at
    ),
    'shop', jsonb_build_object(
      'id', v_shop.id,
      'name', v_shop.name,
      'logo_url', v_shop.logo_url,
      'address', v_shop.address,
      'phone', v_shop.phone,
      'email', v_shop.email
    ),
    'loaner', CASE WHEN v_loan.id IS NULL THEN NULL ELSE jsonb_build_object(
      'name', v_loan.name,
      'category', v_loan.category,
      'brand', v_loan.brand,
      'model', v_loan.model,
      'color', v_loan.color,
      'loaned_at', v_loan.loaned_at,
      'expected_return_at', v_loan.expected_return_at
    ) END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tracking_info(text) TO anon, authenticated;