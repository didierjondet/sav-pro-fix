## Problème

À la clôture d'un SAV avec prêt :
1. l'alerte actuelle est purement informative ; rien n'est consigné en base, le matériel reste « prêté » même si physiquement rendu ;
2. aucune info sur le prêt (matériel, état au retour, photos) n'apparaît dans le PDF de restitution ;
3. il n'existe pas d'historique consultable des prêts par appareil (état au prêt/retour, photos, commentaires).

L'opérateur doit pouvoir **choisir explicitement** : soit valider que le matériel a été rendu (avec état + photos), soit clôturer le SAV en laissant le prêt **toujours actif** (matériel non restitué, suivi à part).

---

## Périmètre

### 1. Base de données — mini-migration

Ajout d'une colonne :
- `loaner_loans.return_photos JSONB DEFAULT '[]'::jsonb` — tableau d'URLs publiques (photos d'état au retour).

(Les colonnes `loan_condition`, `return_condition`, `notes`, `returned_at` existent déjà ; le trigger `equipment.status` se base déjà sur `returned_at IS NULL`, donc rien à toucher côté disponibilité.)

### 2. Storage

Réutilisation du bucket existant `sav-attachments`, avec chemin :
`<shop_id>/loaner-returns/<loan_id>/<timestamp>-<filename>`.

### 3. Dialog de clôture — `SAVCloseUnifiedDialog.tsx`

Remplacer l'`AlertDialog` actuel par une **modale de décision explicite** affichée tant qu'un prêt actif existe :

Récap du matériel prêté (déjà présent) +  deux choix explicites via radios/segmented :

- **« Matériel restitué »** (par défaut désélectionné, à choisir manuellement) :
  - champ « État au retour » (textarea, valeur libre).
  - upload multi-photos (drag & drop ou bouton).
  - bouton **« Valider la restitution »** → appelle `returnLoan({ id, return_condition, notes, return_photos })` puis débloque la suite de la clôture.
- **« Matériel non restitué (le client le garde) »** :
  - champ « Raison / commentaire » optionnel (stocké dans `notes` du prêt, prêt reste actif).
  - bouton **« Clôturer le SAV sans restitution »** → ne modifie pas le prêt (reste `returned_at = NULL`, équipement reste indisponible), ajoute une mention dans `closure_history`, débloque la clôture.
- Bouton **« Annuler »** → ferme la modale sans rien faire.

Aucun choix automatique : l'opérateur doit cliquer sur l'un des deux boutons d'action pour avancer.

### 4. Hook — `useLoanerLoans.ts`

- Étendre la mutation `returnLoan` pour accepter `return_photos: string[]`.
- Étendre l'interface `LoanerLoan` avec `return_photos?: string[]`.

### 5. PDF de restitution — `pdfGenerator.ts`

Dans `generateSAVRestitutionPDF`, récupérer le prêt lié au SAV (`loaner_loans` + `loaner_equipment`) puis ajouter une section conditionnelle :

- **Si prêt restitué** → section « Matériel de prêt restitué » : désignation/marque/modèle/IMEI/série, date prêt → date retour, état au prêt, **état au retour**, vignettes photos retour (compactes, 2/ligne, A4-friendly).
- **Si prêt encore actif** → encart **bien visible** : « ⚠ Matériel de prêt non restitué — à récupérer » avec désignation, date de prêt, état au prêt.
- Si pas de prêt : section omise.

### 6. Historique des prêts par appareil — Paramètres › Matériel de prêt

Sur la carte de chaque équipement (composant `LoanerEquipmentManager` / `SAVLoanerCard`) :
- Ajouter une action **« Historique »** (icône) qui ouvre une modale.
- Modale liste toutes les lignes de `loaner_loans` pour cet équipement, du plus récent au plus ancien :
  - n° SAV cliquable (lien vers `/sav/:id`), nom client, date de prêt, date de retour (ou badge « En cours »).
  - état au prêt + état au retour (texte).
  - vignettes photos retour cliquables (ouverture taille réelle dans une lightbox simple).
  - commentaire `notes`.
- Tri par défaut : `loaned_at DESC`.

Aucune écriture depuis cet écran ; uniquement consultation.

---

## Fichiers touchés

- `supabase/migrations/<nouvelle>.sql` — colonne `return_photos`.
- `src/hooks/useLoanerLoans.ts` — `return_photos` (interface + mutation).
- `src/components/sav/SAVCloseUnifiedDialog.tsx` — modale de décision (restitué / non restitué), upload photos.
- `src/utils/pdfGenerator.ts` — section « Matériel de prêt » dans le PDF.
- `src/components/settings/loaner/LoanerEquipmentManager.tsx` (+ nouveau `LoanerLoanHistoryDialog.tsx`) — historique par appareil.

## Hors-scope (à confirmer si souhaité plus tard)

- Restitution a posteriori côté espace public client (`/track/...`).
- Notification SMS automatique au client quand le matériel non restitué dépasse `expected_return_at`.
- Edition/correction d'un prêt déjà clôturé.

Confirme-moi ce périmètre et je passe en build.