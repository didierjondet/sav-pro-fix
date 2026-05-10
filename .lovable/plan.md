## Système optionnel de saisie des initiales de l'opérateur à la création d'un SAV

### Objectif
Permettre à chaque magasin d'activer (ou non) une étape finale de saisie des initiales de l'opérateur lors de la création d'un SAV, et afficher ces initiales en évidence sur le dossier SAV.

### 1. Base de données (migration)

Ajouter deux colonnes :
- `shops.collect_technician_initials` (boolean, défaut `false`) — switch d'activation par magasin
- `sav_cases.taken_over_by` (text, nullable) — initiales saisies à la création

### 2. Réglage dans Paramètres → Apparence

Dans `src/pages/Settings.tsx` (onglet `appearance`, après le bloc Thème), ajouter une nouvelle Card :
- Titre : « Prise en charge SAV »
- Switch « Collecter les initiales de l'opérateur »
- Description : « À l'activation, une étape supplémentaire demandera les initiales de l'opérateur à la fin de la création de chaque SAV »
- Sauvegarde via update sur `shops.collect_technician_initials`

Étendre `useShopSettings` pour exposer `collect_technician_initials`.

### 3. Création SAV — mode assisté (Wizard)

Dans `src/components/sav/SAVWizardDialog.tsx` :
- Ajouter une étape conditionnelle `{ key: 'initials', label: 'Initiales', icon: User }` à la fin de `STEPS`
- Filtrer cette étape via le flag `collect_technician_initials` (comme déjà fait pour `client`)
- Ajouter un state `technicianInitials`
- Rendu : champ centré, gros (uppercase, max 4 caractères), avec aperçu visuel
- Validation : `collect_technician_initials` activé ⇒ initiales requises (1-4 caractères)
- Inclure `taken_over_by: technicianInitials` dans l'appel `createCase`

### 4. Création SAV — mode formulaire classique

Dans `src/components/sav/SAVForm.tsx` :
- Ajouter un state `technicianInitials`
- Si `collect_technician_initials` activé, afficher en bas du formulaire (juste avant le bouton Valider) un champ « Initiales de l'opérateur » mis en évidence (border primary, gros input)
- Validation au submit, transmis dans `createCase`

### 5. Mise en évidence sur le dossier SAV

- `src/pages/SAVDetail.tsx` : badge bien visible dans l'en-tête du dossier (ex. pastille primary avec « Pris en charge par : XX »)
- `src/components/sav/SAVCard*` (vue liste) : petit badge discret avec les initiales si présentes
- PDF de restitution (`src/utils/pdfGenerator.ts`, `generateSAVRestitutionPDF`) : ligne « Pris en charge par : XX » dans le bloc infos du dossier

### Fichiers touchés
- Migration SQL (nouvelles colonnes)
- `src/hooks/useShopSettings.ts` (exposer le flag)
- `src/pages/Settings.tsx` (onglet Apparence, nouveau switch)
- `src/components/sav/SAVWizardDialog.tsx` (étape Initiales conditionnelle)
- `src/components/sav/SAVForm.tsx` (champ Initiales conditionnel)
- `src/pages/SAVDetail.tsx` (affichage en évidence)
- `src/components/sav/SAVCard*` ou équivalent liste (badge)
- `src/utils/pdfGenerator.ts` (ligne sur PDF)

### Hors périmètre
- Pas de gestion d'historique des opérateurs (champ libre simple)
- Pas de modification a posteriori dans cette itération (pourra être ajoutée à `EditSAVDetailsDialog` si demandé)
