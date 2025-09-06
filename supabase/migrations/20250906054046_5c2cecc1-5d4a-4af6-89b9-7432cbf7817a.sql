-- Créer la table pour les alertes système
CREATE TABLE public.system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  threshold_value NUMERIC,
  check_frequency_hours INTEGER DEFAULT 24,
  sms_message_1 TEXT,
  sms_message_2 TEXT,
  sms_message_3 TEXT,
  last_check_at TIMESTAMP WITH TIME ZONE,
  last_alert_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Politique pour les super admins uniquement
CREATE POLICY "Super admins can manage all system alerts" 
ON public.system_alerts 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Créer l'alerte SMS par défaut
INSERT INTO public.system_alerts (
  alert_type,
  name,
  is_enabled,
  threshold_value,
  sms_message_1,
  sms_message_2,
  sms_message_3
) VALUES (
  'sms_credits',
  'Alerte charge SMS générale',
  false,
  100,
  'ALERTE: Il vous reste moins de ${threshold} crédits SMS sur votre compte Twilio.',
  'URGENT: Crédits SMS très bas (${remaining}). Rechargez rapidement pour éviter les interruptions.',
  'CRITIQUE: Plus que ${remaining} crédits SMS restants. Rechargement immédiat requis.'
);

-- Trigger pour updated_at
CREATE TRIGGER update_system_alerts_updated_at
BEFORE UPDATE ON public.system_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table pour l'historique des alertes envoyées
CREATE TABLE public.alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.system_alerts(id) ON DELETE CASCADE,
  message_sent TEXT NOT NULL,
  threshold_value NUMERIC,
  current_value NUMERIC,
  phone_number TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS pour l'historique
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- Politique pour les super admins
CREATE POLICY "Super admins can view alert history" 
ON public.alert_history 
FOR SELECT 
USING (is_super_admin());