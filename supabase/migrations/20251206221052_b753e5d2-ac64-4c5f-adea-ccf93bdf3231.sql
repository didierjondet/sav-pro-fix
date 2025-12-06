-- Supprimer l'ancienne contrainte
ALTER TABLE widget_configurations 
DROP CONSTRAINT widget_configurations_temporality_check;

-- Ajouter la nouvelle contrainte avec monthly_calendar
ALTER TABLE widget_configurations 
ADD CONSTRAINT widget_configurations_temporality_check 
CHECK (temporality = ANY (ARRAY['monthly'::text, 'monthly_calendar'::text, 'quarterly'::text, 'yearly'::text]));