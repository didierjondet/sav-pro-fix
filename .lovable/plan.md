## Objectif
Rendre les lignes de fournisseurs cliquables dans `SuppliersManager` pour ouvrir une fiche détaillée avec statistiques (total achats, marge), filtres temporels, graphiques animés et impression.

## Nouveaux fichiers

### `src/components/settings/SupplierDetailDialog.tsx`
Dialog plein écran (`max-w-5xl`) ouvert au clic sur une ligne fournisseur.

**Contenu :**
- En-tête : nom, contact, coordonnées, badge actif/inactif.
- **Barre de filtre temporel** (Tabs ou SegmentedControl) : `Mois en cours` · `Trimestre` · `Semestre` · `Année` · `Personnalisée`.
  - Mode personnalisé → 2 DatePicker (date début / fin) via composant Shadcn Calendar.
- **Cartes KPI animées** (4) : Total achats (€), CA généré (€), Marge (€), Marge %. Animation compteur (framer-motion `animate` sur la valeur via `useSpring` ou simple interpolation).
- **Graphiques** (Recharts, déjà utilisé dans le projet) :
  - Aire/Ligne : évolution mensuelle achats vs CA sur la période.
  - Barres : marge mensuelle.
  - Donut/Pie : répartition des achats par pièce (top 5 + autres).
- **Tableau détaillé** : pièces achetées sur la période (nom, qté, achat unitaire moyen, total achat, CA, marge).
- **Bouton "Imprimer"** : génère un HTML autonome dans une nouvelle fenêtre (`window.open` synchrone) avec en-tête fournisseur, période sélectionnée, KPI, tableau, et appelle `window.print()`. Pas d'inclusion des graphiques dans l'impression (HTML noir & blanc lisible) — option à confirmer si besoin de capture des graphes.

### `src/hooks/useSupplierStatistics.ts`
Hook qui prend `(supplier_id, fromDate, toDate)` et retourne :
- `totals` : { expenses, revenue, margin, margin_pct, parts_count, sav_count }
- `monthly` : tableau `{ month: 'YYYY-MM', expenses, revenue, margin }` pour graphiques
- `byPart` : top pièces `{ part_name, quantity, expenses, revenue, margin }`
- `details` : lignes brutes pour le tableau

**Source** : requête Supabase sur `sav_parts` jointe à `parts` (filtre `supplier_id`) et `sav_cases` (filtre `shop_id`, `created_at` dans [from, to], et même logique d'exclusion que `useSupplierReportData` : `purchase_cost_excluded`, `revenue_ratio`). Réutilise les mêmes formules (revenue = unit_price × qty × revenue_ratio, expense = purchase_price × qty si non exclu).

## Modifications

### `src/components/settings/SuppliersManager.tsx`
- Ajouter état `selected: Supplier | null` et `detailOpen`.
- Rendre `<TableRow>` cliquable (`onClick={() => { setSelected(s); setDetailOpen(true); }}` + `cursor-pointer hover:bg-muted/50`).
- Empêcher la propagation sur les boutons Edit/Delete (`e.stopPropagation()`).
- Monter `<SupplierDetailDialog open={detailOpen} onOpenChange={setDetailOpen} supplier={selected} />`.

## Hors scope
- Pas de modification du schéma DB ni de RLS (les tables `sav_parts`, `parts`, `sav_cases` sont déjà accessibles via les politiques existantes).
- Pas de changement du `SupplierForm`, ni du `Reports.tsx` global.
- Pas de modification du module Statistiques.
- Pas d'export Excel (impression HTML uniquement).
- Pas de capture image des graphiques dans le PDF (impression du tableau + KPI uniquement).

## Validation
- Clic sur une ligne fournisseur → dialog s'ouvre avec ses stats.
- Changement de filtre temporel → KPI et graphiques se mettent à jour avec animation.
- Période personnalisée → sélecteurs de dates fonctionnels.
- Bouton "Imprimer" → ouvre fenêtre avec rapport correctement mis en page de la période filtrée.
- Boutons Edit/Delete restent fonctionnels sans déclencher l'ouverture du dialog.
