-- Créer une table pour les configurations d'import par boutique
CREATE TABLE public.import_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Configuration par défaut',
  is_default BOOLEAN NOT NULL DEFAULT false,
  column_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_columns TEXT[] NOT NULL DEFAULT ARRAY['marque', 'model', 'pieces'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, name)
);

-- Enable RLS
ALTER TABLE public.import_configurations ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Shop users can manage their import configurations" 
ON public.import_configurations 
FOR ALL 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Super admins can manage all import configurations" 
ON public.import_configurations 
FOR ALL 
USING (is_super_admin());

-- Trigger pour updated_at
CREATE TRIGGER update_import_configurations_updated_at
BEFORE UPDATE ON public.import_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer des configurations par défaut pour les boutiques existantes
INSERT INTO public.import_configurations (shop_id, name, is_default, column_mappings)
SELECT 
  id as shop_id,
  'Configuration par défaut' as name,
  true as is_default,
  '[
    {"field_name": "marque", "column_name": "Marque", "required": true, "type": "text"},
    {"field_name": "model", "column_name": "Model", "required": true, "type": "text"},
    {"field_name": "pieces", "column_name": "Pieces", "required": true, "type": "text"},
    {"field_name": "quantity", "column_name": "QT", "required": false, "type": "number", "default": 0},
    {"field_name": "fournisseur", "column_name": "Fournisseur", "required": false, "type": "text"},
    {"field_name": "selling_price", "column_name": "Prix public", "required": false, "type": "number", "default": 0},
    {"field_name": "purchase_price", "column_name": "Prix achat ht", "required": false, "type": "number", "default": 0},
    {"field_name": "prix_ttc", "column_name": "Prix ttc", "required": false, "type": "number", "default": 0},
    {"field_name": "temp_rep_min", "column_name": "Temp rep (min)", "required": false, "type": "number", "default": 0},
    {"field_name": "min_stock", "column_name": "Stock mini", "required": false, "type": "number", "default": 5}
  ]'::jsonb as column_mappings
FROM public.shops;