-- Supprimer la politique RESTRICTIVE défaillante qui bloque tout
DROP POLICY IF EXISTS "Deny all access to unauthenticated users" ON customers;

-- Recréer une politique RESTRICTIVE correcte qui bloque seulement les utilisateurs non authentifiés
CREATE POLICY "Block unauthenticated access to customers" 
ON customers 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);