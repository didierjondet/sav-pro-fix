## Problème

L'erreur "Could not find the 'condition_photos' column of 'loaner_equipment' in the schema cache" indique que la colonne `condition_photos` n'existe pas dans la table `loaner_equipment`. Le code frontend (`LoanerEquipmentForm`, `useLoanerEquipment`) et le composant `LoanerConditionPhotos` l'utilisent déjà, mais la migration DB n'a jamais été appliquée.

## Correction

1. **Migration DB** : ajouter la colonne `condition_photos text[] default '{}'` à `public.loaner_equipment`.

Aucune modification de code frontend nécessaire — il référence déjà la colonne correctement.
