-- Créer les tables pour la facturation

-- Table pour les factures d'abonnement mensuel
CREATE TABLE public.subscription_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed, refunded
  stripe_invoice_id TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Table pour les factures d'achat SMS
CREATE TABLE public.sms_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  package_id UUID NOT NULL,
  sms_count INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed, refunded
  stripe_payment_intent_id TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Activer RLS
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_invoices ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les factures d'abonnement
CREATE POLICY "Shop users can view their subscription invoices" 
ON public.subscription_invoices 
FOR SELECT 
USING (shop_id = get_current_user_shop_id());

CREATE POLICY "Super admins can manage all subscription invoices" 
ON public.subscription_invoices 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Politiques RLS pour les factures SMS
CREATE POLICY "Shop users can view their SMS invoices" 
ON public.sms_invoices 
FOR SELECT 
USING (shop_id = get_current_user_shop_id());

CREATE POLICY "Super admins can manage all SMS invoices" 
ON public.sms_invoices 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Trigger pour la mise à jour automatique des timestamps
CREATE TRIGGER update_subscription_invoices_updated_at
BEFORE UPDATE ON public.subscription_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sms_invoices_updated_at
BEFORE UPDATE ON public.sms_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX idx_subscription_invoices_shop_id ON public.subscription_invoices(shop_id);
CREATE INDEX idx_subscription_invoices_period ON public.subscription_invoices(period_start, period_end);
CREATE INDEX idx_sms_invoices_shop_id ON public.sms_invoices(shop_id);
CREATE INDEX idx_sms_invoices_created_at ON public.sms_invoices(created_at);