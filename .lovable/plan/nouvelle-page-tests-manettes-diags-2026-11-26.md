# Nouvelle page « Tests » (Manettes + Diags)

## Ce que vous verrez
- Un nouveau menu **Tests** dans la barre de gauche, avec deux onglets : **Manettes** et **Diags**.
- Le bouton « Tester une manette » est **retiré** des formulaires de création de SAV (formulaire complet et assistant). Il se trouve désormais dans la page Tests.

## Onglet Manettes
- Bouton « Nouveau test manette » : ouvre le même test qu'aujourd'hui (boutons, joysticks, dérive, haut-parleur, micro, LED, « Pas testé »).
- À la fin du test, deux choix :
  1. **Imprimer et sauvegarder** : le test est enregistré dans l'historique et la feuille de test (avec code-barres) s'imprime.
  2. **Transformer en SAV** : le test est enregistré, puis la création de SAV s'ouvre déjà remplie (marque, modèle, n° de série, panne). Le test reste attaché au SAV et visible dans son onglet Documents, comme aujourd'hui.
- Liste des tests sauvegardés : date, manette, n° de série, défauts trouvés, SAV lié s'il existe. Actions : réimprimer, transformer en SAV (si pas encore lié), ouvrir le SAV lié, supprimer.
- Recherche par n° de série ou modèle.

## Onglet Diags
- La liste des rapports reçus de DiagStation (téléphones Android/iPhone), déjà visible aujourd'hui dans Paramètres, est reprise ici : date, appareil, IMEI, résultat, SAV lié.
- Actions : ouvrir le rapport, lier à un SAV, ouvrir le SAV lié.
- Les réglages DiagStation (clé de connexion) restent dans Paramètres.

## Détails techniques
- Migration : table `controller_tests` (shop_id, created_by, brand, model, serial, report jsonb, sav_case_id nullable, created_at) avec GRANT authenticated/service_role, RLS limitée au magasin de l'utilisateur.
- Page `src/pages/Tests.tsx` (route `/tests`, protégée) avec onglets ; entrée ajoutée à la Sidebar.
- `ControllerTestDialog` réutilisé tel quel ; nouveau dialogue de fin (Imprimer/sauvegarder ou Transformer en SAV) ; impression via `controllerPrint` existant.
- « Transformer en SAV » ouvre `SAVForm`/`SAVWizardDialog` prérempli avec le rapport (`controller_test` déjà enregistré sur le SAV aujourd'hui) puis met à jour `controller_tests.sav_case_id`.
- Retrait du bouton manette dans `SAVForm.tsx` et `SAVWizardDialog.tsx` (le champ prérempli reste accepté).
- Onglet Diags : réutilise `DiagnosticsList` (table `device_diagnostics`).
