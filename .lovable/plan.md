## Corrections page Clients

### 1. Pastille "SAV en cours" mal mise à jour

**Problème** : `useCustomerSAVs` filtre en dur les statuts `ready` et `cancelled`. Les shops peuvent définir leurs propres statuts de clôture (`is_final_status = true` dans `shop_sav_statuses`), qui ne sont donc pas pris en compte → la pastille rouge reste affichée alors que le SAV est clôturé.

**Fix** : dans `src/hooks/useCustomerSAVs.ts`, récupérer dynamiquement les `status_key` marqués `is_final_status = true` pour le shop concerné, puis exclure ces statuts du compteur de SAV actifs (au lieu du filtre en dur `(ready,cancelled)`).

Aucune modification visuelle/UI. Le comportement du bouton de suppression (bloqué si SAV en cours) reste identique, mais utilisera la même source de vérité.

### 2. Gestionnaire de doublons : zone d'action masquée

**Problème** : dans `src/components/customers/DuplicateManager.tsx`, la zone de fusion (garder / fusionner) s'affiche tout en bas de la liste des groupes détectés. Sur une longue liste, l'utilisateur ne la voit pas après avoir cliqué sur une card.

**Fix** : rendre la carte de fusion **inline**, juste sous la card sélectionnée, dans la même grille.
- Restructurer le rendu de la liste des groupes : après la card cliquée, insérer conditionnellement la `Card` de fusion existante.
- Retirer le bloc de fusion actuellement placé en bas.
- Conserver la logique existante (radio "à conserver", checkboxes "à fusionner", boutons Annuler/Fusionner) — uniquement le placement change.
- Optionnel : petit `scrollIntoView` doux sur la zone de fusion à l'ouverture pour garantir sa visibilité.

Aucun changement de logique métier ni de requêtes DB pour ce point.
