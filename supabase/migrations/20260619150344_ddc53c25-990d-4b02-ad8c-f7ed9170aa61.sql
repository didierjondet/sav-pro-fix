-- Étape 4: Sécurisation de sav_messages
-- Retire l'accès anonyme direct, remplacé par RPC SECURITY DEFINER existantes (get_tracking_messages, send_client_tracking_message)
-- + nouvelle RPC mark_tracking_messages_read pour le marquage "lu" côté client public.

-- ============================================================
-- ROLLBACK (à exécuter dans le SQL Editor si besoin de revert) :
-- ------------------------------------------------------------
-- DROP POLICY IF EXISTS "Unified view messages policy" ON public.sav_messages;
-- DROP POLICY IF EXISTS "Unified update messages policy" ON public.sav_messages;
-- DROP POLICY IF EXISTS "Unified delete messages policy" ON public.sav_messages;
--
-- CREATE POLICY "Clients can insert messages via tracking" ON public.sav_messages
-- FOR INSERT TO public
-- WITH CHECK ((sender_type = 'client') AND (auth.uid() IS NULL) AND (sav_case_id IN (
--   SELECT id FROM sav_cases WHERE tracking_slug IS NOT NULL AND tracking_slug <> ''
-- )));
--
-- CREATE POLICY "Unified view messages policy" ON public.sav_messages
-- FOR SELECT TO public
-- USING (
--   ((auth.uid() IS NOT NULL) AND (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid())))
--   OR ((auth.uid() IS NULL) AND (sav_case_id IN (SELECT id FROM sav_cases WHERE tracking_slug IS NOT NULL AND tracking_slug <> '')))
-- );
--
-- CREATE POLICY "Unified update messages policy" ON public.sav_messages
-- FOR UPDATE TO public
-- USING (
--   ((auth.uid() IS NOT NULL) AND (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid())))
--   OR ((auth.uid() IS NULL) AND (sav_case_id IN (SELECT id FROM sav_cases WHERE tracking_slug IS NOT NULL AND tracking_slug <> '')))
-- );
--
-- CREATE POLICY "Unified delete messages policy" ON public.sav_messages
-- FOR DELETE TO public
-- USING (
--   (created_at > (now() - interval '1 minute'))
--   AND (
--     ((sender_type = 'shop') AND (auth.uid() IS NOT NULL) AND (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid())))
--     OR ((sender_type = 'client') AND (auth.uid() IS NULL) AND (sav_case_id IN (SELECT id FROM sav_cases WHERE tracking_slug IS NOT NULL AND tracking_slug <> '')))
--   )
-- );
-- ============================================================

-- 1. Supprimer la politique d'INSERT anonyme
DROP POLICY IF EXISTS "Clients can insert messages via tracking" ON public.sav_messages;

-- 2. Recréer les 3 politiques unifiées en version authenticated-only
DROP POLICY IF EXISTS "Unified view messages policy" ON public.sav_messages;
CREATE POLICY "Unified view messages policy" ON public.sav_messages
FOR SELECT TO authenticated
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Unified update messages policy" ON public.sav_messages;
CREATE POLICY "Unified update messages policy" ON public.sav_messages
FOR UPDATE TO authenticated
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Unified delete messages policy" ON public.sav_messages;
CREATE POLICY "Unified delete messages policy" ON public.sav_messages
FOR DELETE TO authenticated
USING (
  (created_at > (now() - interval '1 minute'))
  AND (sender_type = 'shop')
  AND (shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- 3. RPC pour permettre au client public de marquer les messages "shop" comme lus
CREATE OR REPLACE FUNCTION public.mark_tracking_messages_read(p_tracking_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
BEGIN
  SELECT id INTO v_case_id
  FROM public.sav_cases
  WHERE tracking_slug = p_tracking_slug
    AND tracking_slug IS NOT NULL
    AND tracking_slug <> ''
  LIMIT 1;

  IF v_case_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.sav_messages
  SET read_by_client = true
  WHERE sav_case_id = v_case_id
    AND sender_type = 'shop'
    AND read_by_client = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_tracking_messages_read(text) TO anon, authenticated;