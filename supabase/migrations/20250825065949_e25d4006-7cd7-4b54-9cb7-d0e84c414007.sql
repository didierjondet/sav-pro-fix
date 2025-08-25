-- Corriger et simplifier les politiques RLS pour sav_messages
-- pour un système de messagerie unifié et fonctionnel

-- Supprimer toutes les politiques existantes pour recommencer
DROP POLICY IF EXISTS "Public can read tracking messages" ON public.sav_messages;
DROP POLICY IF EXISTS "Shop users can view their SAV messages" ON public.sav_messages;
DROP POLICY IF EXISTS "Public can delete client messages within 1 minute" ON public.sav_messages;
DROP POLICY IF EXISTS "Shop users can delete their SAV messages within 1 minute" ON public.sav_messages;

-- Politique SELECT unifiée : 
-- - Utilisateurs authentifiés peuvent voir tous les messages de leur magasin
-- - Utilisateurs publics peuvent voir les messages des SAV cases avec tracking_slug
CREATE POLICY "Unified view messages policy"
ON public.sav_messages
FOR SELECT
USING (
  -- Utilisateurs authentifiés du magasin
  (auth.uid() IS NOT NULL AND shop_id IN (
    SELECT profiles.shop_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  ))
  OR
  -- Utilisateurs publics pour les SAV cases avec tracking_slug
  (auth.uid() IS NULL AND sav_case_id IN (
    SELECT id 
    FROM public.sav_cases 
    WHERE tracking_slug IS NOT NULL 
    AND tracking_slug != ''
  ))
);

-- Politique DELETE unifiée : 
-- Permet la suppression dans les 60 secondes par le bon expéditeur
CREATE POLICY "Unified delete messages policy"
ON public.sav_messages
FOR DELETE
USING (
  created_at > (now() - interval '1 minute')
  AND (
    -- Messages du magasin par utilisateurs authentifiés
    (sender_type = 'shop' AND auth.uid() IS NOT NULL AND shop_id IN (
      SELECT profiles.shop_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    ))
    OR
    -- Messages clients par utilisateurs publics (avec tracking_slug valide)
    (sender_type = 'client' AND auth.uid() IS NULL AND sav_case_id IN (
      SELECT id 
      FROM public.sav_cases 
      WHERE tracking_slug IS NOT NULL 
      AND tracking_slug != ''
    ))
  )
);

-- Politique INSERT : Conserver les politiques existantes
-- (Elles fonctionnent déjà bien)

-- Politique UPDATE : Simplifier pour permettre le marquage lu/non lu
DROP POLICY IF EXISTS "Shop users can update their SAV messages" ON public.sav_messages;

CREATE POLICY "Unified update messages policy"
ON public.sav_messages
FOR UPDATE
USING (
  -- Utilisateurs authentifiés du magasin peuvent mettre à jour leurs messages
  (auth.uid() IS NOT NULL AND shop_id IN (
    SELECT profiles.shop_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  ))
  OR
  -- Utilisateurs publics peuvent mettre à jour le statut de lecture des messages avec tracking
  (auth.uid() IS NULL AND sav_case_id IN (
    SELECT id 
    FROM public.sav_cases 
    WHERE tracking_slug IS NOT NULL 
    AND tracking_slug != ''
  ))
);