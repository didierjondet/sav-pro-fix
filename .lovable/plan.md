# Onglet « Prêt matériel » permanent + déblocage du code de déverrouillage à la clôture

## 1. Onglet « Prêt matériel » toujours visible

Aujourd'hui l'onglet n'apparaît que si un prêt actif existe (`hasActiveLoan`), donc impossible d'ajouter un téléphone de prêt après coup.

- Afficher l'onglet en permanence dans les deux vues du SAV (standard et simplifiée).
- Style neutre par défaut ; style rouge (destructive) uniquement quand un prêt est en cours, avec une pastille indiquant le nombre d'appareils prêtés actifs.
- Depuis l'onglet, à tout moment : attribuer un appareil, en attribuer un autre, faire un retour (restitution), supprimer une ligne de prêt. L'historique des prêts restitués reste visible.

## 2. Notes de prêt

- Ajouter un champ « Notes » modifiable sur le prêt en cours (accessoires remis, caution, état, consignes), enregistré sur la ligne de prêt.
- Les notes de restitution existantes restent inchangées ; les notes de prêt s'affichent dans la carte et sur l'historique.

## 3. Déblocage de la clôture quand le code de déverrouillage manque

Dans le mode simplifié (assistant de création), la dernière fenêtre de validation affiche bien l'alerte rouge « Code de déverrouillage manquant » mais ne propose aucun moyen de la corriger : il faut fermer la fenêtre pour revenir à l'étape des codes.

- Dans cet encart rouge, ajouter deux actions directes :
  - un champ de saisie rapide du code (numérique/alphanumérique) validable sur place ;
  - une case « Cet appareil n'a pas de code de déverrouillage ».
- Ajouter un bouton « Revenir à l'étape Codes » qui referme la fenêtre de validation et ramène l'assistant sur l'étape des codes de sécurité (au lieu de perdre l'utilisateur).
- Une fois le code saisi ou la case cochée, l'alerte disparaît et les boutons Imprimer / Valider / SMS fonctionnent normalement.

## Détails techniques

- `src/pages/SAVDetail.tsx` : retirer la condition `hasActiveLoan` autour du `TabsTrigger value="loaner"` (deux occurrences : vue simplifiée ~l.410 et vue standard ~l.811) et rendre les classes destructive conditionnelles ; même chose pour le `TabsContent`.
- `src/components/loaner/SAVLoanerCard.tsx` : ajouter la gestion des notes de prêt (champ + sauvegarde) et un bouton « Attribuer un autre appareil » quand un prêt est actif.
- `src/hooks/useLoanerLoans.ts` : exposer une mise à jour des notes sur la table `loaner_loans` (colonne notes existante à vérifier ; sinon migration d'ajout de colonne `notes text`).
- `src/components/dialogs/PrintConfirmDialog.tsx` : nouveaux props contrôlés (`unlockCode`, `onUnlockCodeChange`, `noUnlockCode`, `onNoUnlockCodeChange`, `onGoToCodesStep`) rendus dans l'encart rouge.
- `src/components/sav/SAVWizardDialog.tsx` : brancher ces props sur `securityCodes.unlock_code` / `noUnlockCode`, et `onGoToCodesStep` ferme `showPrintDialog` puis `setCurrentStep` sur l'index de l'étape `codes`.
