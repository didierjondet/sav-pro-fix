-- Ajouter les colonnes device_color et device_grade dans sav_cases
ALTER TABLE sav_cases 
  ADD COLUMN IF NOT EXISTS device_color text,
  ADD COLUMN IF NOT EXISTS device_grade text CHECK (device_grade IN ('A', 'B', 'C', 'D'));

-- Créer des index pour améliorer les performances des filtres
CREATE INDEX IF NOT EXISTS idx_sav_cases_device_color ON sav_cases(device_color);
CREATE INDEX IF NOT EXISTS idx_sav_cases_device_grade ON sav_cases(device_grade);