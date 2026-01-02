CREATE OR REPLACE FUNCTION public.check_subscription_limits_v2(p_shop_id uuid, p_action text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  shop_record RECORD;
  plan_record RECORD;
  effective_sav_limit INTEGER;
  total_sms_purchased INTEGER;
  effective_sms_limit INTEGER;
  result jsonb;
BEGIN
  -- D'abord, vérifier et remettre à zéro les compteurs mensuels si nécessaire
  PERFORM reset_monthly_counters();
  
  -- Récupérer les informations du shop
  SELECT * INTO shop_record FROM public.shops WHERE id = p_shop_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Shop not found');
  END IF;
  
  -- Si abonnement forcé, autoriser tout
  IF shop_record.subscription_forced THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'Forced subscription - checks disabled');
  END IF;
  
  -- Récupérer les limites du plan d'abonnement
  IF shop_record.subscription_plan_id IS NOT NULL THEN
    SELECT * INTO plan_record FROM public.subscription_plans WHERE id = shop_record.subscription_plan_id;
  ELSE
    SELECT * INTO plan_record FROM public.subscription_plans 
    WHERE LOWER(name) = LOWER(shop_record.subscription_tier) 
    AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Calculer le total des SMS achetés via packages
  SELECT COALESCE(SUM(sms_count), 0) INTO total_sms_purchased
  FROM public.sms_package_purchases
  WHERE shop_id = p_shop_id AND status = 'completed';
  
  -- Déterminer la limite SAV effective :
  -- 1. Si custom_sav_limit est défini par le super admin -> utiliser cette valeur
  -- 2. Sinon -> utiliser la limite du plan d'abonnement (plan_record.sav_limit)
  effective_sav_limit := COALESCE(shop_record.custom_sav_limit, plan_record.sav_limit);
  
  -- Calcul SMS : même logique (custom > plan)
  IF shop_record.custom_sms_limit IS NOT NULL THEN
    effective_sms_limit := shop_record.custom_sms_limit + total_sms_purchased;
  ELSE
    effective_sms_limit := COALESCE(plan_record.sms_limit, shop_record.sms_credits_allocated, 0) + total_sms_purchased;
  END IF;
  
  -- Vérifications basées sur l'action
  CASE p_action
    WHEN 'sav' THEN
      -- CORRECTION: Utiliser monthly_sav_count (compteur mensuel) au lieu de active_sav_count (total historique)
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
      -- Plan gratuit sans limite définie : limite par défaut de 5
      ELSIF effective_sav_limit IS NULL AND shop_record.subscription_tier = 'free' AND shop_record.monthly_sav_count >= 5 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Plan Gratuit limité à 5 SAV par mois (%s/5). Renouvellement le 1er du mois prochain.', shop_record.monthly_sav_count),
          'action', 'upgrade_plan'
        );
      END IF;
      
    WHEN 'sms' THEN
      IF shop_record.sms_credits_used >= effective_sms_limit THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Crédits SMS épuisés (%s/%s). Achetez des SMS supplémentaires.', 
            shop_record.sms_credits_used, 
            effective_sms_limit
          ),
          'action', 'buy_sms_package'
        );
      END IF;
      
    ELSE
      -- Vérification générale (les deux)
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
      
      IF shop_record.sms_credits_used >= effective_sms_limit THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Crédits SMS épuisés', 'action', 'buy_sms_package');
      END IF;
  END CASE;
  
  RETURN jsonb_build_object('allowed', true, 'reason', 'Dans les limites autorisées');
END;
$$;