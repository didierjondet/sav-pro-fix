DO $$
DECLARE
  v_shop_id uuid := 'f3df8523-53bd-41fa-8930-7dc48b543b08';
  v_user_id uuid := 'bf4d25bc-64f5-492b-a007-a58c8bad28cf';
  v_sav_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_sav_ids FROM public.sav_cases WHERE shop_id = v_shop_id;
  IF v_sav_ids IS NOT NULL THEN
    DELETE FROM public.sav_parts WHERE sav_case_id = ANY(v_sav_ids);
    DELETE FROM public.sav_status_history WHERE sav_case_id = ANY(v_sav_ids);
    DELETE FROM public.sav_messages WHERE sav_case_id = ANY(v_sav_ids);
  END IF;

  DELETE FROM public.notifications WHERE shop_id = v_shop_id;
  DELETE FROM public.order_items WHERE shop_id = v_shop_id;
  DELETE FROM public.sav_messages WHERE shop_id = v_shop_id;
  DELETE FROM public.sav_cases WHERE shop_id = v_shop_id;
  DELETE FROM public.customers WHERE shop_id = v_shop_id;
  DELETE FROM public.quotes WHERE shop_id = v_shop_id;
  DELETE FROM public.parts WHERE shop_id = v_shop_id;
  DELETE FROM public.profiles WHERE shop_id = v_shop_id;
  DELETE FROM public.shops WHERE id = v_shop_id;

  DELETE FROM auth.users WHERE id = v_user_id;
END $$;