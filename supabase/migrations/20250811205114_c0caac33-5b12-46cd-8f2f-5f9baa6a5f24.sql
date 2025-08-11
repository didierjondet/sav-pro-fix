-- Ajouter des colonnes pour les limites personnalisées par magasin
ALTER TABLE public.shops 
ADD COLUMN custom_sav_limit INTEGER,
ADD COLUMN custom_sms_limit INTEGER;

-- Mettre à jour la fonction de vérification des limites pour prendre en compte les limites personnalisées
CREATE OR REPLACE FUNCTION public.check_subscription_limits_v2(p_shop_id uuid, p_action text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  shop_record RECORD;
  plan_record RECORD;
  effective_sav_limit INTEGER;
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
  
  -- Déterminer les limites effectives (personnalisées ou du plan)
  effective_sav_limit := COALESCE(shop_record.custom_sav_limit, plan_record.sav_limit);
  effective_sms_limit := COALESCE(shop_record.custom_sms_limit, plan_record.sms_limit, shop_record.sms_credits_allocated);
  
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
      -- Vérifier les limites SMS avec les limites effectives
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
      
      IF shop_record.sms_credits_used >= effective_sms_limit THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', 'Crédits SMS épuisés',
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