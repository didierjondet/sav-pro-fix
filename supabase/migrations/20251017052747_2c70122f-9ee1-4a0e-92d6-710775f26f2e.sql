-- Vérifier et configurer la réplication en temps réel pour sav_cases
-- Cela permettra aux changements de statut d'être détectés immédiatement

-- S'assurer que REPLICA IDENTITY est configuré pour capturer toutes les colonnes
ALTER TABLE public.sav_cases REPLICA IDENTITY FULL;

-- Ajouter la table à la publication realtime si elle n'y est pas déjà
DO $$
BEGIN
  -- Vérifier si la table est déjà dans la publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'sav_cases'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sav_cases;
  END IF;
END $$;