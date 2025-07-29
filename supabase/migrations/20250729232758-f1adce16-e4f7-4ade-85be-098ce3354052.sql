-- Activer les mises à jour temps réel pour la table sav_cases
ALTER TABLE public.sav_cases REPLICA IDENTITY FULL;

-- Ajouter la table à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sav_cases;