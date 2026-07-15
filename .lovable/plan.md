# Assistant impression étiquette — configurer Windows + Chrome

## Pourquoi

Chrome sous Windows n'a pas le droit d'imposer une taille de papier au pilote. Si le pilote Epson TM-L90 est réglé sur un format long (bande / reçu 80 mm × 297 mm par défaut), Chrome dessine notre étiquette 55×40 mm dans un coin de cette grande feuille virtuelle, l'imprimante déroule toute la longueur et **saute plusieurs étiquettes physiques**. Aucune ligne de code côté web ne peut corriger cela : il faut créer un **format papier personnalisé** dans le pilote, puis le choisir dans Chrome. On va guider l'utilisateur pas à pas depuis Fixway.

## Ce qu'on ajoute

### 1. Nouveau composant `PrinterSetupWizard` (dans Réglages > Impression étiquette)

Bouton **« Assistant de configuration Windows »** à côté du sélecteur d'imprimante. Ouvre un dialog en 4 étapes, contenu adapté au modèle sélectionné (données lues dans `src/lib/labelPrinters.ts`) :

1. **Vérifier le pilote installé** — nom Windows attendu (ex. `EPSON TM-L90 Label`), lien vers le pilote APD Epson officiel.
2. **Créer le format papier personnalisé** — instructions détaillées : Panneau de configuration → Périphériques et imprimantes → clic droit sur la TM-L90 → *Préférences d'impression* → onglet *Document Settings* → *User Defined Paper Size* → nommer `Fixway 55x40`, largeur 55 mm, hauteur 40 mm → Enregistrer → onglet *Main* → Paper Source = `Fixway 55x40`. Chaque étape avec texte clair + schéma SVG inline (pas de captures externes à héberger).
3. **Définir comme format par défaut** — *Propriétés de l'imprimante* → *Préférences d'impression* → *Fixway 55x40* → OK.
4. **Choisir le format dans Chrome** — À l'impression : *Plus de paramètres* → *Taille du papier* → sélectionner `Fixway 55x40` (ou `Défini par l'utilisateur`) → *Marges* : Aucune → *Échelle* : 100 %. Case à cocher **« J'ai terminé la configuration sur ce poste »** stockée dans `localStorage` (`fixway_printer_setup_done_<printerId>`).

### 2. Rappel avant impression

Dans `SAVBarcode.tsx`, avant `handlePrint`, si le flag `fixway_printer_setup_done_<printerId>` est absent : afficher une petite modale de rappel « Format papier configuré dans le pilote ? » avec 2 boutons : *Ouvrir l'assistant* ou *Continuer quand même* (+ case « Ne plus afficher »). Aucune modification de la logique d'impression elle-même.

### 3. Fiche récap dans les réglages

Sous le bouton assistant, badge d'état : ✅ « Configuration terminée sur ce poste » (vert) ou ⚠️ « Non configuré — risque de saut d'étiquettes » (orange), avec bouton *Réinitialiser*.

## Détails techniques

- **Fichiers modifiés** : `src/components/sav/SAVBarcodePrinterSettings.tsx` (bouton + badge), `src/components/sav/SAVBarcode.tsx` (rappel pré-impression).
- **Fichier créé** : `src/components/sav/PrinterSetupWizard.tsx` (le dialog à étapes, contenu paramétré par `LabelPrinterSpec` déjà présent dans `src/lib/labelPrinters.ts`).
- **Enrichissement mineur** de `src/lib/labelPrinters.ts` : ajouter par imprimante un tableau `setupSteps` optionnel (nom onglet pilote, chemin exact des menus) pour Epson TM-L90/L100, Brother QL, Zebra ZD, DYMO. Étapes génériques pour l'entrée « Générique ».
- Aucune dépendance nouvelle, aucun changement DB, aucune edge function, aucune modification de la génération HTML d'impression (déjà correcte).
- Persistance locale uniquement (`localStorage`), par poste, par modèle d'imprimante — cohérent avec les autres réglages d'étiquette.

## Ce qu'on ne change pas

- La logique d'impression (`@page`, rotation, `barcodeLayout`) reste identique — elle est déjà correcte.
- Aucune extension Chrome (inutile sous Windows, cf. discussion).
- Pas de middleware local à cette étape.
