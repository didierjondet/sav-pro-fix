## Objectif

1. Supprimer l'ancienne intégration extension Chrome fournisseurs (devenue inutile).
2. Créer une vraie gestion d'annuaire fournisseurs (CRUD).
3. Rattacher pièces & prestations à un fournisseur enregistré + filtre dans la page Stock.
4. Ajouter une étape d'onboarding « Créer un fournisseur ».
5. Ajouter dans Rapports une section « Performance fournisseurs » (dépenses, CA, marge).

---

## Phase 1 — Nettoyage de l'intégration extension (sans rien casser d'autre)

Aucun composant applicatif ne consomme aujourd'hui `useSuppliers`, `SupplierConfigCard`, l'edge function `search-supplier-parts` ou la page `/chrome-extension-download` en dehors de leur propre périmètre. Suppression sûre.

À supprimer :

- **Frontend**
  - `src/hooks/useSuppliers.ts`
  - `src/components/settings/SupplierConfigCard.tsx`
  - `src/pages/ChromeExtensionDownload.tsx`
  - Route `/chrome-extension-download` dans `src/App.tsx` + import associé
  - Entrée `/chrome-extension-download` dans `PUBLIC_EXACT` de `src/components/help/HelpBot.tsx`
- **Edge function**
  - `supabase/functions/search-supplier-parts/`
- **Assets statiques**
  - `public/chrome-extension/` (dossier complet)
- **Base de données** (migration de suppression)
  - `DROP TABLE public.shop_suppliers` (2 lignes existantes, aucun consommateur frontend)

Mémoires à mettre à jour après coup : retirer « Shop Suppliers » et « Supplier Extension » de `mem://index.md`.

---

## Phase 2 — Base de données (migration)

1. **Table `public.suppliers`**
   - `id uuid PK`, `shop_id uuid` (FK shops)
   - `name text NOT NULL`, `contact_name text`, `email text`, `phone text`, `website text`, `address text`, `notes text`
   - `is_active bool DEFAULT true`
   - `created_at`, `updated_at`
   - Index unique `(shop_id, lower(name))`
   - GRANT `authenticated` + `service_role` (pas d'anon), RLS scope `shop_id = public.get_user_shop_id()`.

2. **Colonne `parts.supplier_id uuid`** (nullable, FK `suppliers(id)` ON DELETE SET NULL) + index.
   - L'ancienne colonne `parts.supplier` (texte libre) est conservée comme fallback lecture-seule pour ne pas perdre l'info historique. Aucune migration automatique.

---

## Phase 3 — UI annuaire fournisseurs

- Nouvel onglet **Réglages → « Fournisseurs »** : liste + recherche + Ajouter / Modifier / Activer-Désactiver.
- Dialog `SupplierForm` (nom, contact, email, téléphone, site web, adresse, notes).
- Nouveau hook `useSuppliersDirectory` (séparé, table `suppliers`).
- Permission RBAC = `settings_inventory` (déjà réservé admin).

## Phase 4 — Pièces & prestations

- `PartForm` : remplacer l'input texte « Fournisseur » par un `Select` des fournisseurs actifs + bouton « + Nouveau fournisseur » qui ouvre `SupplierForm` en modal et pré-sélectionne.
- `Parts.tsx` : ajouter un filtre déroulant « Fournisseur » à côté des filtres existants (catégorie, type). Filtre sur `part.supplier_id`. Option « Tous ».
- Affichage card : `suppliers.name` joint (fallback `part.supplier` texte si `supplier_id` null).

## Phase 5 — Onboarding

`useOnboardingProgress.ts` — insérer **avant** `first_part` :

- `id: 'first_supplier'`
- label : « Enregistrer un premier fournisseur »
- description : « Créez vos fournisseurs avant d'ajouter vos pièces pour bien attribuer chaque produit. »
- `actionRoute: '/settings?tab=suppliers'`
- status `done` si `counts.suppliers > 0` (ajouter le compteur).

## Phase 6 — Rapports

Nouveau bloc `SupplierPerformanceSection` dans `Reports.tsx`, respectant la plage de dates de la page.

Pour chaque fournisseur sur la période :

- **Dépenses** = Σ (`sav_parts.purchase_price` × `sav_parts.quantity`) des pièces dont `parts.supplier_id = X`.
- **CA généré** = Σ (`sav_parts.unit_public_price` × `quantity` × ratio client du SAV) selon la règle existante (mémoire « Revenue Logic »).
- **Marge** = CA − Dépenses.
- Tri par marge desc, total global en pied de tableau.
- Export Excel : nouvelle feuille « Fournisseurs ».

Hook `useSupplierReportData(startDate, endDate)` agrégeant côté client à partir des `sav_parts` déjà chargés par `useReportData`, joints à `parts.supplier_id → suppliers.name`.

---

## Ordre d'exécution

1. Migration suppression `shop_suppliers` + création `suppliers` + colonne `parts.supplier_id` (un seul fichier).
2. Suppression des fichiers/dossiers extension listés en Phase 1.
3. Implémentation UI annuaire + onglet réglages.
4. Branchement `PartForm` + filtre `Parts.tsx`.
5. Étape onboarding.
6. Section rapports + export.

---

## Hors périmètre

- Pas de modification visuelle des cards SAV, devis, commandes.
- Pas de migration automatique `parts.supplier` (texte) → `supplier_id`.
- Pas de modification du système de stock, de prix d'achat, ni du Cost Transfer existant.
