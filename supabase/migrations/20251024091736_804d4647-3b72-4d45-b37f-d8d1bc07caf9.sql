-- Add require_unlock_pattern column to shop_sav_types table
ALTER TABLE shop_sav_types 
ADD COLUMN IF NOT EXISTS require_unlock_pattern boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN shop_sav_types.require_unlock_pattern IS 'Si true, le code de déverrouillage devient obligatoire pour ce type de SAV';