-- Créer la table pour les statuts SAV personnalisables par magasin
CREATE TABLE public.shop_sav_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  status_key TEXT NOT NULL, -- La clé unique pour ce statut (ex: 'pending', 'in_progress')
  status_label TEXT NOT NULL, -- Le libellé affiché (ex: 'En attente', 'En cours')
  status_color TEXT DEFAULT '#6b7280', -- Couleur hexadécimale pour l'affichage
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false, -- Si c'est un statut par défaut du système
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, status_key)
);

-- Créer l'index pour améliorer les performances
CREATE INDEX idx_shop_sav_statuses_shop_id ON public.shop_sav_statuses(shop_id);
CREATE INDEX idx_shop_sav_statuses_order ON public.shop_sav_statuses(shop_id, display_order);

-- Activer RLS
ALTER TABLE public.shop_sav_statuses ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Shop users can view their SAV statuses" ON public.shop_sav_statuses
  FOR SELECT USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Shop admins can manage their SAV statuses" ON public.shop_sav_statuses
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Super admins can manage all SAV statuses" ON public.shop_sav_statuses
  FOR ALL USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Trigger pour updated_at
CREATE TRIGGER update_shop_sav_statuses_updated_at
  BEFORE UPDATE ON public.shop_sav_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les statuts par défaut pour tous les magasins existants
INSERT INTO public.shop_sav_statuses (shop_id, status_key, status_label, status_color, display_order, is_default)
SELECT 
  id as shop_id,
  'pending' as status_key,
  'En attente' as status_label,
  '#f59e0b' as status_color,
  1 as display_order,
  true as is_default
FROM public.shops
UNION ALL
SELECT 
  id as shop_id,
  'in_progress' as status_key,
  'En cours' as status_label,
  '#3b82f6' as status_color,
  2 as display_order,
  true as is_default
FROM public.shops
UNION ALL
SELECT 
  id as shop_id,
  'parts_ordered' as status_key,
  'Pièces commandées' as status_label,
  '#8b5cf6' as status_color,
  3 as display_order,
  true as is_default
FROM public.shops
UNION ALL
SELECT 
  id as shop_id,
  'testing' as status_key,
  'Tests en cours' as status_label,
  '#06b6d4' as status_color,
  4 as display_order,
  true as is_default
FROM public.shops
UNION ALL
SELECT 
  id as shop_id,
  'ready' as status_key,
  'Prêt' as status_label,
  '#10b981' as status_color,
  5 as display_order,
  true as is_default
FROM public.shops
UNION ALL
SELECT 
  id as shop_id,
  'cancelled' as status_key,
  'Annulé' as status_label,
  '#ef4444' as status_color,
  6 as display_order,
  true as is_default
FROM public.shops;

-- Créer une fonction trigger pour ajouter automatiquement les statuts par défaut aux nouveaux magasins
CREATE OR REPLACE FUNCTION add_default_sav_statuses_to_new_shop()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.shop_sav_statuses (shop_id, status_key, status_label, status_color, display_order, is_default)
  VALUES 
    (NEW.id, 'pending', 'En attente', '#f59e0b', 1, true),
    (NEW.id, 'in_progress', 'En cours', '#3b82f6', 2, true),
    (NEW.id, 'parts_ordered', 'Pièces commandées', '#8b5cf6', 3, true),
    (NEW.id, 'testing', 'Tests en cours', '#06b6d4', 4, true),
    (NEW.id, 'ready', 'Prêt', '#10b981', 5, true),
    (NEW.id, 'cancelled', 'Annulé', '#ef4444', 6, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur les nouveaux magasins
CREATE TRIGGER add_default_sav_statuses_trigger
  AFTER INSERT ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION add_default_sav_statuses_to_new_shop();