-- Désactiver temporairement RLS pour déboguer
-- Ceci va permettre toutes les opérations sur la table shops

ALTER TABLE public.shops DISABLE ROW LEVEL SECURITY;