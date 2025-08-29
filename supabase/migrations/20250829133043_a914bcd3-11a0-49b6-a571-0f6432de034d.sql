-- Ajouter la colonne commentaire technicien aux dossiers SAV
ALTER TABLE public.sav_cases 
ADD COLUMN technician_comments TEXT;