ALTER TABLE public.inventory_session_items
DROP CONSTRAINT IF EXISTS inventory_session_items_expected_quantity_check;

COMMENT ON COLUMN public.inventory_session_items.expected_quantity IS
'Instantané du stock virtuel au démarrage de la session d''inventaire. Peut être négatif si le stock Fixway est déjà en anomalie.';