-- Ajouter un champ pour les commentaires privés du magasin dans les dossiers SAV
ALTER TABLE public.sav_cases 
ADD COLUMN private_comments TEXT;