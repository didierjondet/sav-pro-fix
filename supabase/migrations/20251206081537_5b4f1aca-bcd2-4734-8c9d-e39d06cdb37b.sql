-- Table pour les enquêtes de satisfaction client
CREATE TABLE public.satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  sav_case_id UUID REFERENCES public.sav_cases(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  -- Token unique pour l'accès public au formulaire
  access_token TEXT UNIQUE NOT NULL,
  
  -- Données de satisfaction
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  -- Métadonnées
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  sent_via TEXT DEFAULT 'sms' CHECK (sent_via IN ('sms', 'chat', 'email')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_satisfaction_surveys_shop_id ON public.satisfaction_surveys(shop_id);
CREATE INDEX idx_satisfaction_surveys_access_token ON public.satisfaction_surveys(access_token);
CREATE INDEX idx_satisfaction_surveys_completed ON public.satisfaction_surveys(shop_id, completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_satisfaction_surveys_sav_case ON public.satisfaction_surveys(sav_case_id);

-- Commentaires
COMMENT ON TABLE public.satisfaction_surveys IS 'Enquêtes de satisfaction client pour les SAV';
COMMENT ON COLUMN public.satisfaction_surveys.access_token IS 'Token unique pour le lien public d''accès au formulaire';
COMMENT ON COLUMN public.satisfaction_surveys.rating IS 'Note de satisfaction de 1 à 5 étoiles';

-- Activer RLS
ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- Politique pour les utilisateurs du magasin (lecture et création)
CREATE POLICY "Shop users can view their satisfaction surveys"
  ON public.satisfaction_surveys
  FOR SELECT
  USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can insert satisfaction surveys"
  ON public.satisfaction_surveys
  FOR INSERT
  WITH CHECK (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can update their satisfaction surveys"
  ON public.satisfaction_surveys
  FOR UPDATE
  USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

-- Politique pour la soumission publique via token (sans authentification)
CREATE POLICY "Public can submit survey responses via token"
  ON public.satisfaction_surveys
  FOR UPDATE
  USING (
    access_token IS NOT NULL 
    AND completed_at IS NULL
    AND auth.uid() IS NULL
  );

-- Politique pour la lecture publique via token (pour afficher le formulaire)
CREATE POLICY "Public can view survey via token"
  ON public.satisfaction_surveys
  FOR SELECT
  USING (
    access_token IS NOT NULL
    AND auth.uid() IS NULL
  );

-- Super admins peuvent tout faire
CREATE POLICY "Super admins can manage all satisfaction surveys"
  ON public.satisfaction_surveys
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Fonction pour générer un token unique
CREATE OR REPLACE FUNCTION public.generate_satisfaction_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token TEXT;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  i INTEGER;
BEGIN
  LOOP
    token := '';
    FOR i IN 1..16 LOOP
      token := token || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Vérifier l'unicité
    IF NOT EXISTS (SELECT 1 FROM public.satisfaction_surveys WHERE access_token = token) THEN
      RETURN token;
    END IF;
  END LOOP;
END;
$$;