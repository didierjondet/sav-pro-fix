-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.execute_custom_widget_query(TEXT, TEXT[]);

-- Créer une fonction améliorée qui gère correctement les types
CREATE OR REPLACE FUNCTION public.execute_custom_widget_query(
  query_text TEXT,
  shop_id_param UUID,
  param2 TEXT DEFAULT NULL,
  param3 TEXT DEFAULT NULL,
  param4 TEXT DEFAULT NULL,
  param5 TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_data JSONB;
BEGIN
  -- Exécuter la requête dynamique avec les paramètres typés correctement
  -- $1 = shop_id (UUID), $2-$5 = paramètres additionnels (TEXT ou castés en INT si nécessaire)
  
  EXECUTE format('
    WITH query_result AS (%s)
    SELECT COALESCE(jsonb_agg(row_to_json(query_result.*)), ''[]''::jsonb) FROM query_result
  ', query_text)
  INTO result_data
  USING shop_id_param, param2::INT, param3, param4, param5;
  
  RETURN result_data;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur lors de l''exécution de la requête personnalisée: %', SQLERRM;
END;
$$;