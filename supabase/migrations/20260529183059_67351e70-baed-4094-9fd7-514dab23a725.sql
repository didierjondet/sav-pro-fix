UPDATE public.sav_cases
SET status = 'pret_et_cloture',
    closure_history = COALESCE(closure_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'closed_at', now(),
      'status', 'pret_et_cloture',
      'status_label', 'Prêt et cloturé',
      'closed_by_user_id', '00000000-0000-0000-0000-000000000000',
      'closed_by_name', 'Migration système'
    ))
WHERE shop_id = 'add89e6c-2bff-4799-a062-63cd0a9b33c0'
  AND status = 'ready';

INSERT INTO public.sav_status_history (sav_case_id, status, notes)
SELECT id, 'pret_et_cloture', 'Migration en masse: Prêt -> Prêt et cloturé'
FROM public.sav_cases
WHERE shop_id = 'add89e6c-2bff-4799-a062-63cd0a9b33c0'
  AND status = 'pret_et_cloture';