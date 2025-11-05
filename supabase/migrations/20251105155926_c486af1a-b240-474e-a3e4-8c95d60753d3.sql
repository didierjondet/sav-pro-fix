-- Créer une fonction pour exécuter des requêtes SQL personnalisées pour les widgets
-- Cette fonction est sécurisée car elle est appelée uniquement via Edge Function avec authentification

CREATE OR REPLACE FUNCTION public.execute_custom_widget_query(
  query_text TEXT,
  query_params TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_data JSONB;
BEGIN
  -- Exécuter la requête dynamique avec les paramètres
  -- Les paramètres sont passés dans l'ordre: $1 = shop_id, $2 = year, etc.
  EXECUTE format('
    WITH query_result AS (%s)
    SELECT jsonb_agg(row_to_json(query_result.*)) FROM query_result
  ', query_text)
  INTO result_data
  USING query_params[1], query_params[2], query_params[3], query_params[4], query_params[5];
  
  -- Si pas de résultats, retourner un tableau vide
  IF result_data IS NULL THEN
    result_data := '[]'::JSONB;
  END IF;
  
  RETURN result_data;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur lors de l''exécution de la requête personnalisée: %', SQLERRM;
END;
$$;