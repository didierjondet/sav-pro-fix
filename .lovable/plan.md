## Système de prêt de matériel aux clients

### Objectif
Permettre à l'atelier d'enregistrer un parc de matériel de prêt (téléphone, ordi, TV, etc.) et de le rattacher à un SAV pendant la durée de la réparation, avec suivi des retours.

### 1. Base de données (migration)

**Table `loaner_equipment`** (parc de prêt par boutique)
- `shop_id` (FK shops)
- `name` (libellé), `category` (telephone | ordinateur | tablette | tv | console | autre)
- `brand`, `model`, `imei`, `serial_number`, `color`, `notes`
- `status` (available | loaned | maintenance | retired)
- `photo_url` (optionnel)
- `created_at`, `updated_at`

**Table `loaner_loans`** (historique des prêts)
- `shop_id`, `equipment_id` (FK), `sav_case_id` (FK, nullable), `customer_id` (FK, nullable)
- `loaned_at`, `expected_return_at`, `returned_at`
- `loan_condition`, `return_condition`, `notes`
- `created_by` (user_id)

**RLS** : isolation par `shop_id` via `get_current_user_shop_id()`. GRANT `authenticated` + `service_role`.

**Trigger** : à l'insertion d'un `loaner_loans` sans `returned_at`, passer l'équipement à `loaned`. À la mise à jour avec `returned_at`, repasser à `available`.

### 2. Page de configuration — Paramètres

Ajouter un nouvel onglet **"Matériel de prêt"** dans `src/pages/Settings.tsx` :
- Tableau du parc (filtre par catégorie + statut + recherche IMEI/SN)
- Bouton "Ajouter un matériel" → dialog avec tous les champs
- Édition / suppression / changement de statut
- Badge visuel par catégorie + statut
- Compteur (X disponibles / Y prêtés)

Composants à créer :
- `src/components/settings/loaner/LoanerEquipmentManager.tsx`
- `src/components/settings/loaner/LoanerEquipmentForm.tsx`
- `src/hooks/useLoanerEquipment.ts` (CRUD + realtime)
- `src/hooks/useLoanerLoans.ts`

### 3. Intégration côté SAV

**Dans `SAVForm.tsx` (vue normale) ET `SAVWizardDialog.tsx` (vue simplifiée)** :
- Nouvelle case à cocher **"Prêt de matériel"**
- Si cochée → bouton "Choisir un matériel à prêter" qui ouvre un sélecteur (`LoanerPickerDialog`) listant uniquement les équipements `available`
- Champ optionnel "Date de retour prévue"
- À la sauvegarde du SAV, créer la ligne `loaner_loans` correspondante

**Dans `SAVDetail.tsx`** :
- Encart "Matériel prêté" affichant l'équipement + date de prêt + date de retour prévue
- Bouton "Marquer comme rendu" (renseigne `returned_at` + état de retour)
- Possibilité d'ajouter/changer le matériel prêté après-coup

**Fermeture du SAV** : si un prêt est encore actif au moment de la clôture (`SAVCloseUnifiedDialog`), afficher un avertissement + obliger à confirmer le retour du matériel.

### 4. Composants partagés
- `src/components/loaner/LoanerPickerDialog.tsx` (sélection d'un équipement disponible)
- `src/components/loaner/LoanerStatusBadge.tsx`
- `src/components/loaner/ActiveLoanCard.tsx` (encart affiché dans SAVDetail)

### 5. Permissions
- Lecture du parc : tous les rôles de la boutique
- Création/édition du parc : `admin` uniquement (via RLS `is_shop_admin`)
- Prêt/retour : tous rôles ayant accès aux SAV (technicien inclus)

### Récapitulatif des fichiers
**Migration** : 1 (2 tables + RLS + triggers)
**Nouveaux composants** : 7
**Nouveaux hooks** : 2
**Fichiers modifiés** : `Settings.tsx`, `SAVForm.tsx`, `SAVWizardDialog.tsx`, `SAVDetail.tsx`, `SAVCloseUnifiedDialog.tsx`