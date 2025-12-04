-- Add exclude_from_stats column to shop_sav_types
ALTER TABLE shop_sav_types 
ADD COLUMN exclude_from_stats BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN shop_sav_types.exclude_from_stats IS 
'Si activé, les valeurs financières (coût pièces, revenus, marge) des SAV de ce type ne sont pas comptabilisées dans les statistiques';

-- Create index for better query performance
CREATE INDEX idx_shop_sav_types_exclude_from_stats ON shop_sav_types(exclude_from_stats) WHERE exclude_from_stats = true;