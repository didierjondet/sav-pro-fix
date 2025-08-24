-- Ajouter une politique de suppression pour les messages clients (publique)
CREATE POLICY "Public can delete client messages within 1 minute"
ON sav_messages
FOR DELETE
USING (
  sender_type = 'client' AND
  created_at > (NOW() - INTERVAL '1 minute')
);

-- Ajouter une politique de suppression pour les messages des magasins (authentifié)
CREATE POLICY "Shop users can delete their SAV messages within 1 minute"
ON sav_messages 
FOR DELETE
USING (
  shop_id IN (
    SELECT profiles.shop_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  ) AND 
  sender_type = 'shop' AND
  created_at > (NOW() - INTERVAL '1 minute')
);