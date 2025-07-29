-- Activer REPLICA IDENTITY FULL pour la table sav_messages
ALTER TABLE public.sav_messages REPLICA IDENTITY FULL;

-- Ajouter la table sav_messages à la publication realtime si pas déjà fait
ALTER PUBLICATION supabase_realtime ADD TABLE public.sav_messages;