## 1. "Nouveau SAV pour ce produit" (récurrence produit)

### Constat
- La détection existe déjà par **SKU** et **IMEI** via `useProductHistory` (hook déjà utilisé par `ProductHistoryBanner` dans `SAVForm` et `SAVWizardDialog`, et par `ProductRecurrenceBadge` dans `SAVDetail`).
- Aujourd'hui, quand un produit est reconnu, on peut consulter l'historique dans `ProductHistoryDrawer`, mais il faut ressaisir tout un nouveau SAV manuellement.

### Ce qui sera ajouté
1. **Bouton "Nouveau SAV pour ce produit"** ajouté dans deux endroits :
   - dans chaque carte de dossier passé du `ProductHistoryDrawer` (à côté du bouton "voir le dossier"),
   - directement dans le bandeau `ProductHistoryBanner` (raccourci quand un match exact IMEI/SKU est trouvé), pour être visible sur la **vue normale** ET la **vue simplifiée** (les deux utilisent déjà le banner).
2. Le bouton ouvre une **`NewSAVFromProductDialog`** (nouveau composant) qui pré-remplit à partir du SAV source :
   - marque, modèle, IMEI, SKU, couleur, grade (verrouillés visuellement mais modifiables via un bouton "Corriger l'appareil"),
   - historique visible en résumé (dernière panne, dernière intervention).
   Le technicien doit confirmer 3 choses avant validation :
   - **Type de SAV** (select alimenté par `useShopSAVTypes`, défaut = type du SAV source),
   - **Client** : "Même client" (pré-coché si le SAV source avait un client) / "Autre client" (ouvre `CustomerSearch` + option création rapide) / "Sans client" (si le type de SAV le permet),
   - **Description de la panne** (`Textarea` obligatoire, vide par défaut — on ne recopie pas l'ancienne panne pour éviter les copier-coller trompeurs, mais l'ancienne est affichée en aide).
3. À la validation : insertion d'un `sav_cases` (mêmes règles que la création via `SAVForm` : `case_number`, `tracking_slug`, `shop_id`, `status` initial, `tracked_product_id` recopié pour lier l'historique), puis `navigate('/sav/<newId>')`.
4. Aucun changement sur la logique de détection existante — elle couvre déjà IMEI et SKU.

## 2. Réorganisation de la vue SAV simplifiée (`SAVDetail.tsx`, branche `isSimplifiedView`)

Onglets actuels : **Aperçu · Communication · Documents**.
Nouveaux onglets : **Aperçu · Communication · Pièces · Impression · Documents**.

- **Aperçu** : on retire `SAVPartsEditor` et `SAVPrintButton` de la ligne d'actions du haut. On conserve `ProblemDescriptionDisplay`, cartes client/appareil, `SAVLoanerCard`, `SAVStatusManager`.
- **Pièces** *(nouveau)* : contient uniquement `SAVPartsEditor` (bouton "Modifier les pièces") + rappel du coût total.
- **Impression** *(nouveau)* : regroupe toutes les impressions dans une carte unique avec libellés explicites :
  - **Imprimer le document de prise en charge** → `SAVPrintButton` (le label du bouton sera reformulé pour être plus explicite),
  - **Imprimer l'étiquette / QR code** → bloc `SAVBarcode` déplacé depuis l'onglet Documents,
  - **Imprimer le document de restitution** → bouton existant (conditionné à `isReadyStatus`) déplacé ici.
- **Documents** : uniquement `SAVDocuments` (pièces jointes) — on retire le bouton "Imprimer restitution", le `SAVPrintButton` et le bloc étiquette qui s'y trouvent aujourd'hui.

## Détails techniques

- Nouveau fichier : `src/components/sav/NewSAVFromProductDialog.tsx`. Props : `sourceCase: PreviousSAVCase`, `trackedProductId?: string`, `trigger?: ReactNode`. Réutilise `useShop`, `useShopSAVTypes`, `useAllCustomers`, `CustomerSearch`, insertion via `supabase.from('sav_cases').insert(...)` (calquée sur `SAVForm.handleSubmit`).
- `ProductHistoryDrawer` : ajout d'un bouton "Nouveau SAV" (icône `Plus`) par carte de dossier, à côté de `ExternalLink`. Il ferme le drawer puis ouvre `NewSAVFromProductDialog`.
- `ProductHistoryBanner` : ajout d'un second bouton "Nouveau SAV pour ce produit" (visible uniquement quand `detection.level === 'exact'`, donc IMEI confirmé) qui ouvre directement le dialog sur le SAV le plus récent.
- `SAVDetail.tsx` (branche simplifiée, lignes ~371-577) : ajout de `<TabsTrigger value="pieces">` et `<TabsTrigger value="impression">`, création des `TabsContent` correspondants, suppression des éléments migrés depuis Aperçu et Documents.
- La `TabsList` reste `overflow-x-auto` pour rester lisible sur mobile.
- Aucun changement sur la vue normale (SAV standard) ni sur la logique métier des impressions/pièces existantes.
