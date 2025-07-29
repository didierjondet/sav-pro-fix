-- Modifier la colonne status de la table quotes pour ajouter plus d'états
-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

-- Mettre à jour la colonne status pour permettre plus d'états
ALTER TABLE public.quotes 
ALTER COLUMN status TYPE text,
ALTER COLUMN status SET DEFAULT 'draft';

-- Ajouter une nouvelle contrainte avec tous les états
ALTER TABLE public.quotes 
ADD CONSTRAINT quotes_status_check 
CHECK (status IN ('draft', 'pending_review', 'sent', 'under_negotiation', 'accepted', 'rejected', 'expired'));

-- Mettre à jour les données existantes si nécessaire
UPDATE public.quotes SET status = 'draft' WHERE status NOT IN ('draft', 'pending_review', 'sent', 'under_negotiation', 'accepted', 'rejected', 'expired');