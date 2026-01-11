-- Table pour stocker les configurations des fournisseurs par magasin
CREATE TABLE public.shop_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  supplier_name TEXT NOT NULL, -- 'mobilax' ou 'utopya'
  supplier_url TEXT NOT NULL,  -- URL de base du fournisseur
  username TEXT,               -- Identifiant de connexion
  password_encrypted TEXT,     -- Mot de passe (stockage sécurisé)
  price_coefficient DECIMAL(4,2) DEFAULT 1.50, -- Coefficient multiplicateur
  is_enabled BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(shop_id, supplier_name)
);

-- Enable RLS
ALTER TABLE public.shop_suppliers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their shop suppliers
CREATE POLICY "Users can manage their shop suppliers"
ON public.shop_suppliers FOR ALL
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_shop_suppliers_updated_at
  BEFORE UPDATE ON public.shop_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;