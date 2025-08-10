-- Supprimer la colonne ovh_job_id de la table sms_history
ALTER TABLE public.sms_history 
DROP COLUMN IF EXISTS ovh_job_id;

-- Modifier la table subscription_plans pour simplifier la gestion SMS
ALTER TABLE public.subscription_plans 
DROP COLUMN IF EXISTS sms_cost;

-- Simplifier la table shops pour la gestion SMS future
COMMENT ON COLUMN public.shops.sms_credits_used IS 'SMS utilisés dans le mois en cours';
COMMENT ON COLUMN public.shops.sms_credits_allocated IS 'SMS alloués selon le plan d abonnement';

-- Nettoyer les fonctions liées à OVH SMS qui ne sont plus nécessaires
-- (Les fonctions edge ont déjà été supprimées)