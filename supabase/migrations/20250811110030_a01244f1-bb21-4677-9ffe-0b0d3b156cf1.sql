-- Créer la table des packs SMS configurables par le super admin
CREATE TABLE public.sms_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sms_count INTEGER NOT NULL,
  price_cents INTEGER NOT NULL, -- Prix en centimes
  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS pour les packs SMS
ALTER TABLE public.sms_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active SMS packages" ON public.sms_packages
FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage SMS packages" ON public.sms_packages
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Ajouter des packs SMS par défaut pour chaque tier
INSERT INTO public.sms_packages (name, description, sms_count, price_cents, subscription_tier) VALUES
-- Plan gratuit
('Pack 50 SMS', 'Pack de 50 SMS supplémentaires', 50, 500, 'free'),
('Pack 100 SMS', 'Pack de 100 SMS supplémentaires', 100, 900, 'free'),
('Pack 250 SMS', 'Pack de 250 SMS supplémentaires', 250, 2000, 'free'),

-- Plan premium
('Pack 100 SMS', 'Pack de 100 SMS supplémentaires', 100, 800, 'premium'),
('Pack 250 SMS', 'Pack de 250 SMS supplémentaires', 250, 1800, 'premium'),
('Pack 500 SMS', 'Pack de 500 SMS supplémentaires', 500, 3500, 'premium'),

-- Plan enterprise
('Pack 250 SMS', 'Pack de 250 SMS supplémentaires', 250, 1500, 'enterprise'),
('Pack 500 SMS', 'Pack de 500 SMS supplémentaires', 500, 2800, 'enterprise'),
('Pack 1000 SMS', 'Pack de 1000 SMS supplémentaires', 1000, 5000, 'enterprise');

-- Créer la table des achats de packs SMS
CREATE TABLE public.sms_package_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.sms_packages(id),
  sms_count INTEGER NOT NULL,
  price_paid_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- RLS pour les achats de packs SMS
ALTER TABLE public.sms_package_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop users can view their SMS purchases" ON public.sms_package_purchases
FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Shop users can create SMS purchases" ON public.sms_package_purchases
FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Super admins can manage all SMS purchases" ON public.sms_package_purchases
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Mettre à jour la fonction de vérification des limites
CREATE OR REPLACE FUNCTION public.check_subscription_limits_v2(p_shop_id uuid, p_action text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  shop_record RECORD;
  plan_record RECORD;
  result jsonb;
BEGIN
  -- Récupérer les informations du shop
  SELECT * INTO shop_record FROM public.shops WHERE id = p_shop_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Shop not found');
  END IF;
  
  -- Si abonnement forcé, autoriser
  IF shop_record.subscription_forced THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'Forced subscription - checks disabled');
  END IF;
  
  -- Récupérer les limites du plan d'abonnement
  IF shop_record.subscription_plan_id IS NOT NULL THEN
    SELECT * INTO plan_record FROM public.subscription_plans WHERE id = shop_record.subscription_plan_id;
  END IF;
  
  -- Vérifications basées sur l'action
  CASE p_action
    WHEN 'sav' THEN
      -- Vérifier les limites SAV selon le plan
      IF plan_record.sav_limit IS NOT NULL AND shop_record.active_sav_count >= plan_record.sav_limit THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Limite SAV atteinte (%s/%s). Passez au plan supérieur.', shop_record.active_sav_count, plan_record.sav_limit),
          'action', 'upgrade_plan'
        );
      ELSIF shop_record.subscription_tier = 'free' AND shop_record.active_sav_count >= 15 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Plan Gratuit limité à 15 SAV actifs (%s/15). Passez au plan Premium.', shop_record.active_sav_count),
          'action', 'upgrade_plan'
        );
      END IF;
      
    WHEN 'sms' THEN
      -- Vérifier les limites SMS
      IF shop_record.sms_credits_used >= shop_record.sms_credits_allocated THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Crédits SMS épuisés (%s/%s)', shop_record.sms_credits_used, shop_record.sms_credits_allocated),
          'action', 'buy_sms_package'
        );
      END IF;
      
    ELSE
      -- Vérification générale
      IF plan_record.sav_limit IS NOT NULL AND shop_record.active_sav_count >= plan_record.sav_limit THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', 'Limite SAV atteinte',
          'action', 'upgrade_plan'
        );
      ELSIF shop_record.subscription_tier = 'free' AND shop_record.active_sav_count >= 15 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', 'Plan Gratuit limité à 15 SAV actifs',
          'action', 'upgrade_plan'
        );
      END IF;
      
      IF shop_record.sms_credits_used >= shop_record.sms_credits_allocated THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', 'Crédits SMS épuisés',
          'action', 'buy_sms_package'
        );
      END IF;
  END CASE;
  
  RETURN jsonb_build_object('allowed', true, 'reason', 'Within limits');
END;
$function$;

-- Trigger pour vérifier les limites SAV à la création
CREATE OR REPLACE FUNCTION public.check_sav_limits_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  limits_check jsonb;
BEGIN
  -- Vérifier les limites avant création d'un SAV
  SELECT public.check_subscription_limits_v2(NEW.shop_id, 'sav') INTO limits_check;
  
  IF NOT (limits_check->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Limite SAV atteinte: %', limits_check->>'reason';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Appliquer le trigger sur les SAV
DROP TRIGGER IF EXISTS check_sav_limits_trigger ON public.sav_cases;
CREATE TRIGGER check_sav_limits_trigger 
  BEFORE INSERT ON public.sav_cases
  FOR EACH ROW EXECUTE FUNCTION public.check_sav_limits_before_insert();