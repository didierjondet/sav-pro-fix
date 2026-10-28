# QR code « Récupérer le prêt » dans l'encadré rouge

Le document de restitution reste au magasin avec le produit : le QR peut donc lancer le retour directement, sans connexion, comme la saisie de SAV par smartphone.

## Ce qui change
- Dans l'encadré rouge « MATÉRIEL DE PRÊT À RÉCUPÉRER », chaque prêt en cours a un **QR code** à droite, avec « Scanner au retour du matériel ».
- On le scanne avec n'importe quel téléphone, **sans se connecter**. Une page simple, étape par étape, s'ouvre :
  1. Rappel du matériel attendu (nom, modèle, IMEI/série, caution) pour vérifier que c'est le bon.
  2. Photos du matériel rendu (appareil photo du téléphone, plusieurs possibles).
  3. État au retour + notes (facultatif).
  4. Bouton « Valider le retour ».
- À la validation : le prêt passe « rendu » tout de suite, les photos deviennent la référence d'état pour le prochain prêt (même règle que dans Fixway), et l'onglet Prêt matériel du SAV se met à jour sur l'ordinateur.
- Prêt déjà rendu : la page affiche « Déjà restitué le … », rien n'est modifié.
- Le téléphone ne voit que ce prêt : aucune donnée client ni autre donnée du magasin.
- Depuis un ordinateur connecté, le même QR ouvre aussi cette page (le bouton « Marquer rendu » dans Fixway reste disponible comme aujourd'hui).

## Détails techniques
- Migration : colonne `loaner_loans.return_token` (aléatoire, unique, créée pour chaque prêt existant et nouveau). RPC anon `loaner_return_open(token)` (infos matériel minimales, statut) et `loaner_return_submit(token, condition, notes, photos)` qui vérifie le jeton, refuse si déjà rendu, limite les champs, enregistre `returned_at`, `return_photos` et met à jour `loaner_equipment.condition_photos`.
- Edge function `mobile-sav-upload` : accepte aussi un jeton de retour de prêt pour les photos (JPG/PNG/WebP ≤ 5 Mo, stockées dans le dossier du magasin, chemins préfixés comme les photos téléphone existantes).
- Nouvelle page publique `/pret/retour/:token` (style des pages mobiles existantes, gros boutons).
- `src/utils/pdfGenerator.ts` : QR généré localement avec bwip-js, URL `https://fixway.fr/pret/retour/<token>`.
- Rafraîchissement temps réel de la carte prêt du SAV après validation.
- Tests : refus si jeton invalide ou prêt déjà rendu.
