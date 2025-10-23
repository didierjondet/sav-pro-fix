-- Add hide_empty_sav_types column to shops table
ALTER TABLE shops 
ADD COLUMN hide_empty_sav_types boolean DEFAULT false;

COMMENT ON COLUMN shops.hide_empty_sav_types IS 
'Si true, masque les types de SAV sans SAV actif dans la sidebar';