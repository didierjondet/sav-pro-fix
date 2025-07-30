-- Supprimer l'ancienne colonne sms_credits qui fait doublon
ALTER TABLE public.shops DROP COLUMN IF EXISTS sms_credits;

-- Ajouter une référence directe au plan d'abonnement
ALTER TABLE public.shops ADD COLUMN subscription_plan_id UUID REFERENCES public.subscription_plans(id);

-- Mettre à jour les magasins existants pour qu'ils référencent le bon plan
UPDATE public.shops 
SET subscription_plan_id = (
  SELECT id FROM public.subscription_plans 
  WHERE name = 'Gratuit' AND is_active = true
  LIMIT 1
)
WHERE subscription_tier = 'free' OR subscription_tier IS NULL;

UPDATE public.shops 
SET subscription_plan_id = (
  SELECT id FROM public.subscription_plans 
  WHERE name = 'Premium' AND is_active = true
  LIMIT 1
)
WHERE subscription_tier = 'premium';

UPDATE public.shops 
SET subscription_plan_id = (
  SELECT id FROM public.subscription_plans 
  WHERE name = 'Enterprise' AND is_active = true
  LIMIT 1
)
WHERE subscription_tier = 'enterprise';

-- Créer une fonction pour synchroniser les limites SMS selon le plan
CREATE OR REPLACE FUNCTION public.sync_shop_sms_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Synchroniser les limites SMS selon le plan d'abonnement
  IF NEW.subscription_plan_id IS NOT NULL THEN
    UPDATE public.shops 
    SET sms_credits_allocated = (
      SELECT sms_limit FROM public.subscription_plans 
      WHERE id = NEW.subscription_plan_id
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour synchroniser automatiquement
CREATE TRIGGER sync_shop_sms_limits_trigger
  AFTER UPDATE OF subscription_plan_id ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_shop_sms_limits();

-- Synchroniser immédiatement tous les magasins existants
UPDATE public.shops 
SET sms_credits_allocated = (
  SELECT sp.sms_limit 
  FROM public.subscription_plans sp 
  WHERE sp.id = shops.subscription_plan_id
)
WHERE subscription_plan_id IS NOT NULL;

-- Remettre à zéro les crédits utilisés pour éviter les incohérences
UPDATE public.shops SET sms_credits_used = 0;