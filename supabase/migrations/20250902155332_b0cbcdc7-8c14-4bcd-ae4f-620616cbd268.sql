-- Créer une table pour les éléments du carrousel de la landing page
CREATE TABLE public.carousel_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Créer un index sur l'ordre d'affichage
CREATE INDEX idx_carousel_items_order ON public.carousel_items(display_order);

-- Activer RLS
ALTER TABLE public.carousel_items ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique des éléments actifs
CREATE POLICY "Public can view active carousel items"
ON public.carousel_items
FOR SELECT
USING (is_active = true);

-- Politique pour les super admins
CREATE POLICY "Super admins can manage carousel items"
ON public.carousel_items
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_carousel_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_carousel_items_updated_at
  BEFORE UPDATE ON public.carousel_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_carousel_items_updated_at();