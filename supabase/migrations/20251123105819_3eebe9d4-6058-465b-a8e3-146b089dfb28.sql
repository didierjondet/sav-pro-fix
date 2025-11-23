-- Ajouter la colonne pour le son de notification personnalisé
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS custom_notification_sound_url TEXT DEFAULT NULL;

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_shops_custom_notification_sound 
ON public.shops(custom_notification_sound_url) 
WHERE custom_notification_sound_url IS NOT NULL;

-- Commentaire pour la documentation
COMMENT ON COLUMN public.shops.custom_notification_sound_url IS 'URL du fichier audio personnalisé pour les notifications (stocké dans Supabase Storage)';
