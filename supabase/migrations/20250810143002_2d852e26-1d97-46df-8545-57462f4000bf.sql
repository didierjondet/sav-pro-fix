-- Mettre à jour la table global_sms_credits pour mieux suivre les crédits réseau
-- Ajouter des colonnes pour le suivi détaillé

ALTER TABLE public.global_sms_credits 
ADD COLUMN IF NOT EXISTS twilio_balance_usd DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';

-- Vérifier s'il n'y a pas d'enregistrement existant, sinon en insérer un
INSERT INTO public.global_sms_credits (
  id, 
  total_credits, 
  used_credits,
  twilio_balance_usd,
  last_sync_at,
  sync_status
) 
SELECT 
  '00000000-0000-0000-0000-000000000001',
  0,
  0,
  0.00,
  now(),
  'initial'
WHERE NOT EXISTS (
  SELECT 1 FROM public.global_sms_credits 
  WHERE id = '00000000-0000-0000-0000-000000000001'
);

-- Commenter la table pour clarifier son usage
COMMENT ON TABLE public.global_sms_credits IS 'Table pour stocker les crédits SMS globaux du réseau Twilio';
COMMENT ON COLUMN public.global_sms_credits.twilio_balance_usd IS 'Solde USD du compte Twilio principal';
COMMENT ON COLUMN public.global_sms_credits.last_sync_at IS 'Dernière synchronisation avec Twilio';
COMMENT ON COLUMN public.global_sms_credits.sync_status IS 'Statut de la dernière synchronisation';