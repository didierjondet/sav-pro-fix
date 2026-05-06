## Objectif

Permettre aux magasins de facturer la **main d'œuvre** en plus des pièces, et d'appliquer un **régime de TVA** configurable sur devis et SAV. La main d'œuvre se gère **directement depuis la fiche pièce** (pas de menu séparé) pour rester simple.

## 1. Réglages magasin (nouvel onglet "Facturation & TVA")

Nouvel onglet dans `Settings` avec deux sections :

### A. Régime de TVA
- **Régime** (radio) : 
  - Auto-entrepreneur (TVA non applicable, art. 293 B)
  - TVA classique (taux paramétrable)
  - TVA sur marge (appliquée uniquement sur la marge pièces)
- **Taux TVA pièces** (%) — défaut 20
- **Taux TVA main d'œuvre** (%) — défaut 20 (peut différer)
- **Prix saisis en** : TTC ou HT (impacte le calcul affiché)

### B. Main d'œuvre
- **Activer la facturation main d'œuvre** (switch on/off) — si off, tout le reste est masqué et aucun calcul MO n'est fait
- **Mode de calcul** : 
  - Forfait par pièce (montant saisi sur la fiche pièce)
  - Taux horaire global (utilise `time_minutes` × taux)
- **Taux horaire** (€/h) — visible uniquement en mode horaire
- **Libellé sur devis/facture** (défaut : "Main d'œuvre")

## 2. Fiche pièce (`PartForm.tsx`)

Ajouter un bloc "Main d'œuvre" affiché uniquement si activé en réglages :
- Mode forfait → champ **Coût main d'œuvre HT** (€)
- Mode horaire → affichage calculé en lecture seule à partir de `time_minutes` et du taux horaire global, avec possibilité d'override par pièce
- Si `time_minutes` absent en mode horaire → message "Temps non renseigné, sera demandé manuellement à la facturation"

## 3. Devis & SAV (parties pièces)

Pour chaque ligne pièce sélectionnée :
- Affichage : prix pièce + ligne MO automatique (si activée)
- Si pièce sans temps en mode horaire → invite à saisir le temps (minutes) ponctuellement
- Total = pièces + MO, avec ventilation TVA selon régime :
  - Auto-entrepreneur → pas de TVA, mention légale
  - Classique → HT + TVA pièces + TVA MO + TTC
  - TVA sur marge → TVA calculée sur (PV - PA) pièces uniquement, MO en TVA classique

## 4. Onboarding (HelpBot)

Ajouter 2 étapes dans `useOnboardingProgress.ts` :
- `vat_config` — "Configurer votre régime de TVA" → `/settings?tab=billing-vat`
- `labor_config` — "Activer la facturation main d'œuvre" (manual, peut être marquée vue si non souhaitée) → même onglet

## 5. Base de données

Nouvelle table `shop_billing_config` :
- `shop_id` (unique)
- `vat_regime` : 'none' | 'standard' | 'margin'
- `vat_rate_parts` (numeric, défaut 20)
- `vat_rate_labor` (numeric, défaut 20)
- `prices_include_vat` (bool)
- `labor_billing_enabled` (bool, défaut false)
- `labor_mode` : 'flat' | 'hourly'
- `labor_hourly_rate` (numeric)
- `labor_label` (text)

Ajout colonne `parts.labor_cost` (numeric, nullable) — coût MO forfaitaire par pièce (mode forfait ou override).

RLS : lecture pour membres du shop, écriture pour admins (`has_shop_role_permission settings_billing` ou `is_shop_admin`).

## 6. Hooks & utilitaires

- `useBillingConfig.ts` — récupère/met à jour `shop_billing_config`
- `lib/vatCalculator.ts` — fonctions pures `computeLineTotals(part, qty, config)` et `computeQuoteTotals(lines, config)` réutilisées par devis, SAV, impressions PDF

## 7. Impact UI mineur

- Garder le bouton actuel "Ajouter une pièce" tel quel (pas de bouton prestation séparé) — la main d'œuvre vit sur la fiche pièce
- Le menu reste "Stock pièces"
- Sur les PDF devis/facture/SAV : nouvelle colonne MO si activée + bloc TVA conforme au régime

## Section technique

**Fichiers créés :**
- `supabase/migrations/<ts>_billing_config.sql`
- `src/hooks/useBillingConfig.ts`
- `src/lib/vatCalculator.ts`
- `src/components/settings/BillingVatTab.tsx`

**Fichiers modifiés :**
- `src/pages/Settings.tsx` (nouvel onglet `billing-vat`)
- `src/components/parts/PartForm.tsx` (bloc MO conditionnel)
- `src/components/quotes/QuoteForm.tsx` + `QuoteView.tsx` (ventilation TVA + lignes MO)
- `src/components/sav/SAVPartsEditor.tsx` / `PartsSelection.tsx` (ligne MO auto)
- `src/components/sav/SAVPrint.tsx` + `utils/pdfGenerator.ts` (PDF avec TVA)
- `src/hooks/useOnboardingProgress.ts` (2 étapes)
- `src/hooks/useSAVPartsCosts.ts` (intégrer MO dans coûts)

**Compatibilité :** valeurs par défaut → comportement actuel inchangé pour les magasins existants (labor_billing_enabled=false, régime classique 20%).
