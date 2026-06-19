
-- Replace public token-based RLS with SECURITY DEFINER RPCs to prevent
-- enumeration / mass-read of appointment PII by anonymous users.

DROP POLICY IF EXISTS "Public can view appointments by token" ON public.appointments;
DROP POLICY IF EXISTS "Public can update appointments by token" ON public.appointments;

-- Read by token (returns shop/sav/customer info needed by confirmation page)
CREATE OR REPLACE FUNCTION public.get_appointment_by_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', a.id,
    'start_datetime', a.start_datetime,
    'duration_minutes', a.duration_minutes,
    'appointment_type', a.appointment_type,
    'status', a.status,
    'notes', a.notes,
    'device_info', a.device_info,
    'counter_proposal_datetime', a.counter_proposal_datetime,
    'counter_proposal_message', a.counter_proposal_message,
    'shop', jsonb_build_object('name', s.name, 'phone', s.phone, 'address', s.address, 'logo_url', s.logo_url),
    'sav_case', CASE WHEN sc.id IS NOT NULL THEN jsonb_build_object('case_number', sc.case_number, 'device_brand', sc.device_brand, 'device_model', sc.device_model) ELSE NULL END,
    'customer', CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('first_name', c.first_name, 'last_name', c.last_name) ELSE NULL END
  )
  INTO result
  FROM public.appointments a
  LEFT JOIN public.shops s ON s.id = a.shop_id
  LEFT JOIN public.sav_cases sc ON sc.id = a.sav_case_id
  LEFT JOIN public.customers c ON c.id = a.customer_id
  WHERE a.confirmation_token = _token
  LIMIT 1;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_appointment_by_token(uuid) TO anon, authenticated;

-- Respond to an appointment by token (confirm or counter-propose)
CREATE OR REPLACE FUNCTION public.respond_to_appointment_by_token(
  _token uuid,
  _action text,
  _counter_datetime timestamptz DEFAULT NULL,
  _counter_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.appointments%ROWTYPE;
BEGIN
  IF _action NOT IN ('confirm', 'counter_propose') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  IF _action = 'confirm' THEN
    UPDATE public.appointments
       SET status = 'confirmed', updated_at = now()
     WHERE confirmation_token = _token
       AND status IN ('proposed', 'counter_proposed')
     RETURNING * INTO updated;
  ELSE
    IF _counter_datetime IS NULL THEN
      RAISE EXCEPTION 'Counter datetime required';
    END IF;
    UPDATE public.appointments
       SET status = 'counter_proposed',
           counter_proposal_datetime = _counter_datetime,
           counter_proposal_message = _counter_message,
           updated_at = now()
     WHERE confirmation_token = _token
       AND status IN ('proposed', 'counter_proposed')
     RETURNING * INTO updated;
  END IF;

  IF updated.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found_or_invalid_state');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', updated.status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_to_appointment_by_token(uuid, text, timestamptz, text) TO anon, authenticated;
