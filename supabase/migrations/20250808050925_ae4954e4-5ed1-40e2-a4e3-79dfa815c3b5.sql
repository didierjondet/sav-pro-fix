-- Ajouter le champ subscription_forced à la table shops
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS subscription_forced BOOLEAN DEFAULT false;