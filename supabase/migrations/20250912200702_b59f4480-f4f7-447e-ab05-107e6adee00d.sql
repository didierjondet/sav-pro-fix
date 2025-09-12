-- Créer la table pour les types de SAV personnalisables par magasin
CREATE TABLE public.shop_sav_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  type_key TEXT NOT NULL,
  type_label TEXT NOT NULL,
  type_color TEXT DEFAULT '#6b7280',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Contrainte d'unicité pour éviter les doublons par magasin
  UNIQUE(shop_id, type_key)
);

-- Enable Row Level Security
ALTER TABLE public.shop_sav_types ENABLE ROW LEVEL SECURITY;

-- Politiques RLS identiques à shop_sav_statuses
CREATE POLICY "Shop users can view only their shop SAV types" 
ON public.shop_sav_types 
FOR SELECT 
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop admins can create SAV types for their shop" 
ON public.shop_sav_types 
FOR INSERT 
WITH CHECK (shop_id = get_current_user_shop_id() AND is_shop_admin() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop admins can update their shop SAV types" 
ON public.shop_sav_types 
FOR UPDATE 
USING (shop_id = get_current_user_shop_id() AND is_shop_admin() AND auth.uid() IS NOT NULL)
WITH CHECK (shop_id = get_current_user_shop_id() AND is_shop_admin() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop admins can delete their shop SAV types" 
ON public.shop_sav_types 
FOR DELETE 
USING (shop_id = get_current_user_shop_id() AND is_shop_admin() AND auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage all SAV types" 
ON public.shop_sav_types 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Fonction pour ajouter les types SAV par défaut lors de la création d'un magasin
CREATE OR REPLACE FUNCTION public.add_default_sav_types_to_new_shop()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.shop_sav_types (shop_id, type_key, type_label, type_color, display_order, is_default)
  VALUES 
    (NEW.id, 'internal', 'SAV INTERNE', '#3b82f6', 1, true),
    (NEW.id, 'external', 'SAV EXTERNE', '#10b981', 2, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger pour ajouter automatiquement les types par défaut lors de la création d'un magasin
CREATE TRIGGER add_default_sav_types_trigger
  AFTER INSERT ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.add_default_sav_types_to_new_shop();

-- Ajouter les types SAV pour les magasins existants
INSERT INTO public.shop_sav_types (shop_id, type_key, type_label, type_color, display_order, is_default)
SELECT 
  s.id as shop_id,
  'internal' as type_key,
  'SAV INTERNE' as type_label,
  '#3b82f6' as type_color,
  1 as display_order,
  true as is_default
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_sav_types st 
  WHERE st.shop_id = s.id AND st.type_key = 'internal'
);

INSERT INTO public.shop_sav_types (shop_id, type_key, type_label, type_color, display_order, is_default)
SELECT 
  s.id as shop_id,
  'external' as type_key,
  'SAV EXTERNE' as type_label,
  '#10b981' as type_color,
  2 as display_order,
  true as is_default
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_sav_types st 
  WHERE st.shop_id = s.id AND st.type_key = 'external'
);

-- Ajouter le type 'client' uniquement pour le magasin Easy Cash Agde (s'il existe)
INSERT INTO public.shop_sav_types (shop_id, type_key, type_label, type_color, display_order, is_default)
SELECT 
  s.id as shop_id,
  'client' as type_key,
  'SAV CLIENT' as type_label,
  '#f59e0b' as type_color,
  3 as display_order,
  true as is_default
FROM public.shops s
WHERE LOWER(s.name) LIKE '%easy cash%' OR LOWER(s.name) LIKE '%agde%'
AND NOT EXISTS (
  SELECT 1 FROM public.shop_sav_types st 
  WHERE st.shop_id = s.id AND st.type_key = 'client'
);