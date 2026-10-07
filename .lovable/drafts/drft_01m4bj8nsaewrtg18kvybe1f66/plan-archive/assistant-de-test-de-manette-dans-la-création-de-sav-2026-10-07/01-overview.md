# Assistant de test de manette dans la création de SAV

## Ce que vous verrez
Dans la création d'un SAV (formulaire classique et assistant en étapes), juste après le choix du **type de SAV**, un bouton **« Tester une manette »** apparaît. Il ouvre une fenêtre plein écran de test, guidée étape par étape avec l'opérateur.

Déroulé dans la fenêtre :
1. **Brancher la manette** (USB ou Bluetooth) puis appuyer sur un bouton : la manette est détectée et son modèle est reconnu (PS4, PS5, Xbox One/Series, Switch Pro, générique). L'opérateur peut corriger le modèle.
2. **Boutons** : schéma de la manette à l'écran, chaque bouton s'allume quand on l'appuie. L'opérateur peut aussi marquer un bouton « ne fonctionne pas » ou « intermittent ».
3. **Gâchettes analogiques (L2/R2, LT/RT)** : jauge de course de 0 à 100 %, détection d'une course incomplète.
4. **Joysticks** : tracé de cercle pour chaque stick, mesure de la **dérive au repos** (drift), de la zone morte et de la circularité ; bouton stick (L3/R3) testé.
5. **Croix directionnelle**.
6. **Vibrations** (quand le navigateur le permet) : l'opérateur confirme gauche/droite.
7. **Points manuels** (non détectables par le navigateur) : port de charge, batterie, haut-parleur, prise jack, pavé tactile, LED, coque. Case OK / défaut + note.
8. **Résumé** : liste claire des pannes (ex. « Bouton X ne répond pas », « Joystick gauche : dérive de 12 % vers le haut ») et schéma de la manette avec les zones en défaut en rouge.

En validant, on revient au formulaire SAV classique : **marque, modèle et description de la panne sont pré-remplis** avec le résumé ; le reste (client si le type de SAV le demande, etc.) se remplit comme d'habitude.

## Impression
Le schéma annoté et la liste des pannes sont imprimables depuis la fenêtre de test, et ajoutés à la fiche de dépôt du SAV et dans l'onglet Documents du SAV, pour voir la panne d'un coup d'œil.

## Limites à connaître
- Fonctionne dans Chrome et Edge (ordinateur). Safari et Firefox détectent mal certaines manettes.
- Certaines fonctions ne sont pas lisibles par un navigateur (pavé tactile en détail, gyroscope, micro, batterie) : elles passent en vérification manuelle par l'opérateur.
- Les manettes Switch Joy-Con séparées seront traitées comme « générique ».
