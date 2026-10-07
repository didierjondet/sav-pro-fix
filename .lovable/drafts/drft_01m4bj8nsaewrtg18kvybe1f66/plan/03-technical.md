## Détails techniques

- **Détection** : API Gamepad du navigateur (`navigator.getGamepads`, boucle `requestAnimationFrame`), mapping « standard ». Identification du modèle via `gamepad.id` (vendor/product : Sony 054c, Microsoft 045e, Nintendo 057e). Vibration via `vibrationActuator.playEffect` si disponible.
- **Profils de modèles** : `src/lib/controllerProfiles.ts` (boutons présents, libellés ×/○/□/△ vs A/B/X/Y, points manuels propres au modèle).
- **Mesures** : dérive = moyenne des axes au repos sur 2 s (seuil configurable, défaut 8 %) ; circularité = rayon max par secteur angulaire ; course gâchette = valeur max atteinte.
- **Composants** : `src/components/sav/controller/ControllerTestDialog.tsx` (étapes), `ControllerDiagram.tsx` (SVG réutilisé pour l'écran et l'impression, zones colorées OK/défaut), `buildControllerSummary()` qui produit le texte de panne.
- **Intégration** : bouton ajouté dans `SAVForm.tsx` et `SAVWizardDialog.tsx` après le choix du type ; au retour, remplit `device_brand`, `device_model`, `problem_description`. Aucune autre modification de ces formulaires.
- **Stockage du rapport** : nouvelle colonne `controller_test jsonb` (nullable) sur `sav_cases`, en migration additive préparée dans le brouillon ; elle ne s'applique qu'à l'acceptation du brouillon. Le rapport sert à réafficher le schéma dans l'onglet Documents et dans `SAVPrint.tsx`.
- **Tests** : tests unitaires sur `buildControllerSummary` et le calcul de dérive (seuil 8 %).
