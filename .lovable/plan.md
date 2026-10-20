# Documents SAV plus lisibles et test manette plus fiable

## 1. Bandeau des documents SAV imprimés
- Gauche du bandeau : « EXEMPLAIRE CLIENT » / « EXEMPLAIRE MAGASIN » (au lieu de « CLIENT » / « MAGASIN »), sous-titre conservé (« À remettre au client » / « À conserver »).
- Droite du bandeau, si un client est rattaché : **Prénom Nom** en gros, et le **téléphone** en gros juste en dessous. Sur les deux exemplaires.
- Sans client : bandeau inchangé (exemplaire magasin seul, comme aujourd'hui).

## 2. Test manette
- **Haut-parleur** : nouvelle vérification « Haut-parleur » avec un bouton « Jouer un son ». Le son est joué sur la sortie audio choisie (la manette apparaît comme sortie audio quand elle est branchée en USB, ex. DualSense). Le technicien confirme OK / Défaut. Si le navigateur ne permet pas de choisir la sortie, le son est joué sur l'ordinateur avec un message d'explication. Apparaît dans le rapport et la feuille imprimée.
- **Gâchettes remises à zéro** : en arrivant à l'étape Gâchettes, les valeurs repartent automatiquement de 0 % (les appuis faits pendant l'étape Boutons ne comptent plus).
- **Défauts en rouge immédiatement** : chaque bouton du test a une action « Ne réagit pas » qui le passe en rouge tout de suite sur le dessin.
- **Confirmation des boutons non détectés** (cas du clic joystick gauche) : en quittant l'étape Boutons, s'il reste des boutons jamais détectés, une fenêtre les liste : « Ces boutons n'ont pas réagi : défaut ou non testé ? » avec « Marquer en défaut » (rouge sur le dessin et dans les pannes) ou « Laisser non testé ». Même chose pour les gâchettes et joysticks sans mouvement détecté.
- Le clic des joysticks (L3/R3) fait clairement partie de la liste des boutons à tester.

## 3. Impression d'un SAV manette
- Quand un SAV a un test manette, l'impression du document SAV (création et réimpression depuis Documents) ouvre aussi automatiquement la feuille test manette (schéma + informations), avec le même n° et code-barres.
- Le bouton doré « Feuille test manette » reste disponible pour l'imprimer seule.

## Détails techniques
- `SAVPrint.tsx` : `.copy-banner` en flex `justify-between`, bloc droit `customer.first_name/last_name` + `customer.phone` formaté ; libellés « EXEMPLAIRE … ».
- `ControllerTestDialog.tsx` : reset `triggers`/`triggerOverride` dans un effet sur entrée à l'étape gâchettes ; état `speaker` (Web Audio oscillateur, `AudioContext.setSinkId` / `navigator.mediaDevices.selectAudioOutput` si dispo) ; bouton « Ne réagit pas » par bouton ; AlertDialog de confirmation au passage d'étape.
- `controllerTest.ts` : ajout `speaker` au rapport (optionnel, rétrocompatible), inclus dans `buildControllerSummary` / `buildUntestedList` ; tests dans `tests/controllerTest.test.ts` (défaut confirmé => listé en panne, speaker non testé => listé).
- `controllerPrint.tsx` : ligne haut-parleur. Appel `printControllerSheet` après l'impression SAV dans `SAVDetail` et `PrintConfirmDialog` lorsque `controller_test` existe (sans doublon avec la case déjà présente à la finalisation).
