# Test manette : lecture automatique du numéro de série

## Ce qui est possible (réponse courte)
Le navigateur ne donne pas le numéro de série par la méthode qui sert au test des boutons. Il existe une autre méthode, **WebHID**, qui permet de dialoguer directement avec la manette. Elle marche seulement sur **Chrome ou Edge sur ordinateur**, et la manette doit être **branchée en USB ou appairée en Bluetooth**. Une fenêtre du navigateur demande une autorisation, une seule fois par manette.

Ce qu'on peut lire selon le modèle :

| Manette | Ce qui est lisible | Fiabilité |
|---|---|---|
| PS4 DualShock 4 | Identifiant unique de la manette (adresse Bluetooth) + version du logiciel interne | Bonne |
| PS5 DualSense | Identifiant unique (adresse Bluetooth) + version du logiciel interne | Bonne |
| Switch Pro | Vrai numéro de série enregistré dans la manette | Bonne |
| Xbox | Rien : Microsoft bloque cet accès dans le navigateur | Saisie manuelle (étiquette dans le compartiment à piles) |

Note : sur les manettes Sony, le numéro imprimé sous l'étiquette n'est pas lisible à distance. On enregistre l'identifiant unique de la manette, qui permet aussi de retrouver la même manette si elle revient.

## Ce que vous verrez
1. Dans la fenêtre de test manette, un bouton **« Lire le n° de série »** (affiché seulement sur Chrome/Edge).
2. Au clic, le navigateur demande de choisir la manette. Le numéro lu s'affiche, puis remplit automatiquement le champ **N° de série / IMEI** du SAV en création. Le champ reste modifiable.
3. Si rien n'est lisible (Xbox, autre navigateur, manette inconnue), un message clair invite à saisir le numéro à la main.
4. Le numéro et la version du logiciel interne sont enregistrés avec le rapport de test. Ils figurent sur la feuille imprimée. L'alerte « Produit déjà connu » fonctionne alors aussi pour les manettes.

Aucun autre changement des formulaires SAV.

## Détails techniques
- Nouveau `src/lib/controllerHid.ts` : `navigator.hid.requestDevice` avec filtres vendeur Sony 0x054C et Nintendo 0x057E.
  - DS4 : `receiveFeatureReport(0x12)` (USB) / `0x09`, octets MAC inversés au format `AA:BB:..` ; version via `0xA3`.
  - DualSense : `receiveFeatureReport(0x09)` pour la MAC ; `0x20` pour la version du logiciel interne.
  - Switch Pro : sous-commande 0x10, lecture SPI à 0x6000 (16 octets ASCII, série).
  - Erreur ou absence de `navigator.hid` : renvoie `null` (sans bloquer le test).
- `ControllerTestDialog.tsx` : bouton + état ; `report.serial` et `report.firmware` ajoutés (champs facultatifs du JSON `controller_test`, sans migration).
- `SAVForm.tsx` / `SAVWizardDialog.tsx` : au retour du test, `device_imei` est rempli seulement s'il est vide et si un numéro a été lu.
- `controllerPrint.tsx` : affiche la série lue si l'IMEI du dossier est vide.
- Tests unitaires du décodage des octets (MAC DS4/DualSense, série Switch).
- Limite : test réel impossible sans manette physique de mon côté ; la vérification se fera avec vos manettes.
