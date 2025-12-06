-- Add show_satisfaction_survey column to shop_sav_types
ALTER TABLE public.shop_sav_types 
ADD COLUMN show_satisfaction_survey BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.shop_sav_types.show_satisfaction_survey IS 
'Afficher le bouton de questionnaire de satisfaction pour ce type de SAV';