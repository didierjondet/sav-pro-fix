-- Ajouter une colonne pour personnaliser le message SMS de notification de statut
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS custom_status_sms_message text;

COMMENT ON COLUMN public.shops.custom_status_sms_message IS 'Message SMS personnalisé pour les notifications de statut SAV (variables: {customer_name}, {case_number}, {tracking_url})';