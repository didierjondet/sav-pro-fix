-- Ajouter une colonne pour les crédits SMS ajoutés par le super admin
-- Ces crédits sont épuisables comme ceux achetés via packages
ALTER TABLE public.shops 
ADD COLUMN admin_added_sms_credits integer DEFAULT 0;

COMMENT ON COLUMN public.shops.admin_added_sms_credits IS 'Crédits SMS ajoutés manuellement par le super admin, épuisables sans contrainte temporelle';

-- Mettre à jour la fonction de vérification des limites pour tenir compte de la nouvelle logique
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
  -- Récupérer les données du shop
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