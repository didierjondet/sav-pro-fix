# Test manette : stabilité des joysticks, impression avec n° SAV, carte dédiée dans Documents

## Ce que vous verrez

1. **Stabilité des joysticks en %** : pendant la mesure au repos (2 s, bouton « Mesurer la dérive »), on mesure aussi les tremblements du stick. 100 % = le stick ne bouge pas du tout ; plus il tremble, plus le chiffre baisse. Affiché à côté de la dérive dans le résumé, et sur la feuille imprimée (« Stabilité 97 % »). En dessous de **90 %**, le stick est signalé dans les pannes : « Joystick gauche : instable (stabilité 82 %) ».
2. **Plus d'impression sans numéro de SAV** : le bouton « Imprimer » de la fenêtre de test disparaît. À la fin de la création du SAV, dans la fenêtre d'impression qui s'ouvre déjà, une case **« Feuille test manette »** (cochée par défaut si un test a été fait) imprime la feuille avec le vrai numéro et le code-barres. La réimpression reste possible depuis le dossier.
3. **Onglet Documents** : la feuille manette sort de la carte « Impressions » et a sa propre carte **« Test manette »**, avec un logo de manette et une couleur distincte, placée juste sous les impressions classiques (vue standard et vue simplifiée).

## Détails techniques
- `controllerTest.ts` : `computeStability(samples)` = `100 − écart-type moyen (distance au point de repos) × 1000`, borné 0–100 (un écart de 1 % du débattement → 90 %) ; champ `stability?: number` dans `StickResult` ; seuil `STABILITY_THRESHOLD = 90` dans `buildControllerSummary`. Les anciens tests sans stabilité n'affichent rien. Tests unitaires : stick immobile = 100 %, seuil 90 %.
- `ControllerTestDialog.tsx` : calcul au même moment que la dérive ; affichage ; suppression du bouton Imprimer.
- `PrintConfirmDialog.tsx` : prop facultative `controllerReport` → case à cocher ; impression via `printControllerSheet` avec `case_number`, IMEI, SKU après création. Branchée depuis `SAVForm.tsx` et `SAVWizardDialog.tsx`.
- `controllerPrint.tsx` : ligne stabilité sous chaque tracé.
- `SAVDetail.tsx` : bouton déplacé dans une carte séparée (icône manette, bordure/fond en couleur d'accent des tokens), deux vues.
