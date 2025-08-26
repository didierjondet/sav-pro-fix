-- Ajouter un champ pour les pièces jointes dans les messages SAV
ALTER TABLE public.sav_messages 
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;