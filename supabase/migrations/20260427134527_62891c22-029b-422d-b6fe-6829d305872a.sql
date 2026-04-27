-- Table de logs des envois d'emails
CREATE TABLE IF NOT EXISTS public.email_send_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  context TEXT, -- ex: 'invitation', 'invoice_notification', 'contact_form'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour requêtes temporelles
CREATE INDEX IF NOT EXISTS idx_email_send_logs_created_at 
  ON public.email_send_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_send_logs_shop 
  ON public.email_send_logs (shop_id, created_at DESC);

-- RLS
ALTER TABLE public.email_send_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les super_admin peuvent lire les logs
CREATE POLICY "Super admins can read email logs"
  ON public.email_send_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

-- Pas de politique INSERT/UPDATE/DELETE: les Edge Functions utiliseront le service_role
