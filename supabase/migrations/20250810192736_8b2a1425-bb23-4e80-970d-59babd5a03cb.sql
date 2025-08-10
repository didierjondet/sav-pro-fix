-- Ajouter les colonnes pour les documents légaux dans la table landing_content
ALTER TABLE public.landing_content 
ADD COLUMN IF NOT EXISTS cgv_content TEXT,
ADD COLUMN IF NOT EXISTS cgu_content TEXT,
ADD COLUMN IF NOT EXISTS privacy_policy TEXT;