## Problème onglet "TVA & MO" non sélectionnable

Dans `src/pages/Settings.tsx` (ligne 766-771), l'onglet est rendu uniquement si `isAdmin`. De plus, la `TabsList` a beaucoup d'onglets et défile horizontalement : selon le rôle/permission et la largeur d'écran, l'onglet est soit caché soit hors-vue. À vérifier aussi : aucun bouton ne route automatiquement vers `?tab=billing-vat` (l'onboarding pointe dessus mais le `Tabs` ne lit pas le query param `tab`).

### Correctifs UI/Accès
1. Lire `?tab=` dans l'URL au montage de `Settings.tsx` et l'utiliser comme `defaultValue` du `Tabs` (sinon le clic depuis l'onboarding ne sélectionne pas l'onglet).
2. Garder l'onglet réservé aux admins mais le placer juste après "Boutique"/"Facturation" pour qu'il soit visible sans scroller, et ajouter un focus/scroll-into-view quand `tab=billing-vat`.
3. Lier l'onglet à la permission `settings_billing` (ou fallback `isAdmin`) pour que les admins de boutique ne soient pas bloqués par RBAC.

## Travail restant à finaliser

### A. Saisie manuelle du temps MO
- Dans `QuoteForm.tsx` et `SAVPartsEditor.tsx` : pour chaque ligne pièce, si `config.labor_billing_enabled && labor_mode === 'hourly'` et que la pièce n'a ni `time_minutes` ni `labor_cost`, afficher un input "Temps (min)" qui alimente `computeLineTotals(..., overrideMinutes)`.
- Stocker la valeur saisie dans la ligne (`time_minutes_override`) pour persister dans `quote_items` / `sav_parts` (colonne déjà existante `time_minutes` à réutiliser, sinon ajout d'une colonne `time_minutes` sur `sav_parts` et `quote_items`).

### B. PDF SAV (`SAVPrint.tsx` + `pdfGenerator.generateRestitutionPDF`)
- Vérifier que `buildVatHtmlBlock` est bien appelé dans `SAVPrint.tsx` (composant React imprimé) — actuellement seul `pdfGenerator.ts` l'utilise. Ajouter le bloc TVA + ligne MO dans `SAVPrint.tsx`.
- Garantir que la mention "TVA non applicable, art. 293 B du CGI" apparaît en pied de page quand `vat_regime === 'none'`.

### C. Coûts SAV (`useSAVPartsCosts.ts`)
- Intégrer le coût MO HT par ligne dans le calcul des coûts pour que les statistiques (CA, marge) reflètent la MO facturée.
- Revenu = sum(parts TTC) + sum(MO TTC) ; coût = sum(purchase_price). Conserver la règle existante "Revenue × ratio client".

### D. Onboarding `labor_config`
- Ajouter une 2e étape dans `useOnboardingProgress.ts` : `labor_config` → `/settings?tab=billing-vat`, manuellement marquable comme vue.

## Fichiers touchés
- `src/pages/Settings.tsx` — query param tab + repositionnement de l'onglet + permission
- `src/components/quotes/QuoteForm.tsx` — input temps manuel conditionnel
- `src/components/sav/SAVPartsEditor.tsx` — input temps manuel conditionnel
- `src/components/sav/SAVPrint.tsx` — bloc TVA + MO + mention légale
- `src/hooks/useSAVPartsCosts.ts` — intégration MO dans coûts
- `src/hooks/useOnboardingProgress.ts` — étape `labor_config`
- Migration éventuelle : ajouter `time_minutes` sur `sav_parts` et `quote_items` si absent

## Compatibilité
Aucune régression : `labor_billing_enabled=false` par défaut → comportement actuel inchangé.
