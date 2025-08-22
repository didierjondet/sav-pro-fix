-- Ajouter les champs pour les accessoires et le schéma de verrouillage dans la table sav_cases
ALTER TABLE public.sav_cases 
ADD COLUMN accessories JSONB DEFAULT '{"charger": false, "case": false, "screen_protector": false}'::jsonb,
ADD COLUMN unlock_pattern JSONB DEFAULT NULL;