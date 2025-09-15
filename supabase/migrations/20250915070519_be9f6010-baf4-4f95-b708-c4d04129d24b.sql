-- Étendre l'enum sav_type pour supporter les types personnalisés
ALTER TYPE sav_type ADD VALUE 'SAVPC';
ALTER TYPE sav_type ADD VALUE 'SAVPARTENAIRE';

-- Ajouter d'autres types couramment utilisés pour plus de flexibilité future
ALTER TYPE sav_type ADD VALUE 'WARRANTY';
ALTER TYPE sav_type ADD VALUE 'DEPOT_VENTE';
ALTER TYPE sav_type ADD VALUE 'FORMATION';
ALTER TYPE sav_type ADD VALUE 'MAINTENANCE';