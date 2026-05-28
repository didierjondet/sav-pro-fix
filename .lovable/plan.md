
## Objectif

Ajouter une option par type de SAV (Paramètres > Types de SAV) permettant d'activer/désactiver la génération du bon de restitution. Le réglage s'applique à tous les SAV existants et futurs de ce type.

## Modifications

### 1. Base de données
Migration ajoutant une colonne sur `shop_sav_types` :
- `enable_restitution_pdf BOOLEAN NOT NULL DEFAULT true`

Valeur par défaut `true` pour préserver le comportement actuel (les SAV externe et client continuent de générer le bon automatiquement).

### 2. Hook `src/hooks/useShopSAVTypes.ts`
- Ajouter `enable_restitution_pdf: boolean` dans l'interface `ShopSAVType`.
- L'exposer dans `getTypeInfo()` (fallback `true`).

### 3. UI `src/components/sav/SAVTypesManager.tsx`
Ajouter un nouveau Switch dans le formulaire d'édition/création de type de SAV, à côté des options existantes (ex. après "Enquête de satisfaction") :
- Label : **« Bon de restitution »**
- Description : « Générer automatiquement un bon de restitution à la clôture et autoriser son impression »
- Lié à `formData.enable_restitution_pdf` (init `true`)
- Persisté à la création et à la mise à jour

### 4. Gating de la génération PDF
Conditionner sur `getTypeInfo(savCase.sav_type).enable_restitution_pdf` :

- `src/components/sav/SAVCloseUnifiedDialog.tsx` (ligne ~331) : ne pas générer/imprimer automatiquement le bon à la clôture si l'option est `false`. Le message chat « 📄 Document de restitution généré… » n'est pas envoyé non plus.
- `src/components/sav/SAVCloseDialog.tsx` : même logique pour la branche legacy, et masquage du bloc « Document de restitution disponible ».
- `src/pages/SAVDetail.tsx` (ligne ~346) : masquer le bouton **« Imprimer restitution »** si l'option est `false`.

### Hors périmètre
- Pas de modification visuelle des cartes SAV, du PDF lui-même, ni des autres options de type.
- Pas de changement de logique métier autre que le gating PDF.
