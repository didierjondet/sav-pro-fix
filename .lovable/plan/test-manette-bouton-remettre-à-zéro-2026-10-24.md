# Test manette : bouton « Remettre à zéro »

## Ce que vous verrez
- Dans la fenêtre du test manette, un bouton rouge « Remettre à zéro » est visible en haut, à toutes les étapes.
- Un clic oublie complètement la manette détectée et tous les résultats (boutons, gâchettes, joysticks, vibrations, vérifications, numéro lu), puis revient à l'étape Connexion.
- Le test attend alors à nouveau qu'on appuie sur un bouton de la manette. On peut brancher une autre manette ou rebrancher la même, sans fermer la fenêtre ni recharger le site.
- Si des résultats ont déjà été saisis, une confirmation est demandée avant d'effacer.
- À l'étape Connexion, un petit texte rappelle : « Manette non détectée ? Débranchez-la, rebranchez-la, appuyez sur un bouton, ou cliquez sur Remettre à zéro. »

## Limite
- Le navigateur garde parfois une manette en mémoire tant qu'elle n'est pas débranchée. Dans ce cas, il faut la débrancher et la rebrancher après la remise à zéro. Recharger le site ne sera plus nécessaire.

## Détails techniques
- `ControllerTestDialog.tsx` : extraire la réinitialisation actuelle (effet à l'ouverture) dans une fonction `resetAll()`, réutilisée par l'effet et le bouton (`variant="destructive"`). Elle remet aussi `pending`, `serial`, `pressed`, `axes` et `samples` à zéro. Le passage de `padIndex` à null relance la détection.
- Écoute des événements `gamepadconnected` / `gamepaddisconnected` : si la manette suivie se déconnecte, on revient automatiquement à « en attente ».
- `controllerHid.ts` : exporter `resetHidDevices()`, qui ferme et oublie la manette LED gardée en mémoire. Appelé par `resetAll()`.
