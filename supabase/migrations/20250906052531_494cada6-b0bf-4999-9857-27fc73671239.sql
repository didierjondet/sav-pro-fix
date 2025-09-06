-- Renforcer la sécurité des statuts SAV personnalisés
-- Supprimer les anciennes politiques pour les remplacer par des versions plus sécurisées

DROP POLICY IF EXISTS "Shop users can view their SAV statuses" ON public.shop_sav_statuses;
DROP POLICY IF EXISTS "Shop admins can manage their SAV statuses" ON public.shop_sav_statuses;
DROP POLICY IF EXISTS "Super admins can manage all SAV statuses" ON public.shop_sav_statuses;

-- Créer des politiques plus strictes avec des vérifications renforcées

-- Politique pour la lecture : seuls les utilisateurs du magasin concerné peuvent voir leurs statuts
CREATE POLICY "Shop users can view only their shop SAV statuses" 
ON public.shop_sav_statuses 
FOR SELECT 
USING (
  shop_id = get_current_user_shop_id() 
  AND auth.uid() IS NOT NULL
);

-- Politique pour l'insertion : seuls les admins du magasin peuvent créer des statuts pour leur magasin
CREATE POLICY "Shop admins can create SAV statuses for their shop" 
ON public.shop_sav_statuses 
FOR INSERT 
WITH CHECK (
  shop_id = get_current_user_shop_id() 
  AND is_shop_admin() 
  AND auth.uid() IS NOT NULL
);

-- Politique pour la mise à jour : seuls les admins du magasin peuvent modifier leurs statuts
CREATE POLICY "Shop admins can update their shop SAV statuses" 
ON public.shop_sav_statuses 
FOR UPDATE 
USING (
  shop_id = get_current_user_shop_id() 
  AND is_shop_admin() 
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  shop_id = get_current_user_shop_id() 
  AND is_shop_admin() 
  AND auth.uid() IS NOT NULL
);

-- Politique pour la suppression : seuls les admins du magasin peuvent supprimer leurs statuts
CREATE POLICY "Shop admins can delete their shop SAV statuses" 
ON public.shop_sav_statuses 
FOR DELETE 
USING (
  shop_id = get_current_user_shop_id() 
  AND is_shop_admin() 
  AND auth.uid() IS NOT NULL
);

-- Politique pour les super admins : accès complet
CREATE POLICY "Super admins can manage all SAV statuses" 
ON public.shop_sav_statuses 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Ajouter un index pour améliorer les performances des requêtes avec shop_id
CREATE INDEX IF NOT EXISTS idx_shop_sav_statuses_shop_id_active 
ON public.shop_sav_statuses (shop_id, is_active) 
WHERE is_active = true;