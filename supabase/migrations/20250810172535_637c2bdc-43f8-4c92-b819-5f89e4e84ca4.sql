-- Table pour stocker le contenu de la landing page
CREATE TABLE IF NOT EXISTS public.landing_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_cta_primary TEXT,
  hero_cta_secondary TEXT,
  features_title TEXT,
  features_subtitle TEXT,
  feature_1_title TEXT,
  feature_1_description TEXT,
  feature_2_title TEXT,
  feature_2_description TEXT,
  feature_3_title TEXT,
  feature_3_description TEXT,
  benefits_title TEXT,
  benefits_subtitle TEXT,
  benefit_1_title TEXT,
  benefit_1_description TEXT,
  benefit_2_title TEXT,
  benefit_2_description TEXT,
  benefit_3_title TEXT,
  benefit_3_description TEXT,
  cta_title TEXT,
  cta_subtitle TEXT,
  cta_button_text TEXT,
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre la lecture publique
CREATE POLICY "Landing content is publicly readable" 
ON public.landing_content 
FOR SELECT 
USING (true);

-- Policy pour permettre la modification par les super admins uniquement
CREATE POLICY "Only super admins can modify landing content" 
ON public.landing_content 
FOR ALL 
USING (is_super_admin());

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_landing_content_updated_at
BEFORE UPDATE ON public.landing_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();