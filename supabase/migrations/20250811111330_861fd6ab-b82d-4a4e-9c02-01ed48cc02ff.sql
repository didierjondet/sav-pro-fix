-- Mettre à jour la fonction de vérification des limites avec les bonnes valeurs
CREATE OR REPLACE FUNCTION public.check_subscription_limits_v2(p_shop_id uuid, p_action text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  ELSE
    -- Récupérer le plan par défaut basé sur le tier
    SELECT * INTO plan_record FROM public.subscription_plans 
    WHERE LOWER(name) = LOWER(shop_record.subscription_tier) 
    AND is_active = true
    LIMIT 1;
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
      ELSIF shop_record.subscription_tier = 'free' AND shop_record.active_sav_count >= 5 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Plan Gratuit limité à 5 SAV actifs (%s/5). Passez au plan Premium.', shop_record.active_sav_count),
          'action', 'upgrade_plan'
        );
      ELSIF shop_record.subscription_tier = 'premium' AND shop_record.active_sav_count >= 50 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Plan Premium limité à 50 SAV simultanés (%s/50). Passez au plan Enterprise.', shop_record.active_sav_count),
          'action', 'upgrade_plan'
        );
      ELSIF shop_record.subscription_tier = 'enterprise' AND shop_record.active_sav_count >= 100 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', format('Plan Enterprise limité à 100 SAV simultanés (%s/100).', shop_record.active_sav_count),
          'action', 'contact_support'
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
      ELSIF shop_record.subscription_tier = 'free' AND shop_record.active_sav_count >= 5 THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', 'Plan Gratuit limité à 5 SAV actifs',
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
$$;