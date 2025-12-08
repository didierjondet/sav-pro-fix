-- Ajouter les colonnes de raison de refus à la table quotes
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Contrainte pour valider les valeurs autorisées
ALTER TABLE quotes 
ADD CONSTRAINT valid_rejection_reason 
CHECK (rejection_reason IS NULL OR rejection_reason IN (
  'too_expensive', 
  'too_slow', 
  'no_trust', 
  'postponed'
));

-- Index pour les statistiques de refus
CREATE INDEX IF NOT EXISTS idx_quotes_rejection_reason ON quotes(rejection_reason) WHERE rejection_reason IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_rejected_at ON quotes(rejected_at) WHERE rejected_at IS NOT NULL;