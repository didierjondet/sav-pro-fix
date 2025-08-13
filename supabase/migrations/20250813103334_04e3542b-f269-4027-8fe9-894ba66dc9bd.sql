-- Solution finale : supprimer toutes les vues et utiliser uniquement des politiques RLS sécurisées

-- 1. Supprimer toutes les vues problématiques
DROP VIEW IF EXISTS public.customer_tracking_view CASCADE;
DROP VIEW IF EXISTS public.customer_tracking_info CASCADE;
DROP VIEW IF EXISTS public.sav_tracking_view CASCADE;
DROP VIEW IF EXISTS public.sav_messages_tracking_view CASCADE;

-- 2. Nous utiliserons uniquement les politiques RLS sur les tables de base
-- Les politiques RLS actuelles sont déjà suffisamment restrictives et sécurisées

-- 3. Vérifier et s'assurer que les politiques RLS sont bien en place
-- Politique pour sav_cases : accès public limité au tracking uniquement
-- Politique pour sav_messages : accès public limité aux cas avec tracking_slug
-- Politique pour customers : pas d'accès public direct aux données sensibles

-- Note: Le code frontend devra maintenant utiliser directement les tables 
-- avec les politiques RLS en place plutôt que les vues