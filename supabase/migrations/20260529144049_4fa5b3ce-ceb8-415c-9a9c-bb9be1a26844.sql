-- Reset immédiat de tous les compteurs SMS mensuels
UPDATE public.shops SET monthly_sms_used = 0, last_monthly_reset = CURRENT_DATE;

-- Initialiser le pot global SMS à 250 (recrédit annoncé)
INSERT INTO public.global_sms_credits (id, total_credits, used_credits, twilio_balance_usd, sync_status, last_sync_at)
VALUES ('00000000-0000-0000-0000-000000000001', 250, 0, 0, 'manual', now())
ON CONFLICT (id) DO UPDATE SET total_credits = 250, used_credits = 0, last_sync_at = now(), sync_status = 'manual';

-- RPC reset global mensuel (admin)
CREATE OR REPLACE FUNCTION public.admin_reset_all_monthly_sms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Accès refusé: super admin requis';
  END IF;
  UPDATE public.shops SET monthly_sms_used = 0, last_monthly_reset = CURRENT_DATE;
END;
$$;

-- RPC reset mensuel pour une seule boutique
CREATE OR REPLACE FUNCTION public.admin_reset_shop_monthly_sms(p_shop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Accès refusé: super admin requis';
  END IF;
  UPDATE public.shops 
    SET monthly_sms_used = 0, last_monthly_reset = CURRENT_DATE 
    WHERE id = p_shop_id;
END;
$$;

-- RPC retirer crédits admin et réinjecter dans le pot global
CREATE OR REPLACE FUNCTION public.admin_remove_sms_credits(p_shop_id uuid, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Accès refusé: super admin requis';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Montant invalide';
  END IF;
  SELECT COALESCE(admin_added_sms_credits, 0) INTO v_current FROM public.shops WHERE id = p_shop_id;
  IF v_current < p_amount THEN
    RAISE EXCEPTION 'Crédits admin insuffisants (% disponibles)', v_current;
  END IF;
  UPDATE public.shops 
    SET admin_added_sms_credits = admin_added_sms_credits - p_amount 
    WHERE id = p_shop_id;
  UPDATE public.global_sms_credits 
    SET total_credits = total_credits + p_amount, last_sync_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000001';
  RETURN jsonb_build_object('success', true, 'reallocated', p_amount);
END;
$$;

-- RPC ajouter crédits admin (déduit du pot global si dispo)
CREATE OR REPLACE FUNCTION public.admin_add_sms_credits(p_shop_id uuid, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Accès refusé: super admin requis';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Montant invalide';
  END IF;
  UPDATE public.shops 
    SET admin_added_sms_credits = COALESCE(admin_added_sms_credits, 0) + p_amount 
    WHERE id = p_shop_id;
  UPDATE public.global_sms_credits 
    SET total_credits = GREATEST(0, total_credits - p_amount), last_sync_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000001';
  RETURN jsonb_build_object('success', true, 'added', p_amount);
END;
$$;