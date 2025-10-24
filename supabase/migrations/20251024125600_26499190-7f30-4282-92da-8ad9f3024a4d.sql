-- OPTIMISER les RLS policies de notifications pour utiliser la fonction cachée
-- Au lieu de sous-requêtes coûteuses sur profiles

-- Supprimer les anciennes policies de notifications
DROP POLICY IF EXISTS "Shop users can delete their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Shop users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Shop users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Shop users can view their notifications" ON public.notifications;

-- Recréer avec la fonction cachée get_current_user_shop_id()
CREATE POLICY "Shop users can view their notifications"
ON public.notifications FOR SELECT
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can update their notifications"
ON public.notifications FOR UPDATE
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can delete their notifications"
ON public.notifications FOR DELETE
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);