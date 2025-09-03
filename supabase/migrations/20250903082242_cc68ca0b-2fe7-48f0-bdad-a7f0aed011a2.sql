-- Ajouter un champ pour stocker la date et l'heure d'envoi SMS des devis
ALTER TABLE public.quotes 
ADD COLUMN sms_sent_at TIMESTAMP WITH TIME ZONE;