-- Supprimer l'accès public à invoice_config
-- Cette table contient des données sensibles (coordonnées bancaires, SIRET, TVA, etc.)
DROP POLICY IF EXISTS "Everyone can view invoice config" ON public.invoice_config;

-- La politique existante "Super admins can manage invoice config" (ALL + is_super_admin())
-- couvre déjà les accès SELECT pour les super admins
-- Donc seuls les super admins pourront désormais lire ces données sensibles