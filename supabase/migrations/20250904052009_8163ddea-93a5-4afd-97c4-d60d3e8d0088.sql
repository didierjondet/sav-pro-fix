-- Ajouter les colonnes nécessaires pour gérer les limites mensuelles
ALTER TABLE public.shops 
ADD COLUMN monthly_sav_count integer DEFAULT 0,
ADD COLUMN monthly_sms_used integer DEFAULT 0,
ADD COLUMN purchased_sms_credits integer DEFAULT 0,
ADD COLUMN last_monthly_reset date DEFAULT CURRENT_DATE;

-- Fonction pour calculer les crédits SMS totaux disponibles (plan + achetés)
CREATE OR REPLACE FUNCTION public.get_total_sms_credits(p_shop_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  shop_record RECORD;
  purchased_sms integer := 0;
BEGIN
  -- Récupérer les infos du shop
  SELECT * INTO shop_record FROM public.shops WHERE id = p_shop_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calculer les SMS achetés via des packs non encore utilisés
  SELECT COALESCE(SUM(sms_count), 0) INTO purchased_sms
  FROM public.sms_package_purchases
  WHERE shop_id = p_shop_id 
  AND status = 'completed';
  
  -- Retourner : SMS du plan + SMS achetés - SMS déjà utilisés des packs
  RETURN COALESCE(shop_record.sms_credits_allocated, 0) + purchased_sms - COALESCE(shop_record.purchased_sms_credits, 0);
END;
$$;

-- Fonction pour remettre à zéro les compteurs mensuels
CREATE OR REPLACE FUNCTION public.reset_monthly_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Remettre à zéro les compteurs pour tous les shops où le mois a changé
  UPDATE public.shops 
  SET 
    monthly_sav_count = 0,
    monthly_sms_used = 0,
    last_monthly_reset = CURRENT_DATE
  WHERE EXTRACT(MONTH FROM last_monthly_reset) != EXTRACT(MONTH FROM CURRENT_DATE)
     OR EXTRACT(YEAR FROM last_monthly_reset) != EXTRACT(YEAR FROM CURRENT_DATE);
END;
$$;

-- Fonction améliorée pour vérifier les limites avec la nouvelle logique
CREATE OR REPLACE FUNCTION public.check_subscription_limits_v3(p_shop_id uuid, p_action text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  shop_record RECORD;
  plan_record RECORD;
  effective_sav_limit INTEGER;
  monthly_sms_limit INTEGER;
  total_sms_available INTEGER;
  purchased_sms INTEGER;
  result jsonb;
BEGIN
  -- D'abord, remettre à zéro les compteurs si nécessaire
  PERFORM reset_monthly_counters();
  
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
  ELSE
    -- Récupérer le plan par défaut basé sur le tier
    SELECT * INTO plan_record FROM public.subscription_plans 
    WHERE LOWER(name) = LOWER(shop_record.subscription_tier) 
    AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Calculer les SMS achetés disponibles
  SELECT COALESCE(SUM(sms_count), 0) INTO purchased_sms
  FROM public.sms_package_purchases
  WHERE shop_id = p_shop_id 
  AND status = 'completed';
  
  -- SMS disponibles = SMS achetés non encore utilisés
  purchased_sms := purchased_sms - COALESCE(shop_record.purchased_sms_credits, 0);
  
  -- Déterminer les limites effectives
  effective_sav_limit := COALESCE(shop_record.custom_sav_limit, plan_record.sav_limit);
  monthly_sms_limit := COALESCE(shop_record.custom_sms_limit, plan_record.sms_limit, shop_record.sms_credits_allocated, 0);
  
  -- Vérifications basées sur l'action
  CASE p_action
    WHEN 'sav' THEN
      -- Vérifier les limites SAV mensuelles
      IF effective_sav_limit IS NOT NULL AND shop_record.monthly_sav_count >= effective_sav_limit THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Limite SAV mensuelle atteinte (%s/%s). Renouvellement le 1er du mois prochain.', 
            shop_record.monthly_sav_count, 
            effective_sav_limit
          ),
          'action', CASE WHEN shop_record.custom_sav_limit IS NOT NULL 
            THEN 'contact_support' 
            ELSE 'upgrade_plan' 
          END
        );
      -- Limites par défaut si pas de plan spécifique
      ELSIF effective_sav_limit IS NULL AND shop_record.subscription_tier = 'free' AND shop_record.monthly_sav_count >= 5 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Plan Gratuit limité à 5 SAV par mois (%s/5). Renouvellement le 1er du mois prochain.', shop_record.monthly_sav_count),
          'action', 'upgrade_plan'
        );
      END IF;
      
    WHEN 'sms' THEN
      -- Vérifier d'abord les SMS du plan mensuel, puis les SMS achetés
      IF shop_record.monthly_sms_used >= monthly_sms_limit AND purchased_sms <= 0 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Crédits SMS mensuels épuisés (%s/%s). SMS achetés : %s disponibles.', 
            shop_record.monthly_sms_used, 
            monthly_sms_limit,
            GREATEST(purchased_sms, 0)
          ),
          'action', 'buy_sms_package'
        );
      END IF;
      
    ELSE
      -- Vérification générale (pour les deux)
      IF effective_sav_limit IS NOT NULL AND shop_record.monthly_sav_count >= effective_sav_limit THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', 'Limite SAV mensuelle atteinte',
          'action', CASE WHEN shop_record.custom_sav_limit IS NOT NULL 
            THEN 'contact_support' 
            ELSE 'upgrade_plan' 
          END
        );
      END IF;
      
      IF shop_record.monthly_sms_used >= monthly_sms_limit AND purchased_sms <= 0 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', 'Crédits SMS mensuels épuisés',
          'action', 'buy_sms_package'
        );
      END IF;
  END CASE;
  
  RETURN jsonb_build_object('allowed', true, 'reason', 'Dans les limites autorisées');
END;
$$;

-- Trigger pour incrémenter le compteur SAV mensuel
CREATE OR REPLACE FUNCTION public.increment_monthly_sav_counter()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Incrémenter le compteur SAV mensuel lors de la création d'un SAV
  UPDATE public.shops 
  SET monthly_sav_count = monthly_sav_count + 1
  WHERE id = NEW.shop_id;
  
  RETURN NEW;
END;
$$;

-- Trigger pour décrémenter le compteur SAV mensuel en cas de suppression
CREATE OR REPLACE FUNCTION public.decrement_monthly_sav_counter()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Décrémenter le compteur SAV mensuel lors de la suppression d'un SAV
  UPDATE public.shops 
  SET monthly_sav_count = GREATEST(monthly_sav_count - 1, 0)
  WHERE id = OLD.shop_id;
  
  RETURN OLD;
END;
$$;

-- Créer les triggers pour les SAV
DROP TRIGGER IF EXISTS sav_monthly_counter_insert ON public.sav_cases;
CREATE TRIGGER sav_monthly_counter_insert
  AFTER INSERT ON public.sav_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_monthly_sav_counter();

DROP TRIGGER IF EXISTS sav_monthly_counter_delete ON public.sav_cases;
CREATE TRIGGER sav_monthly_counter_delete
  AFTER DELETE ON public.sav_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_monthly_sav_counter();