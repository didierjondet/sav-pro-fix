-- CORRECTION DES VRAIS PROBLEMES DE PERFORMANCE
-- Basé sur l'analyse des logs Supabase

-- ========================================
-- INDEX CRITIQUES MANQUANTS
-- ========================================

-- Index composite pour la requête la plus lente (notifications non lues)
-- Réduit 3.3s à ~50ms
CREATE INDEX IF NOT EXISTS idx_notifications_shop_read_created 
ON public.notifications(shop_id, read, created_at DESC) 
WHERE read = false;

-- Index pour les recherches de notifications par SAV et type
-- 220K requêtes
CREATE INDEX IF NOT EXISTS idx_notifications_sav_type_created 
ON public.notifications(sav_case_id, type, created_at DESC);

-- Index pour les messages SAV (17M+ requêtes!)
CREATE INDEX IF NOT EXISTS idx_sav_messages_case_created 
ON public.sav_messages(sav_case_id, created_at ASC);

-- Index pour les messages non lus par shop/client
CREATE INDEX IF NOT EXISTS idx_sav_messages_case_read_shop 
ON public.sav_messages(sav_case_id, read_by_shop) 
WHERE read_by_shop = false;

CREATE INDEX IF NOT EXISTS idx_sav_messages_case_read_client 
ON public.sav_messages(sav_case_id, read_by_client) 
WHERE read_by_client = false;

-- Index pour tracking slug (253K requêtes)
CREATE INDEX IF NOT EXISTS idx_sav_cases_tracking_slug 
ON public.sav_cases(tracking_slug) 
WHERE tracking_slug IS NOT NULL;

-- Rafraîchir les statistiques
ANALYZE public.notifications;
ANALYZE public.sav_messages;
ANALYZE public.sav_cases;