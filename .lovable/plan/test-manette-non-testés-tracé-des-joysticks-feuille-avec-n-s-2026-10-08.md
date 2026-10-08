# Test manette : non testés, tracé des joysticks, feuille avec n° SAV, réimpression

## Ce que vous verrez

1. **Liste « Fonctions non testées »** dans le Résumé du test (et sur la feuille imprimée), séparée des « Pannes constatées » : boutons jamais appuyés, gâchettes non enfoncées, joysticks sans cercle ni mesure de dérive, vibrations et vérifications manuelles laissées sans réponse. Aujourd'hui un bouton non appuyé est noté « ne répond pas » : il passera dans « non testé ».
2. **Tracé complet des joysticks** : pour chaque stick, le dessin de tout le débattement parcouru (cercle de référence, zone atteinte, point de repos/dérive). Affiché dans le Résumé, enregistré avec le rapport et reproduit sur la feuille imprimée.
3. **Feuille graphique avec en-tête SAV** : en haut, en gros, le **numéro de SAV** et le **même QR code de suivi** que sur les autres impressions, plus le **numéro de série/IMEI** et le **SKU** s'ils sont renseignés. Pendant la création, le numéro n'existe pas encore : la feuille imprimée depuis la fenêtre de test affiche « SAV en cours de création » ; la version complète s'obtient depuis le dossier.
4. **Réimpression depuis le dossier** : dans l'onglet Documents, carte « Impressions », un bouton « Feuille test manette » (présent seulement si le dossier contient un test), dans la vue standard et la vue simplifiée.

## Détails techniques
- `src/lib/controllerTest.ts` : `buildUntestedList(report)` ; `buildControllerSummary` n'inclut plus les éléments `untested` ; ajout au rapport de `sticks.left/right.trail` (points échantillonnés, max ~120 par stick, arrondis 2 décimales) pour rester léger en base. Tests unitaires ajoutés (non testé ≠ panne).
- Nouveau `src/lib/controllerPrint.ts` : génère le HTML de la feuille (schéma SVG, tracés, pannes, non testés, en-tête n° SAV + QR `api.qrserver.com` sur `generateShortTrackingUrl`, IMEI, SKU), utilisé par `ControllerTestDialog` et par le dossier.
- `ControllerTestDialog.tsx` : section « Non testées » et tracés dans le Résumé ; impression via le nouveau module.
- `src/pages/SAVDetail.tsx` : bouton dans la carte Impressions des deux vues, lit `savCase.controller_test`.
- Aucune modification de base de données (la colonne `controller_test` existe déjà).
