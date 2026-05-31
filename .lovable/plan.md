## Périmètre

1. **Clic sur la ligne/carte d'un appareil** (Paramètres › Matériel de prêt) → ouvre la modale d'historique des prêts (déjà existante `LoanerLoanHistoryDialog`).
   - Toute la ligne devient cliquable (curseur pointer, hover).
   - Les boutons d'action (Édition, Suppression, et le bouton Historique actuel) restent cliquables sans propager le clic.
   - Le bouton icône « Historique » est conservé pour rester découvrable.

2. **Forcer le retour d'un matériel** depuis la modale d'historique :
   - Pour chaque prêt encore actif (`returned_at IS NULL`), afficher un bouton **« Forcer le retour »** à côté du badge « En cours ».
   - Ouvre une petite sous-modale demandant :
     - état au retour (textarea, optionnel),
     - notes (optionnel),
     - photos (réutilise `LoanerConditionPhotos`).
   - Confirmation → appelle `returnLoan({ id, return_condition, notes, return_photos })` du hook existant.
   - L'équipement repasse automatiquement à `available` (trigger DB déjà en place sur `returned_at`).
   - L'historique se rafraîchit (invalidation de `loaner-loans-history` à ajouter dans `useLoanerLoans.returnLoan.onSuccess`).

## Fichiers touchés

- `src/components/settings/loaner/LoanerEquipmentManager.tsx` — rendre la `<TableRow>` cliquable, `stopPropagation` sur les boutons d'action.
- `src/components/settings/loaner/LoanerLoanHistoryDialog.tsx` — bouton « Forcer le retour » sur chaque prêt actif + sous-dialog de saisie.
- `src/hooks/useLoanerLoans.ts` — invalider aussi `['loaner-loans-history', shopId]` dans `invalidate()` pour rafraîchir la modale après un retour forcé.

## Hors-scope

- Pas de modification du visuel des lignes (compactness conservée, juste hover/cursor).
- Pas de notification SMS au client lors d'un retour forcé.
- Pas de réécriture en grille de vraies cartes.

Confirme et je passe en build.