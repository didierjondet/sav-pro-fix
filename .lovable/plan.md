
## Objectif
Supprimer le régime "TVA sur marge" partout dans l'app. Ne conserver que :
- **TVA classique** (avec détail TVA pièces/MO sur devis & factures)
- **Auto-entrepreneur** (mention "TVA non applicable, art. 293 B du CGI")

## Changements

### 1. `src/components/settings/BillingVatTab.tsx`
- Retirer la 3ᵉ option radio "TVA sur marge" du `RadioGroup`.

### 2. `src/hooks/useBillingConfig.ts`
- Restreindre le type `VatRegime` à `'none' | 'standard'` (supprimer `'margin'`).

### 3. `src/lib/vatCalculator.ts`
- Supprimer la branche `vat_regime === 'margin'` dans `computeLineTotals`.
- Retirer la mention `'TVA sur marge'` de `regimeLabel`.

### 4. `src/components/billing/BillingTotalsSummary.tsx`
- Supprimer la variable `isMargin` et le bloc d'affichage de la mention "art. 297 A du CGI".

### 5. `src/utils/pdfVatHelpers.ts`
- Supprimer la branche `vat_regime === 'margin'` dans `buildVatHtmlBlock`.

### 6. Migration de données (sécurité)
- Mettre à jour les enregistrements existants : tout `shop_billing_config.vat_regime = 'margin'` → `'standard'` pour éviter les états cassés après le changement de type.

## Hors-scope
- Aucun changement aux paramètres de facturation MO (main d'œuvre) ni à la logique de calcul TVA classique.
- Aucun changement UI ailleurs (devis, SAV, factures conservent leur mise en page).
