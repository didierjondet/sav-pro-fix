# Plan — Prêt de matériel : intégration au workflow SAV

## 1. Switch "Prêt de matériel" sur les types de SAV

**DB** — `shop_sav_types`
- Ajout `loaner_enabled BOOLEAN DEFAULT false`

**Settings → Types SAV** (`SAVTypesManager.tsx`)
- Nouveau switch "Proposer un prêt de matériel par défaut" dans le formulaire d'édition d'un type, à côté de "Code de déverrouillage requis" / "Exclure des stats".
- Sauvegarde du champ via le hook existant.

**Création SAV** (`SAVForm.tsx`, `SAVWizardDialog.tsx`)
- Quand l'utilisateur sélectionne un type SAV avec `loaner_enabled = true`, la section `LoanerSection` s'active automatiquement (toggle `enabled = true` une fois). L'utilisateur reste libre de la désactiver manuellement.
- Si `loaner_enabled = false`, comportement inchangé (toggle off par défaut).

## 2. Photos multiples d'état du matériel (paramètres)

**DB** — `loaner_equipment`
- Ajout `condition_photos TEXT[] NOT NULL DEFAULT '{}'` (chemins storage). `photo_url` conservé pour rétro-compat.
- Nouveau bucket Storage `loaner-photos` (privé, URLs signées), avec policies RLS scopées au shop (lecture pour membres du shop, upload/delete pour admins shop).

**`LoanerEquipmentForm.tsx`**
- Nouvelle zone "Photos de l'état du matériel" sous Notes : grille d'aperçus + bouton "Ajouter une photo" (multi-upload, max 6, 2 MB chacune), suppression individuelle.
- Composant inspiré de `PartPhotoUpload.tsx`.

## 3. Visibilité sur le bon imprimé client (`SAVPrint.tsx`)

- Récupération du prêt actif lié au SAV à l'impression.
- Nouveau bloc "Matériel prêté" dans le bon, encadré et visible : nom, marque/modèle, IMEI / n° série, couleur, date de prêt, date de retour prévue, état au prêt (notes).
- Mention en bas du bon : « Le client s'engage à restituer le matériel prêté lors de la récupération de son appareil. »

## 4. Visibilité sur la page publique QR client (`TrackSAV.tsx`)

**DB** — RPC `get_tracking_info`
- Étendre la réponse pour inclure le prêt actif (jointure `loaner_loans` + `loaner_equipment`). Seuls les champs non sensibles : nom, marque, modèle, couleur, date de prêt, date de retour prévue. **Pas d'IMEI/série** côté public.

**`TrackSAV.tsx`**
- Nouvelle Card "Matériel prêté" si un prêt actif est présent, avec rappel de la date de retour prévue.

## 5. Alerte popup à la restitution (`SAVCloseUnifiedDialog.tsx`)

- À l'ouverture du dialog de clôture/restitution : si `useLoanerLoans(savCaseId).activeLoan` existe, afficher un `AlertDialog` bloquant en premier :
  > « ⚠️ Matériel de prêt à récupérer : {nom équipement} (IMEI/série {…}). Vérifiez l'état avant clôture. »
  - Boutons : "J'ai récupéré le matériel" (continue la restitution) / "Annuler".
- Optionnel : au clic "J'ai récupéré", pré-cocher l'option "Marquer le prêt comme rendu" dans la suite du flow (le retour effectif reste fait via `SAVLoanerCard` ou directement ici).

## 6. Détails techniques

- Migration SQL unique : colonnes + bucket + policies storage + remplacement de la fonction `get_tracking_info`.
- Types Supabase régénérés automatiquement après migration.
- Aucune modification de la mise en page validée du dashboard / sidebar / header.
- Composant photos réutilisable : `LoanerConditionPhotos.tsx` dans `src/components/settings/loaner/`.

## Fichiers impactés
- **Migration** : 1 nouveau fichier SQL
- **Modifiés** : `SAVTypesManager.tsx`, `useShopSAVTypes.ts`, `SAVForm.tsx`, `SAVWizardDialog.tsx`, `LoanerSection.tsx` (auto-enable via prop), `LoanerEquipmentForm.tsx`, `SAVPrint.tsx`, `TrackSAV.tsx`, `SAVCloseUnifiedDialog.tsx`
- **Créés** : `src/components/settings/loaner/LoanerConditionPhotos.tsx`
