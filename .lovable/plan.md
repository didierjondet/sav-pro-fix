# Gestion imprimante & support étiquettes — Epson TM-L90 par défaut

## Contexte du problème

Sur les photos :
- Écran : étiquette rendue **horizontale** (paysage) 60×40 mm.
- Sortie papier (Epson TM-L90, rouleau 55×40 mm) : contenu imprimé **tourné 90° à gauche**, tronqué à droite.

Cause : le rouleau est chargé "portrait" (le côté court 40 mm alimente en tête), mais le CSS `@page` déclare une taille paysage 60×40 mm et l'imprimante réinterprète l'orientation → décalage systématique. Changer l'orientation Windows aggrave car il tourne à nouveau.

Aucun navigateur web ne peut piloter un driver Windows (ESC/POS, densité, cutter, calibrage papier) → on ne peut pas "installer un driver" depuis l'app. On peut par contre **générer le HTML dans la bonne géométrie et faire tourner le contenu côté CSS** pour que ce qui s'imprime ressemble exactement à l'aperçu, quel que soit le sens de chargement du rouleau.

## Ce qui change

### 1. Presets d'imprimante étiquettes (`SAVBarcodePrinterSettings.tsx`)

Ajout d'une liste déroulante **"Modèle d'imprimante"** avec presets :

- **Epson TM-L90 — étiquette 55×40 mm (par défaut)**
- Epson TM-L90 — étiquette 58×40 mm
- Brother QL — 62×29 mm
- Zebra ZD — 57×32 mm
- DYMO LabelWriter — 54×25 mm
- Générique 60×40 mm
- Personnalisé (garde les champs libres actuels)

Sélectionner un preset préremplit : nom imprimante mémo, largeur, hauteur, marge conseillée (1 mm pour thermique), et **orientation du contenu** (voir §2). Les champs restent éditables.

Nouveau réglage `printerModel: string` ajouté à `LabelPrinterSettings` (stocké dans `localStorage` sous `fixway_label_printer_settings`, rétrocompatible : valeurs manquantes tombent sur les defaults).

### 2. Orientation du contenu (le vrai correctif)

Ajout du champ `contentOrientation: 'landscape' | 'portrait'` (défaut `landscape` pour TM-L90 55×40).

Dans le HTML d'impression :
- `@page { size: <W>mm <H>mm }` = **taille physique réelle** de l'étiquette (55×40 pour TM-L90).
- Si `contentOrientation === 'landscape'` mais que le rouleau se charge en portrait (cas Epson TM-L90 constaté sur les photos) → on ajoute un bouton **"Faire pivoter le contenu 90°"** (`rotateContent: 0 | 90 | 180 | 270`) qui applique `transform: rotate(...)` sur `.label` avec échange largeur/hauteur pour occuper la page correctement.
- L'aperçu à l'écran (fenêtre popup avant `window.print()`) applique la même rotation → **WYSIWYG garanti** : ce qu'on voit est ce qui sort.

### 3. Aperçu dans la fiche SAV (`SAVBarcode.tsx`)

Le canvas de prévisualisation dans la carte "Code-barres étiquette" reprend le ratio W×H du preset (au lieu du 220 px fixe actuel) et applique la même rotation choisie → l'utilisateur voit dès la fiche SAV l'orientation finale.

Texte d'aide mis à jour : `Étiquette 55×40 mm — Epson TM-L90 — rotation 90°` par exemple.

### 4. Defaults migrés

`DEFAULT_LABEL_SETTINGS` passe de 60×40 à **55×40 mm, preset TM-L90, marge 1 mm, rotation 90°, autoPrint true**. Migration transparente : les installations existantes conservent leurs valeurs (merge sur le stored JSON).

### 5. Aide utilisateur intégrée

Bloc d'info dans le dialog des réglages :
- Rappel : dans la boîte d'impression Chrome/Edge → **Marges : "Aucune"**, **Mise à l'échelle : 100 %**, **En-têtes/pieds : décochés**, sélectionner l'imprimante TM-L90.
- Lien vers le pilote officiel Epson (page produit TM-L90) — on ne peut pas installer le driver mais on peut y renvoyer.
- Explication courte : "Si l'impression sort tournée, utilisez le bouton Rotation contenu plutôt que l'orientation Windows."

## Détails techniques

Fichiers touchés (aucune logique métier, uniquement UI + génération HTML d'impression) :

- `src/components/sav/SAVBarcodePrinterSettings.tsx`
  - `LabelPrinterSettings` +`printerModel`, `contentOrientation`, `rotateContent`.
  - `DEFAULT_LABEL_SETTINGS` → preset TM-L90.
  - Ajout `<Select>` presets + boutons rotation 0/90/180/270°.
  - Aperçu miniature de l'étiquette (rectangle SVG à l'échelle) reflétant taille + rotation.

- `src/components/sav/SAVBarcode.tsx`
  - `handlePrint()` : injecte `transform: rotate(${rotateContent}deg)` et échange W/H de `.label` quand rotation ∈ {90,270}.
  - Aperçu canvas : wrap dans un conteneur avec `transform` équivalent.

Aucune migration DB, aucun edge function, aucun changement de dépendance. Rétrocompatible avec le `localStorage` existant.

## Ce qui n'est PAS fait (et pourquoi)

- Pilotage direct ESC/POS via WebUSB : déjà présent en association d'appareil mais **impossible d'imprimer réellement** sans embarquer un firmware Epson complet (rendering ESC/POS, calibrage papier, cutter). Hors périmètre. On documente ce point dans l'aide.
- Détection auto des caractéristiques papier de l'imprimante : le navigateur ne l'expose jamais (sécurité). Seuls des presets manuels sont possibles.
