-- Création de la table d'historique des crédits SMS ajoutés manuellement par l'admin
CREATE TABLE public.admin_sms_credits_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  credits_added INTEGER NOT NULL,
  admin_user_id UUID REFERENCES auth.users(id),
  admin_name TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_sms_credits_history ENABLE ROW LEVEL SECURITY;

-- Policy: Only super admins can manage this table
CREATE POLICY "Super admins can manage admin SMS credits history"
ON public.admin_sms_credits_history
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Index pour les requêtes par shop_id
CREATE INDEX idx_admin_sms_credits_history_shop_id ON public.admin_sms_credits_history(shop_id);

-- Commentaire sur la table
COMMENT ON TABLE public.admin_sms_credits_history IS 'Historique des crédits SMS ajoutés manuellement par le super admin';