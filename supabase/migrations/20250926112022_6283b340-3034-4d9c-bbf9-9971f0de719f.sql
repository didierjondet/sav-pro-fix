-- Corriger les types SAV obsolètes pour assurer la cohérence
-- Mettre à jour les dossiers SAV avec d'anciens types vers les nouveaux types standardisés

-- D'abord, s'assurer que nous avons les types de base dans la table shop_sav_types
-- Récupérer un shop_id existant pour les opérations
DO $$
DECLARE
    default_shop_id uuid;
BEGIN
    -- Récupérer le premier shop_id disponible
    SELECT id INTO default_shop_id FROM shops LIMIT 1;
    
    IF default_shop_id IS NOT NULL THEN
        -- S'assurer que les types de base existent
        INSERT INTO shop_sav_types (shop_id, type_key, type_label, type_color, is_default, display_order)
        VALUES 
            (default_shop_id, 'client', 'SAV CLIENT', '#22c55e', true, 1),
            (default_shop_id, 'internal', 'SAV INTERNE', '#3b82f6', true, 2),
            (default_shop_id, 'external', 'SAV EXTERNE', '#f59e0b', true, 3)
        ON CONFLICT (shop_id, type_key) DO UPDATE SET
            type_label = EXCLUDED.type_label,
            is_default = EXCLUDED.is_default;
    END IF;
END $$;

-- Fonction pour mapper les anciens types vers les nouveaux types standardisés
CREATE OR REPLACE FUNCTION map_legacy_sav_type(old_type text) RETURNS text AS $$
BEGIN
    CASE old_type
        WHEN 'SAVPC' THEN RETURN 'client';
        WHEN 'SAV PC CLIENT' THEN RETURN 'client';
        WHEN 'SAV PC MAG' THEN RETURN 'internal';
        WHEN 'SAV CONSOLE CLIENT' THEN RETURN 'client';
        WHEN 'SAV CONSOLE MAG' THEN RETURN 'internal';
        WHEN 'SAV OCMI CLIENT' THEN RETURN 'client';
        WHEN 'SAVPARTENAIRE' THEN RETURN 'external';
        WHEN 'SAV TEL CLIENT' THEN RETURN 'client';
        WHEN 'SAV TEL EXTERNE' THEN RETURN 'external';
        WHEN 'SAV TEL INTERNE' THEN RETURN 'internal';
        ELSE RETURN old_type; -- Garder le type s'il est déjà standard
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour tous les dossiers SAV avec les nouveaux types standardisés
UPDATE sav_cases 
SET sav_type = map_legacy_sav_type(sav_type::text)::sav_type
WHERE sav_type::text IN (
    'SAVPC', 
    'SAV PC CLIENT', 
    'SAV PC MAG', 
    'SAV CONSOLE CLIENT', 
    'SAV CONSOLE MAG', 
    'SAV OCMI CLIENT', 
    'SAVPARTENAIRE',
    'SAV TEL CLIENT',
    'SAV TEL EXTERNE', 
    'SAV TEL INTERNE'
);

-- Nettoyer la fonction temporaire
DROP FUNCTION map_legacy_sav_type(text);