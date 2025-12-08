-- Nettoyer les type_key dans shop_sav_types : trim + remplacer espaces par underscores
UPDATE shop_sav_types 
SET type_key = REPLACE(TRIM(type_key), ' ', '_')
WHERE type_key LIKE '% %' OR type_key LIKE '% ' OR type_key LIKE ' %';

-- Nettoyer les sav_type dans sav_cases : trim + remplacer espaces par underscores
UPDATE sav_cases 
SET sav_type = REPLACE(TRIM(sav_type), ' ', '_')
WHERE sav_type LIKE '% %' OR sav_type LIKE '% ' OR sav_type LIKE ' %';