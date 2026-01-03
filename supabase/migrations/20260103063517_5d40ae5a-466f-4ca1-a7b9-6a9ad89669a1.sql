-- Ajouter la colonne sav_type à la table quotes pour stocker le type de SAV choisi lors de la conversion
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sav_type text;

COMMENT ON COLUMN quotes.sav_type IS 'Type de SAV choisi lors de la conversion (ex: client, external, custom_type)';