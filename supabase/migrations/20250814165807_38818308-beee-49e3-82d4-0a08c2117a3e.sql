-- Activer les mises à jour en temps réel pour la table sav_parts
ALTER TABLE public.sav_parts REPLICA IDENTITY FULL;

-- Ajouter la table à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sav_parts;