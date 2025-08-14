-- Modifier la fonction de vérification des limites pour la nouvelle logique SMS
CREATE OR REPLACE FUNCTION public.check_subscription_limits_v2(p_shop_id uuid, p_action text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  shop_record RECORD;
  plan_record RECORD;
  effective_sav_limit INTEGER;
  total_sms_purchased INTEGER;
  effective_sms_limit INTEGER;
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
  ELSE
    -- Récupérer le plan par défaut basé sur le tier
    SELECT * INTO plan_record FROM public.subscription_plans 
    WHERE LOWER(name) = LOWER(shop_record.subscription_tier) 
    AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Calculer le total des SMS achetés via packages
  SELECT COALESCE(SUM(sms_count), 0) INTO total_sms_purchased
  FROM public.sms_package_purchases
  WHERE shop_id = p_shop_id
  AND status = 'completed';
  
  -- Déterminer les limites effectives
  effective_sav_limit := COALESCE(shop_record.custom_sav_limit, plan_record.sav_limit);
  
  -- Nouvelle logique SMS: plan + packages achetés = limite totale (pas de contrainte mensuelle)
  IF shop_record.custom_sms_limit IS NOT NULL THEN
    -- Limite personnalisée + packages
    effective_sms_limit := shop_record.custom_sms_limit + total_sms_purchased;
  ELSE
    -- Limite du plan + packages
    effective_sms_limit := COALESCE(plan_record.sms_limit, shop_record.sms_credits_allocated, 0) + total_sms_purchased;
  END IF;
  
  -- Vérifications basées sur l'action
  CASE p_action
    WHEN 'sav' THEN
      -- Vérifier les limites SAV avec les limites effectives
      IF effective_sav_limit IS NOT NULL AND shop_record.active_sav_count >= effective_sav_limit THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Limite SAV atteinte (%s/%s). %s', 
            shop_record.active_sav_count, 
            effective_sav_limit,
            CASE WHEN shop_record.custom_sav_limit IS NOT NULL 
              THEN 'Limite personnalisée définie.' 
              ELSE 'Passez au plan supérieur.' 
            END
          ),
          'action', CASE WHEN shop_record.custom_sav_limit IS NOT NULL 
            THEN 'contact_support' 
            ELSE 'upgrade_plan' 
          END
        );
      -- Limites par défaut si pas de plan spécifique
      ELSIF effective_sav_limit IS NULL AND shop_record.subscription_tier = 'free' AND shop_record.active_sav_count >= 5 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Plan Gratuit limité à 5 SAV actifs (%s/5). Passez au plan Premium.', shop_record.active_sav_count),
          'action', 'upgrade_plan'
        );
      ELSIF effective_sav_limit IS NULL AND shop_record.subscription_tier = 'premium' AND shop_record.active_sav_count >= 50 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Plan Premium limité à 50 SAV simultanés (%s/50). Passez au plan Enterprise.', shop_record.active_sav_count),
          'action', 'upgrade_plan'
        );
      END IF;
      
    WHEN 'sms' THEN
      -- Vérifier les limites SMS avec la nouvelle logique (plan + packages)
      IF shop_record.sms_credits_used >= effective_sms_limit THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Crédits SMS épuisés (%s/%s). %s', 
            shop_record.sms_credits_used, 
            effective_sms_limit,
            CASE WHEN total_sms_purchased > 0 
              THEN 'Rechargez vos crédits SMS.' 
              ELSE 'Achetez des crédits SMS ou passez au plan supérieur.' 
            END
          ),
          'action', CASE WHEN shop_record.custom_sms_limit IS NOT NULL 
            THEN 'contact_support' 
            ELSE 'buy_sms_package' 
          END
        );
      END IF;
      
    ELSE
      -- Vérification générale
      IF effective_sav_limit IS NOT NULL AND shop_record.active_sav_count >= effective_sav_limit THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', 'Limite SAV atteinte',
          'action', CASE WHEN shop_record.custom_sav_limit IS NOT NULL 
            THEN 'contact_support' 
            ELSE 'upgrade_plan' 
          END
        );
      ELSIF effective_sav_limit IS NULL AND shop_record.subscription_tier = 'free' AND shop_record.active_sav_count >= 5 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', 'Plan Gratuit limité à 5 SAV actifs',
          'action', 'upgrade_plan'
        );
      END IF;
      
      -- Vérification SMS avec nouvelle logique
      IF shop_record.sms_credits_used >= effective_sms_limit THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Crédits SMS épuisés (%s/%s)', shop_record.sms_credits_used, effective_sms_limit),
          'action', CASE WHEN shop_record.custom_sms_limit IS NOT NULL 
            THEN 'contact_support' 
            ELSE 'buy_sms_package' 
          END
        );
      END IF;
  END CASE;
  
  RETURN jsonb_build_object('allowed', true, 'reason', 'Within limits');
END;
$function$;