-- Créer table pour historique SMS
CREATE TABLE IF NOT EXISTS public.sms_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  to_number TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'quote', 'sav', 'notification'
  record_id UUID, -- ID du devis ou SAV concerné
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  ovh_job_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_history ENABLE ROW LEVEL SECURITY;

-- Policies pour sms_history
CREATE POLICY "Shop users can view their SMS history" 
ON public.sms_history 
FOR SELECT 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Shop users can insert their SMS history" 
ON public.sms_history 
FOR INSERT 
WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Super admins can manage all SMS history" 
ON public.sms_history 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Trigger pour updated_at
CREATE TRIGGER update_sms_history_updated_at
BEFORE UPDATE ON public.sms_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter index pour les requêtes fréquentes
CREATE INDEX idx_sms_history_shop_id ON public.sms_history(shop_id);
CREATE INDEX idx_sms_history_type_record ON public.sms_history(type, record_id);
CREATE INDEX idx_sms_history_created_at ON public.sms_history(created_at DESC);