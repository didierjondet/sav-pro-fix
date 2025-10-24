-- CORRECTION CRITIQUE : Ajouter les index manquants pour accélérer les RLS policies et les requêtes
-- Sans ces index, PostgreSQL fait des scans complets de tables (TRÈS LENT)

-- Index pour la fonction get_current_user_shop_id() appelée dans TOUTES les RLS policies
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_shop_id ON public.profiles(shop_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Index pour filtrer par shop_id (utilisé dans TOUTES les tables qui ONT shop_id)
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_sav_cases_shop_id ON public.sav_cases(shop_id);
CREATE INDEX IF NOT EXISTS idx_parts_shop_id ON public.parts(shop_id);
CREATE INDEX IF NOT EXISTS idx_order_items_shop_id ON public.order_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_quotes_shop_id ON public.quotes(shop_id);
CREATE INDEX IF NOT EXISTS idx_sav_messages_shop_id ON public.sav_messages(shop_id);

-- Index pour les foreign keys et joins fréquents
CREATE INDEX IF NOT EXISTS idx_sav_cases_customer_id ON public.sav_cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_sav_cases_status ON public.sav_cases(status);
CREATE INDEX IF NOT EXISTS idx_order_items_part_id ON public.order_items(part_id);
CREATE INDEX IF NOT EXISTS idx_order_items_sav_case_id ON public.order_items(sav_case_id);
CREATE INDEX IF NOT EXISTS idx_sav_parts_sav_case_id ON public.sav_parts(sav_case_id);
CREATE INDEX IF NOT EXISTS idx_sav_parts_part_id ON public.sav_parts(part_id);
CREATE INDEX IF NOT EXISTS idx_sav_messages_sav_case_id ON public.sav_messages(sav_case_id);

-- Index composites pour les requêtes complexes de la page Orders
CREATE INDEX IF NOT EXISTS idx_order_items_shop_reason_ordered ON public.order_items(shop_id, reason, ordered);
CREATE INDEX IF NOT EXISTS idx_sav_cases_shop_status ON public.sav_cases(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_parts_shop_quantity ON public.parts(shop_id, quantity);

-- Index pour les timestamps (tri par date)
CREATE INDEX IF NOT EXISTS idx_sav_cases_created_at ON public.sav_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_created_at ON public.order_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shops_id ON public.shops(id);

-- Index pour les notifications et support tickets
CREATE INDEX IF NOT EXISTS idx_notifications_shop_id ON public.notifications(shop_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(shop_id, read);
CREATE INDEX IF NOT EXISTS idx_support_tickets_shop_id ON public.support_tickets(shop_id) WHERE shop_id IS NOT NULL;