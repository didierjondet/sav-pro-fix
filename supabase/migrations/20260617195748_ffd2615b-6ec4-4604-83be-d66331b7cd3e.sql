
CREATE OR REPLACE FUNCTION public.increment_faq_click(faq_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.help_bot_faq
  SET click_count = click_count + 1
  WHERE id = faq_id;
$$;

REVOKE ALL ON FUNCTION public.increment_faq_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_faq_click(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can update FAQ click count" ON public.help_bot_faq;
