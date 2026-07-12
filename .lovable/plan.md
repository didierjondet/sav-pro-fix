
## Objectif

1. Garantir que les prix d'un SAV clôturé (ou en cours) restent **figés** dans le temps même si la fiche pièce est modifiée après coup.
2. Uniformiser tous les calculs de marge en **HT** (rapports, fiches, widgets) et exposer clairement la **TVA** (extraite automatiquement du prix TTC saisi).

---

## Partie 1 — Verrouillage des prix historiques (snapshot)

### Bug identifié
Dans `src/components/sav/SAVPartsEditor.tsx` (ligne 79), le prix d'achat affiché est lu depuis `item.parts?.purchase_price` (fiche pièce **actuelle**) au lieu de `item.purchase_price` (snapshot enregistré au moment du SAV). Résultat : modifier une fiche pièce fait bouger la marge des anciens SAV à l'affichage.

Autre point vérifié : `SAVCloseUnifiedDialog.tsx` (l. 156-163) va jusqu'à **écrire** `parts.purchase_price` dans le snapshot si celui-ci est vide, ce qui écrase la valeur historique.

### Correctifs

- **`SAVPartsEditor.tsx`** : lire `purchase_price` depuis `item.purchase_price` (fallback `item.parts?.purchase_price` uniquement si null ET SAV encore non clôturé).
- **`SAVCloseUnifiedDialog.tsx`** : ne backfill le `purchase_price` depuis la fiche pièce que **si et seulement si** le snapshot est réellement absent (null/undefined), et le figer une fois pour toutes lors du **premier** enregistrement, jamais lors d'une clôture ultérieure.
- **Vérifier `SAVPartsRequirements.tsx`** et tout autre consommateur (`SAVPrint.tsx`, `useSAVPartsCosts.ts`) : ils lisent déjà le snapshot — OK, mais je passerai une revue rapide.
- **Audit** : rechercher tous les endroits qui lisent `parts.purchase_price` / `parts.selling_price` dans un contexte SAV existant et les basculer sur le snapshot.

### Point de conception
Les colonnes `sav_parts.purchase_price` et `sav_parts.unit_price` existent déjà et sont bien renseignées à la création. La correction est donc purement côté lecture/affichage — pas de migration.

---

## Partie 2 — Calculs HT et isolement de la TVA

### Principe retenu
Le prix de vente pièce reste saisi **TTC** (comportement actuel), mais toutes les **marges** et **totaux comptables** sont calculés en **HT** en s'appuyant sur `shop_billing_config` (`vat_rate_parts`, `vat_regime`, `prices_include_vat`). Le prix d'achat est déjà HT par convention.

Formule :
- `unit_price_HT = vat_regime === 'none' ? unit_price : unit_price / (1 + vat_rate_parts/100)` (si `prices_include_vat`)
- `vat_amount = unit_price - unit_price_HT`
- `marge_HT = unit_price_HT - purchase_price`

### Fiches pièces (`PartForm.tsx`)
- Afficher, sous le champ « Prix de vente TTC », deux lignes calculées en direct :
  - **Prix HT** = prix TTC / (1 + taux)
  - **TVA** = prix TTC − prix HT (avec taux affiché)
- Afficher la **marge HT** = prix HT − prix d'achat (déjà HT), en € et en %.
- Aucune modification du schéma : c'est purement dérivé du prix TTC saisi + config boutique.

### Rapports (`useReportData.ts`, `useSupplierReportData.ts`, `useSupplierStatistics.ts`)
Chaque calcul par pièce :
- `revenue_ht = unit_price_ht * quantity * revenue_ratio`
- `vat_collected = (unit_price - unit_price_ht) * quantity * revenue_ratio`
- `expense = purchase_price * quantity` (déjà HT)
- `margin = revenue_ht - expense`

Ajouter dans les objets retournés :
- `revenue_ht`, `revenue_ttc`, `vat_collected` par SAV, par fournisseur et par total.

### UI Rapports (`Reports.tsx`, `SupplierPerformanceSection.tsx`, `ReportChartsSection.tsx`)
- Afficher CA **HT** en principal, avec CA TTC en secondaire (plus petit).
- Nouvelle colonne / bloc **TVA collectée**.
- La marge affichée devient explicitement « Marge HT ».
- Exports Excel/PDF : mêmes colonnes ajoutées.

### Widgets statistiques (revenus / marges)
- `useStatistics.ts`, `useMonthlyStatistics.ts`, `useCustomWidgetData.ts` : basculer les CA/marges en HT via le helper commun.
- Créer un helper partagé `src/lib/vatCalculator.ts` → `splitTtcHt(unitTtc, config)` pour éviter la duplication.

### Régime « auto-entrepreneur » (`vat_regime === 'none'`)
Aucune TVA : HT = TTC, `vat_collected = 0`. Comportement inchangé pour ces boutiques.

---

## Détails techniques

- Ajouter `splitTtcHt(unitTtc: number, config: BillingConfig): { ht, ttc, vat, rate }` dans `src/lib/vatCalculator.ts`.
- Les hooks `useReportData`, `useSupplierReportData`, `useSupplierStatistics` prendront un `billingConfig` en entrée (via `useBillingConfig()` déjà dispo côté composant appelant, injecté en paramètre).
- Pas de migration DB. Pas de changement de saisie utilisateur.
- Zone impactée strictement : lecture/affichage. Aucun changement UI hors des zones citées.

---

## Fichiers touchés (prévisionnel)

```text
src/components/sav/SAVPartsEditor.tsx        (fix snapshot)
src/components/sav/SAVCloseUnifiedDialog.tsx (fix backfill destructif)
src/components/parts/PartForm.tsx            (affichage HT/TVA/marge)
src/lib/vatCalculator.ts                     (helper splitTtcHt)
src/hooks/useReportData.ts                   (HT + TVA)
src/hooks/useSupplierReportData.ts           (HT + TVA)
src/hooks/useSupplierStatistics.ts           (HT + TVA)
src/pages/Reports.tsx                        (UI colonnes)
src/components/reports/SupplierPerformanceSection.tsx (UI)
src/components/reports/ReportChartsSection.tsx        (UI)
src/hooks/useStatistics.ts / useMonthlyStatistics.ts  (marges HT)
```
