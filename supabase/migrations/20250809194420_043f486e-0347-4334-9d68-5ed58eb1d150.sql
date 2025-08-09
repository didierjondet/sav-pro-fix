-- Ajouter un champ pour l'adresse d'avis Google dans la table shops
ALTER TABLE public.shops 
ADD COLUMN review_link TEXT;