-- Ajouter un champ contact_only à la table subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN contact_only boolean NOT NULL DEFAULT false;

-- Ajouter les champs coordonnées à la table landing_content
ALTER TABLE public.landing_content 
ADD COLUMN contact_address text,
ADD COLUMN contact_email text,
ADD COLUMN contact_phone text,
ADD COLUMN show_address boolean DEFAULT false,
ADD COLUMN show_email boolean DEFAULT false,
ADD COLUMN show_phone boolean DEFAULT false;