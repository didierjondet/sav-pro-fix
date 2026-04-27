# Suppression du "0" parasite dans tous les champs numériques

## Problème identifié

Sur l'ensemble du site, les champs numériques (`<Input type="number">`) affichent un **"0" par défaut** qui ne s'efface pas quand on clique. Résultat : pour saisir "12", l'utilisateur doit taper "012" (et obtient même 12.5% au lieu de 12% à cause du parsing).

**Cause technique** : tous les champs sont liés à un state initialisé à `0` (number), donc React force l'affichage de `"0"` dans l'input, qu'on ne peut pas effacer simplement.

**Étendue** : 56 champs `type="number"` répartis dans 27 fichiers (devis, SAV, pièces, paramètres, super admin, abonnements, SMS, inventaire, etc.).

## Solution proposée

### 1. Créer un composant réutilisable `NumberInput`

Nouveau fichier `src/components/ui/number-input.tsx` :
- Wrapper autour du composant `Input` existant.
- Props : `value: number | undefined`, `onChange: (n: number | undefined) => void`, plus toutes les props standards (`min`, `max`, `step`, `placeholder`, `className`, `disabled`...).
- Comportement clé :
  - **Affichage vide** quand `value === 0` ou `undefined` → on montre le `placeholder` (ex. "0", "10", "5.00") au lieu de la valeur "0".
  - **Sélection automatique** au focus : `onFocus={(e) => e.target.select()}` → cliquer dans le champ surligne le contenu pour qu'il soit remplacé immédiatement.
  - **État interne string** pour permettre la saisie fluide (gérer `""`, `"0."`, `"."`, etc. sans forcer un parseFloat à chaque frappe).
  - **Au blur** : si vide, renvoie `0` (ou `undefined` selon prop `allowEmpty`) au parent ; sinon convertit en number.
  - **Suppression du scroll** sur la molette (évite les changements involontaires) : `onWheel={(e) => e.currentTarget.blur()}`.

### 2. Remplacer les 56 occurrences

Dans chaque fichier listé ci-dessous, remplacer `<Input type="number" ... />` par `<NumberInput ... />` (même API simplifiée).

Fichiers concernés (27 fichiers) :
- **Devis / SAV** : `QuoteForm.tsx`, `SAVForm.tsx`, `SAVWizardDialog.tsx`, `SAVPartsEditor.tsx`, `PartsSelection.tsx`, `SAVTypesManager.tsx`, `SAVStatusManager.tsx`, `part-discount-manager.tsx`
- **Pièces / Stock / Commandes** : `PartForm.tsx`, `StockAdjustment.tsx`, `ReceiveOrderDialog.tsx`, `PartCategoriesManager.tsx`, `InventoryManualEditor.tsx`, `InventoryAssistedDialog.tsx`, `SupplierConfigCard.tsx`
- **Paramètres / Réglages** : `Settings.tsx`, `DailyAssistantConfigDialog.tsx`
- **Super Admin** : `ShopManagementDialog.tsx`, `SMSCreditManager.tsx`, `SMSCreditsTab.tsx`, `SMSPackagesManager.tsx`, `TwilioCreditsManager.tsx`, `SubscriptionPlansManager.tsx`, `CarouselManager.tsx`, `SystemAlertsManager.tsx`, `InvoiceConfigManager.tsx`
- *(Le `XAxis type="number"` dans `PartsUsageHeatmapWidget.tsx` est un axe Recharts, pas un input → ignoré.)*

### 3. Effet utilisateur attendu

Avant : champ affiche "0" → je tape "12" → j'obtiens "012" → après parse "12" mais visuellement étrange.

Après :
- Champ vide affiche le placeholder gris "0" (ou "10", "5.00" selon le contexte).
- Au clic, si une valeur existe elle est sélectionnée → la frappe la remplace.
- Si je tape "12", ça affiche "12" directement.
- Si j'efface tout et que je quitte le champ, ça revient à 0 (valeur métier conservée).
- La molette ne modifie plus accidentellement la valeur.

## Détails techniques

```tsx
// src/components/ui/number-input.tsx (esquisse)
interface NumberInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value: number | undefined | null;
  onChange: (value: number) => void;
  min?: number; max?: number; step?: number | string;
  allowDecimals?: boolean; // sinon parseInt
}
// Logique : useState<string> interne, sync avec value en useEffect quand value change de l'extérieur,
// onFocus -> select(), onBlur -> commit (parseFloat ou parseInt), onWheel -> blur.
```

## Hors-scope

- Pas de changement visuel (taille, bordures, classes Tailwind conservés via passthrough `className`).
- Pas de changement de la logique métier des formulaires (les states restent en `number`).
- Les calculs liés (totaux, remises, prix) ne sont pas modifiés.
