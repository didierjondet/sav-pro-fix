-- Vérifier et corriger les paramètres du bucket part-photos pour l'affichage public des vignettes
UPDATE storage.buckets 
SET public = true 
WHERE id = 'part-photos';