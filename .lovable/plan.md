## Phase 6 — Rapports : Performance fournisseurs

Ajouter une section « Performance fournisseurs » dans la page Rapports, respectant la période et les filtres déjà actifs (types/statuts), avec export Excel.

### 1. Étendre `useReportData.ts`

Modifier la requête `sav_parts` pour récupérer le fournisseur lié à la pièce :

```ts
sav_parts(
  quantity,
  unit_price,
  purchase_price,
  custom_part_name,
  part:parts(name, supplier_id, supplier:suppliers(id, name))
)
```

Étendre `ReportPartItem` avec `supplier_id: string | null` et `supplier_name: string | null` (fallback `null` pour pièces sans fournisseur ou pièces personnalisées).

Conserver le comportement existant (les exclusions `exclude_purchase_costs` / `exclude_sales_revenue` du type de SAV s'appliquent aussi aux dépenses/CA fournisseur, pour cohérence avec le reste du rapport).

### 2. Nouveau hook `useSupplierReportData.ts`

Pure agrégation côté client à partir de `reportData.items` (pas de nouvelle requête réseau) :

Pour chaque pièce de chaque SAV :
- Clé = `supplier_id` (ou bucket spécial « Sans fournisseur »)
- **Dépenses** += `purchase_price × quantity` (à 0 si type exclut les coûts)
- **CA** += `unit_price × quantity × ratio` où `ratio` reflète prise en charge totale/partielle du SAV (réutiliser la même logique que `useReportData`)
- **Marge** = CA − Dépenses
- Compteur de pièces et SAV uniques

Renvoyer `{ rows: SupplierReportRow[], totals }` trié par marge desc.

### 3. Composant `SupplierPerformanceSection.tsx` dans `src/components/reports/`

- Card avec titre « Performance fournisseurs » et sous-titre rappelant la période.
- Tableau colonnes : Fournisseur, Pièces utilisées, SAV concernés, Dépenses, CA généré, Marge (avec couleur conditionnelle), % marge.
- Ligne « Sans fournisseur » grisée si applicable.
- Pied de tableau : totaux globaux.
- État vide si aucune pièce sur la période.

### 4. Intégration `Reports.tsx`

- Importer `SupplierPerformanceSection` et l'afficher sous `ReportChartsSection`.
- Dans `exportToExcel()`, ajouter une feuille « Fournisseurs » avec les mêmes colonnes que le tableau + ligne totaux.

### Hors périmètre

- Pas de filtre « par fournisseur » sur la page Rapports (la section est descriptive, pas filtrante).
- Pas de drill-down vers la liste des SAV par fournisseur (ajoutable plus tard si besoin).
- Pas de modification des autres widgets / sections existantes.

### Fichiers touchés

- `src/hooks/useReportData.ts` (étendre requête + interface)
- `src/hooks/useSupplierReportData.ts` (nouveau)
- `src/components/reports/SupplierPerformanceSection.tsx` (nouveau)
- `src/pages/Reports.tsx` (intégration + feuille Excel)
