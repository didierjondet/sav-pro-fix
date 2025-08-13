-- Corriger la dernière vulnérabilité sur la table customers
-- Supprimer la politique qui permet aux utilisateurs authentifiés d'accéder aux données clients

DROP POLICY IF EXISTS "Authenticated users can view minimal customer data" ON public.customers;

-- Cette politique permettait à tout utilisateur authentifié de voir les données clients
-- si ils connaissaient le tracking_slug, ce qui posait un risque de sécurité.
-- Maintenant, seules les fonctions sécurisées peuvent accéder aux données pour le tracking public.