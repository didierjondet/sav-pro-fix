# Transformer un diagnostic DiagStation en SAV

## Ce qui change
- Dans **Tests → Diags**, chaque rapport non rattaché reçoit un bouton **« Transformer en SAV »** (à côté de « Rattacher »).
- Le bouton ouvre la création de SAV déjà remplie : marque, modèle, IMEI / n° de série, et une description de panne listant les tests en échec avec la note et le score du diag.
- À l'enregistrement du SAV, le diagnostic est automatiquement rattaché au nouveau dossier : la liste affiche « SAV n° … » et le lien « Voir le rapport » reste disponible.
- Le rapport est aussi visible depuis le SAV (onglet Documents) avec un lien vers la page du rapport.
- Rien d'autre ne change dans la page ni dans la création de SAV.

## Détails techniques
- `DiagnosticsList.tsx` : charger aussi `failed_tests, score, pass_count` ; bouton qui `navigate('/sav/new', { state: { diagnostic: {...} } })`.
- `NewSAV.tsx` : lire `state.diagnostic`, le passer à `SAVForm` (`initialDiagnostic`) et le conserver au passage « ordinateur ».
- `SAVForm.tsx` : prop `initialDiagnostic` (id, brand, model, imei, serial, problemDescription) → préremplissage comme pour la manette ; après création, `update device_diagnostics set sav_case_id` (politique RLS de liaison existante).
- Onglet Documents du SAV : lister les `device_diagnostics` où `sav_case_id` = le SAV, lien `diagPublicUrl`.
- Aucune migration nécessaire.
