-- ============================================
-- PHASE 1: SYSTÈME DE FACTURATION AUTOMATIQUE
-- ============================================

-- Table de configuration des factures (graphique, légal, etc.)
CREATE TABLE IF NOT EXISTS public.invoice_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'HAPICS',
  company_legal_form TEXT NOT NULL DEFAULT 'SAS',
  service_name TEXT NOT NULL DEFAULT 'Fixway',
  company_address TEXT,
  company_postal_code TEXT,
  company_city TEXT,
  company_siret TEXT,
  company_vat_number TEXT,
  company_email TEXT,
  company_phone TEXT,
  company_website TEXT,
  header_logo_url TEXT,
  header_text TEXT,
  footer_text TEXT DEFAULT 'SAS HAPICS - Capital social: 1000€ - SIRET: XXX XXX XXX - RCS Paris',
  vat_rate NUMERIC NOT NULL DEFAULT 20.0,
  legal_text TEXT DEFAULT 'Facture acquittée. TVA non applicable, article 293 B du CGI. Conditions de paiement: paiement à réception.',
  bank_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table de configuration des notifications de facturation
CREATE TABLE IF NOT EXISTS public.invoice_notifications_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('subscription', 'sms_package')),
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_message_template TEXT DEFAULT 'Bonjour {shop_name}, votre facture {invoice_number} d''un montant de {amount}€ est disponible. Consultez-la ici: {invoice_link}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(notification_type)
);

-- Modification de subscription_invoices pour ajouter la gestion TVA
ALTER TABLE public.subscription_invoices 
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT 20.0,
  ADD COLUMN IF NOT EXISTS vat_amount_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ht_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ttc_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;

-- Modification de sms_invoices pour ajouter la gestion TVA
ALTER TABLE public.sms_invoices 
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT 20.0,
  ADD COLUMN IF NOT EXISTS vat_amount_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ht_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ttc_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;

-- Insérer une configuration par défaut si elle n'existe pas
INSERT INTO public.invoice_config (
  company_name,
  company_legal_form,
  service_name,
  company_address,
  company_postal_code,
  company_city,
  footer_text,
  legal_text
) 
SELECT 
  'HAPICS',
  'SAS',
  'Fixway',
  'Adresse à configurer',
  '75001',
  'Paris',
  'SAS HAPICS - Capital social: 1000€ - SIRET: XXX XXX XXX - RCS Paris',
  'Facture acquittée. TVA non applicable, article 293 B du CGI. Conditions de paiement: paiement à réception.'
WHERE NOT EXISTS (SELECT 1 FROM public.invoice_config LIMIT 1);

-- Insérer les configurations de notifications par défaut
INSERT INTO public.invoice_notifications_config (notification_type, in_app_enabled, sms_enabled, sms_message_template)
VALUES 
  ('subscription', true, false, 'Bonjour {shop_name}, votre facture d''abonnement {invoice_number} d''un montant de {amount}€ est disponible. Consultez-la: {invoice_link}'),
  ('sms_package', true, false, 'Bonjour {shop_name}, votre facture d''achat SMS {invoice_number} d''un montant de {amount}€ est disponible. Consultez-la: {invoice_link}')
ON CONFLICT (notification_type) DO NOTHING;

-- RLS Policies pour invoice_config
ALTER TABLE public.invoice_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage invoice config" ON public.invoice_config;
CREATE POLICY "Super admins can manage invoice config" 
ON public.invoice_config 
FOR ALL 
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Everyone can view invoice config" ON public.invoice_config;
CREATE POLICY "Everyone can view invoice config" 
ON public.invoice_config 
FOR SELECT 
TO authenticated
USING (true);

-- RLS Policies pour invoice_notifications_config
ALTER TABLE public.invoice_notifications_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage notification config" ON public.invoice_notifications_config;
CREATE POLICY "Super admins can manage notification config" 
ON public.invoice_notifications_config 
FOR ALL 
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Everyone can view notification config" ON public.invoice_notifications_config;
CREATE POLICY "Everyone can view notification config" 
ON public.invoice_notifications_config 
FOR SELECT 
TO authenticated
USING (true);

