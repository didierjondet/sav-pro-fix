-- Corriger l'erreur de relation manquante dans support_tickets
-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_created_by_fkey;

-- Ajouter la contrainte avec le bon nom
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ajouter aussi une colonne support_ticket_id dans la table notifications pour les liens
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS support_ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE;