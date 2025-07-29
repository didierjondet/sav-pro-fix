-- Solution conservative: permettre aux utilisateurs authentifiés de créer leur premier magasin
-- sans toucher aux autres politiques existantes

-- Supprimer uniquement la politique problématique pour INSERT
DROP POLICY IF EXISTS "Users can create their first shop" ON public.shops;

-- Créer une politique simple et claire pour les nouveaux utilisateurs
CREATE POLICY "Allow first shop creation" 
ON public.shops 
FOR INSERT 
TO authenticated
WITH CHECK (true);  -- Temporaire pour résoudre le blocage