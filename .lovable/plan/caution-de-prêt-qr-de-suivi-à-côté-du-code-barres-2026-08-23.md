# Caution de prêt + QR de suivi à côté du code-barres

## 1. Caution sur le prêt de matériel

Aujourd'hui la table des prêts (`loaner_loans`) n'a aucun champ de caution : seuls l'état, les notes et les dates sont stockés.

- Ajouter un champ « Caution » (montant en €, optionnel) sur le prêt.
- Saisie au moment de l'attribution du matériel dans l'onglet « Prêt matériel » du SAV (champ à côté de la date de retour prévue), et modifiable ensuite sur la carte du prêt en cours, comme les notes.
- Affichage du montant sur la carte du prêt (badge « Caution : 50 € ») et dans l'historique.
- Report automatique dans le document de prise en charge, dans la zone « Matériel de prêt » : une ligne « Caution : XX,XX € » (rien d'affiché si aucune caution).

## 2. QR code de suivi à droite du code-barres

Actuellement le QR code de suivi est un bloc placé tout en bas de la colonne de gauche uniquement, ce qui le renvoie souvent sur une page suivante, et il est absent de la copie magasin.

- Déplacer le QR code dans l'en-tête, directement à droite du code-barres du n° de SAV.
- L'afficher sur les deux copies (client et magasin) pour qu'il soit toujours visible immédiatement.
- Supprimer l'ancien bloc « Suivi client » en bas de page ; l'URL de suivi reste écrite en petit sous le QR.
- Taille adaptée à l'en-tête (QR ~55 px) pour ne pas déséquilibrer la mise en page côte à côte.

## Détails techniques

- Migration : `ALTER TABLE public.loaner_loans ADD COLUMN deposit_amount numeric(10,2)` (nullable, pas de valeur par défaut).
- `src/hooks/useLoanerLoans.ts` : ajouter `deposit_amount` à l'interface `LoanerLoan`, à `LoanerLoanInput` et au payload de `updateLoan`.
- `src/components/loaner/SAVLoanerCard.tsx` : champ montant à la création (à côté de `expectedReturn`), affichage + édition sur la carte du prêt actif, affichage dans l'historique.
- `src/components/sav/SAVPrint.tsx` :
  - étendre le `select` des prêts avec `deposit_amount` et ajouter la ligne dans `loanerBlock`.
  - restructurer `.header` en flex (bloc titre/code-barres à gauche, QR à droite), injecter le QR dans les deux `content-block`, retirer `${qrBlock}` du bas de page et ajuster les styles `.qr` / `.url`.
