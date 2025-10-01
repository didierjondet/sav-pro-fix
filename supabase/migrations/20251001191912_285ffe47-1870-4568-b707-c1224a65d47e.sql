-- Améliorer la fonction get_sms_credits_breakdown pour inclure la réinitialisation mensuelle
CREATE OR REPLACE FUNCTION public.get_sms_credits_breakdown(p_shop_id uuid)
RETURNS TABLE(
  monthly_allocated integer,
  monthly_used integer,
  monthly_remaining integer,
  purchased_total integer,
  admin_added integer,
  purchased_and_admin_used integer,
  purchased_and_admin_remaining integer,
  total_available integer,
  total_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  shop_record RECORD;
  packages_total integer := 0;
BEGIN
  -- Appeler la réinitialisation mensuelle en premier
  PERFORM reset_monthly_counters();
  
  -- Récupérer les données du shop après réinitialisation
  SELECT * INTO shop_record FROM public.shops WHERE id = p_shop_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculer le total des packages achetés
  SELECT COALESCE(SUM(sms_count), 0) INTO packages_total
  FROM public.sms_package_purchases
  WHERE shop_id = p_shop_id 
  AND status = 'completed';
  
  -- Retourner les valeurs calculées
  monthly_allocated := COALESCE(shop_record.sms_credits_allocated, 0);
  monthly_used := COALESCE(shop_record.monthly_sms_used, 0);
  monthly_remaining := GREATEST(0, monthly_allocated - monthly_used);
  
  purchased_total := packages_total;
  admin_added := COALESCE(shop_record.admin_added_sms_credits, 0);
  purchased_and_admin_used := COALESCE(shop_record.purchased_sms_credits, 0);
  purchased_and_admin_remaining := GREATEST(0, (purchased_total + admin_added) - purchased_and_admin_used);
  
  total_available := monthly_allocated + purchased_total + admin_added;
  total_remaining := monthly_remaining + purchased_and_admin_remaining;
  
  RETURN NEXT;
END;
$function$;