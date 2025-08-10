-- Add SEO configuration table for shops
CREATE TABLE public.shop_seo_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  
  -- Meta tags de base
  default_title TEXT,
  default_description TEXT,
  default_keywords TEXT[],
  
  -- Open Graph
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  og_type TEXT DEFAULT 'website',
  
  -- Twitter Cards
  twitter_card_type TEXT DEFAULT 'summary_large_image',
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image_url TEXT,
  
  -- Structured data
  business_type TEXT DEFAULT 'LocalBusiness',
  business_hours JSONB,
  price_range TEXT,
  accepts_reservations BOOLEAN DEFAULT true,
  
  -- Analytics et verification
  google_analytics_id TEXT,
  google_tag_manager_id TEXT,
  google_site_verification TEXT,
  bing_site_verification TEXT,
  facebook_domain_verification TEXT,
  
  -- Robots et sitemap
  robots_txt TEXT DEFAULT 'User-agent: *\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://fixway.fr/sitemap.xml',
  sitemap_enabled BOOLEAN DEFAULT true,
  
  -- URL canoniques et redirections
  canonical_domain TEXT,
  force_https BOOLEAN DEFAULT true,
  
  -- Images par défaut
  default_alt_text_pattern TEXT DEFAULT '{shop_name} - Service de réparation',
  favicon_url TEXT,
  
  -- Performance et chargement
  lazy_loading_enabled BOOLEAN DEFAULT true,
  webp_images_enabled BOOLEAN DEFAULT true,
  
  -- Données locales
  local_business_hours JSONB,
  service_areas TEXT[],
  languages_supported TEXT[] DEFAULT ARRAY['fr'],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_seo_config ENABLE ROW LEVEL SECURITY;

-- Create policies for shop SEO config
CREATE POLICY "Shop users can view their SEO config" 
ON public.shop_seo_config 
FOR SELECT 
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop admins can manage their SEO config" 
ON public.shop_seo_config 
FOR ALL 
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
))
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Super admins can manage all SEO configs" 
ON public.shop_seo_config 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Create function to update timestamps
CREATE TRIGGER update_shop_seo_config_updated_at
BEFORE UPDATE ON public.shop_seo_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create default SEO config for existing shops
INSERT INTO public.shop_seo_config (shop_id, default_title, default_description)
SELECT 
  id,
  COALESCE(name || ' - Service de réparation professionnel', 'Fixway - Service de réparation'),
  COALESCE('Service de réparation professionnel pour ' || name || '. Devis gratuit, réparations rapides et de qualité.', 'Service de réparation professionnel. Devis gratuit, réparations rapides et de qualité.')
FROM public.shops
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_seo_config WHERE shop_seo_config.shop_id = shops.id
);