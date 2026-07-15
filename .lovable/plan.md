# Base de specs imprimantes & presets enrichis

Objectif : améliorer la fidélité d'impression étiquettes (TM-L90 en priorité) uniquement via une base de connaissances intégrée à Fixway. Aucune extension, aucun middleware, aucun driver à installer.

## Ce qui va changer

### 1. Nouveau fichier `src/lib/labelPrinters.ts`
Base statique TypeScript (source : fiches techniques Epson / Brother / Zebra / DYMO officielles) contenant pour chaque modèle :

- `id`, `brand`, `model`, `productUrl` (page constructeur)
- `printMethod` (thermique direct)
- `dpi` (203 pour TM-L90)
- `maxPrintWidthMm` (largeur imprimable réelle — 56 mm pour TM-L90, ≠ largeur du rouleau)
- `recommendedMedia[]` : liste des étiquettes couramment utilisées (largeur × hauteur × gap × description)
- `feedGapMm` (gap physique entre étiquettes)
- `safetyMarginMm` (marge interne recommandée pour éviter les sauts d'étiquette — 0.5 pour TM-L90)
- `defaultRotationDeg` (90 pour TM-L90 en pose horizontale)
- `driverNotes` (rappels : "cocher Reduce top margin", "Media type = Die-cut label", "Print speed 90 mm/s", etc.)
- `browserNotes` (rappels navigateur : marges 0, échelle 100 %, headers off)

Modèles inclus dès la v1 :
- Epson **TM-L90** (étiquettes 55×40, 58×40, 76×50) — par défaut
- Epson TM-L100
- Brother QL-800 / QL-820NWB
- Zebra ZD220 / ZD421
- DYMO LabelWriter 450 / 550
- Générique 60×40

### 2. `SAVBarcodePrinterSettings.tsx` — sélecteur enrichi
- Le sélecteur "Modèle d'imprimante" lit désormais `labelPrinters.ts`.
- À la sélection d'un modèle, un second sélecteur "Format d'étiquette" propose les `recommendedMedia` du modèle → applique automatiquement largeur / hauteur / marge / rotation / vitesse recommandées.
- Bloc "Fiche imprimante" affiché sous le sélecteur : DPI, largeur max, méthode, lien vers la page constructeur, notes driver, notes navigateur.
- Bouton **"Restaurer les réglages recommandés"** qui réapplique les valeurs de la base pour le modèle choisi.
- Rétrocompatibilité : les réglages custom dans `localStorage` (`fixway_label_printer_settings`) sont préservés ; on ne réécrit qu'après clic explicite.

### 3. `SAVBarcode.tsx` — utilisation des specs
- Utilise `safetyMarginMm` du preset dans `@page` pour éviter les sauts d'étiquette.
- Plafonne la largeur imprimée à `maxPrintWidthMm` du modèle (au lieu de la largeur brute du rouleau).
- Applique `defaultRotationDeg` si l'utilisateur n'a jamais modifié la rotation.
- Aucune autre modification visuelle de l'étiquette (layout compact déjà en place).

### 4. Page d'aide contextuelle
- Petit `Popover` "?" à côté du sélecteur modèle affichant `driverNotes` + `browserNotes` du modèle sélectionné.
- Lien direct vers la page produit Epson pour vérifier les specs.

## Ce qui ne change pas
- Pas de nouvelle dépendance npm.
- Pas de table Supabase, pas d'edge function.
- Pas de modification des autres modules d'impression (PDF SAV, devis, listes).
- Le layout de l'étiquette (grid QR + texte compact) reste identique.

## Fichiers touchés
- **Créé** : `src/lib/labelPrinters.ts`
- **Édité** : `src/components/sav/SAVBarcodePrinterSettings.tsx`
- **Édité** : `src/components/sav/SAVBarcode.tsx`

## Évolution possible (hors scope)
Si plus tard tu veux passer au pilotage direct (ESC/POS pixel-perfect), la base `labelPrinters.ts` servira de socle pour un futur middleware local ou une extension WebUSB — sans avoir à refaire les presets.
