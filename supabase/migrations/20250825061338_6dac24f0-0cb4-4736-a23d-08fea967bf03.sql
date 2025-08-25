-- Analyse et correction du problème de sécurité dans sav_messages
-- Problème : Pas de politique SELECT publique permettant aux clients de lire les messages de suivi
-- Solution : Ajouter une politique SELECT publique sécurisée pour le tracking

-- Politique publique sécurisée pour la lecture des messages de suivi SAV
-- Permet aux utilisateurs publics de lire UNIQUEMENT les messages liés à un SAV case 
-- qui a un tracking_slug valide (fonctionnalité de suivi public)
CREATE POLICY "Public can read tracking messages"
ON public.sav_messages
FOR SELECT
TO public
USING (
  -- Vérifier que le SAV case associé a un tracking_slug (donc est accessible publiquement)
  sav_case_id IN (
    SELECT id 
    FROM public.sav_cases 
    WHERE tracking_slug IS NOT NULL 
    AND tracking_slug != ''
  )
);

-- Mettre à jour la politique existante pour les utilisateurs authentifiés du magasin
-- pour s'assurer qu'elle reste prioritaire et sécurisée
DROP POLICY IF EXISTS "Shop users can view their SAV messages" ON public.sav_messages;

CREATE POLICY "Shop users can view their SAV messages"
ON public.sav_messages
FOR SELECT
TO authenticated
USING (
  shop_id IN (
    SELECT profiles.shop_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
);

-- Améliorer la politique de suppression publique pour plus de sécurité
DROP POLICY IF EXISTS "Public can delete client messages within 1 minute" ON public.sav_messages;

CREATE POLICY "Public can delete client messages within 1 minute"
ON public.sav_messages
FOR DELETE
TO public
USING (
  sender_type = 'client'
  AND created_at > (now() - interval '1 minute')
  -- Seulement pour les messages liés à des SAV cases avec tracking_slug
  AND sav_case_id IN (
    SELECT id 
    FROM public.sav_cases 
    WHERE tracking_slug IS NOT NULL 
    AND tracking_slug != ''
  )
);