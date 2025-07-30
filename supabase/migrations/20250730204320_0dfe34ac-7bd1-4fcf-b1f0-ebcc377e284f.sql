-- Créer une table pour les plans d'abonnement
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_interval TEXT NOT NULL DEFAULT 'month',
  sav_limit INTEGER, -- NULL = illimité
  sms_limit INTEGER NOT NULL DEFAULT 15,
  sms_cost DECIMAL(10,4) NOT NULL DEFAULT 0.10,
  features JSONB DEFAULT '[]'::jsonb,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activer Row Level Security
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Politique pour que tous les utilisateurs puissent voir les plans
CREATE POLICY "Everyone can view subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (true);

-- Politique pour que seuls les super admins puissent gérer les plans
CREATE POLICY "Super admins can manage subscription plans" 
ON public.subscription_plans 
FOR ALL 
USING (is_super_admin()) 
WITH CHECK (is_super_admin());

-- Insérer les plans par défaut
INSERT INTO public.subscription_plans (name, description, monthly_price, sav_limit, sms_limit, sms_cost, features) VALUES
('Gratuit', 'Plan gratuit avec fonctionnalités de base', 0, 15, 15, 0.12, '["15 SAV maximum", "15 SMS par mois", "Support email"]'),
('Premium', 'Plan premium pour petites entreprises', 12, 10, 100, 0.08, '["10 SAV simultanés", "100 SMS par mois", "Support prioritaire", "Rapports avancés"]'),
('Enterprise', 'Plan entreprise pour grandes organisations', 40, NULL, 400, 0.05, '["SAV illimités", "400 SMS par mois", "Support 24/7", "API personnalisée"]')
ON CONFLICT (name) DO UPDATE SET
  monthly_price = EXCLUDED.monthly_price,
  sav_limit = EXCLUDED.sav_limit,
  sms_limit = EXCLUDED.sms_limit,
  sms_cost = EXCLUDED.sms_cost,
  features = EXCLUDED.features,
  updated_at = now();

-- Supprimer l'ancienne table SMS pricing qui n'est plus nécessaire
DROP TABLE IF EXISTS public.sms_pricing;