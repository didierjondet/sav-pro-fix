-- Supprimer la fonction SQL obsolète qui n'est plus utilisée
-- Le système utilise maintenant des variables prédéfinies au lieu de SQL dynamique
DROP FUNCTION IF EXISTS public.execute_custom_widget_query(text, text[]);