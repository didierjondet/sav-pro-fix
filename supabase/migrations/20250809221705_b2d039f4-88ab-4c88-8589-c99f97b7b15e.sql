-- Ajouter une colonne pour activer/désactiver l'envoi automatique d'avis
ALTER TABLE public.shops 
ADD COLUMN auto_review_enabled boolean NOT NULL DEFAULT true;