-- Fonction pour calculer automatiquement les montants HT/TVA/TTC
CREATE OR REPLACE FUNCTION public.calculate_invoice_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Si amount_cents est défini (montant HT), calculer TVA et TTC
  IF NEW.amount_cents IS NOT NULL AND NEW.vat_rate IS NOT NULL THEN
    NEW.total_ht_cents := NEW.amount_cents;
    NEW.vat_amount_cents := ROUND(NEW.amount_cents * NEW.vat_rate / 100);
    NEW.total_ttc_cents := NEW.total_ht_cents + NEW.vat_amount_cents;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour subscription_invoices
DROP TRIGGER IF EXISTS calculate_subscription_invoice_amounts ON public.subscription_invoices;
CREATE TRIGGER calculate_subscription_invoice_amounts
  BEFORE INSERT OR UPDATE ON public.subscription_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_invoice_amounts();

-- Trigger pour sms_invoices
DROP TRIGGER IF EXISTS calculate_sms_invoice_amounts ON public.sms_invoices;
CREATE TRIGGER calculate_sms_invoice_amounts
  BEFORE INSERT OR UPDATE ON public.sms_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_invoice_amounts();

-- Fonction pour générer un numéro de facture unique
CREATE OR REPLACE FUNCTION public.generate_invoice_number(invoice_type TEXT)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_number TEXT;
  current_month TEXT;
BEGIN
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  -- Compter les factures du mois en cours pour ce type
  IF invoice_type = 'subscription' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.subscription_invoices
    WHERE invoice_number LIKE 'FAC-' || current_month || '-%';
  ELSIF invoice_type = 'sms' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.sms_invoices
    WHERE invoice_number LIKE 'FAC-' || current_month || '-%';
  END IF;
  
  -- Format: FAC-YYYY-MM-XXXXX
  invoice_number := 'FAC-' || current_month || '-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_shop_id ON public.subscription_invoices(shop_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_created_at ON public.subscription_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_invoices_shop_id ON public.sms_invoices(shop_id);
CREATE INDEX IF NOT EXISTS idx_sms_invoices_created_at ON public.sms_invoices(created_at DESC);

-- Bucket Storage pour les PDF de factures (à créer manuellement ou via l'interface Supabase)
-- Les fichiers seront organisés: invoices/subscription/{shop_id}/{year}/FAC-YYYY-MM-XXXXX.pdf
-- et: invoices/sms/{shop_id}/{year}/FAC-YYYY-MM-XXXXX.pdf

COMMENT ON TABLE public.invoice_config IS 'Configuration graphique et légale des factures (header, footer, TVA, etc.)';
COMMENT ON TABLE public.invoice_notifications_config IS 'Configuration des notifications lors de la publication de factures';
COMMENT ON COLUMN public.subscription_invoices.vat_rate IS 'Taux de TVA appliqué (20% en France)';
COMMENT ON COLUMN public.subscription_invoices.total_ht_cents IS 'Montant hors taxes en centimes';
COMMENT ON COLUMN public.subscription_invoices.vat_amount_cents IS 'Montant de la TVA en centimes';
COMMENT ON COLUMN public.subscription_invoices.total_ttc_cents IS 'Montant toutes taxes comprises en centimes';
COMMENT ON COLUMN public.subscription_invoices.invoice_data IS 'Snapshot des données de facturation au moment de la génération (config, magasin, etc.)';
COMMENT ON COLUMN public.subscription_invoices.notification_sent IS 'Indique si la notification a été envoyée au magasin';
COMMENT ON FUNCTION public.generate_invoice_number IS 'Génère un numéro de facture unique au format FAC-YYYY-MM-XXXXX';