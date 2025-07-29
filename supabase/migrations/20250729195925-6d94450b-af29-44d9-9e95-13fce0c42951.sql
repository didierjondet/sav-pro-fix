-- Le problème est que auth.uid() retourne NULL
-- Solution temporaire: politique plus permissive pour déboguer

-- Supprimer la politique actuelle
DROP POLICY IF EXISTS "New users can create first shop" ON public.shops;

-- Créer une politique temporaire très permissive pour déboguer
CREATE POLICY "Temporary shop creation debug" 
ON public.shops 
FOR INSERT 
TO authenticated
WITH CHECK (true);  -- Temporaire pour identifier le vrai problème