-- Correction des problèmes de sécurité search_path
-- Les fonctions doivent avoir un search_path explicite

-- Recréer la fonction calculate_invoice_amounts avec search_path
CREATE OR REPLACE FUNCTION public.calculate_invoice_amounts()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Si amount_cents est défini (montant HT), calculer TVA et TTC
  IF NEW.amount_cents IS NOT NULL AND NEW.vat_rate IS NOT NULL THEN
    NEW.total_ht_cents := NEW.amount_cents;
    NEW.vat_amount_cents := ROUND(NEW.amount_cents * NEW.vat_rate / 100);
    NEW.total_ttc_cents := NEW.total_ht_cents + NEW.vat_amount_cents;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recréer la fonction generate_invoice_number avec search_path
CREATE OR REPLACE FUNCTION public.generate_invoice_number(invoice_type TEXT)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;