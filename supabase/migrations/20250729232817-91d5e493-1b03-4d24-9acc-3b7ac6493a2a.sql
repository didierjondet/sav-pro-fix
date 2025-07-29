-- Activer REPLICA IDENTITY FULL pour capturer toutes les données lors des mises à jour
ALTER TABLE public.sav_cases REPLICA IDENTITY FULL;