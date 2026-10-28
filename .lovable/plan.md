# QR code « Récupérer le prêt » dans l'encadré rouge

## Ce qui change
- Dans l'encadré rouge « MATÉRIEL DE PRÊT À RÉCUPÉRER » du document de restitution, chaque prêt en cours a un **QR code** à droite, avec la mention « Scanner au retour du matériel ».
- Quand le client revient avec le matériel, on scanne le QR :
  - **avec l'ordinateur** (douchette ou webcam) ou **un téléphone déjà connecté à Fixway** : le SAV s'ouvre directement sur l'onglet Prêt matériel, avec la fenêtre « Retour du matériel » déjà ouverte pour ce prêt (état, notes, photos ordi ou téléphone avec le bouton rouge). Il ne reste qu'à valider.
  - **avec un téléphone non connecté** : on passe d'abord par la page de connexion Fixway, puis on arrive au même endroit.
- Si le prêt est déjà rendu : message « Ce matériel a déjà été restitué le … », rien n'est modifié.

## Pourquoi une connexion est demandée
Le document de restitution est remis au client. Si le QR suffisait à marquer le prêt « rendu » sans connexion, le client (ou n'importe qui) pourrait le faire depuis chez lui sans rapporter le matériel. Le QR sert donc de raccourci pour le magasin, mais la validation reste faite par une personne connectée du magasin.

## Détails techniques
- `src/utils/pdfGenerator.ts` : QR généré localement avec bwip-js (comme les autres codes), URL `https://fixway.fr/pret/retour/<loanId>` via l'origine publique de l'app.
- Nouvelle route protégée `/pret/retour/:loanId` : lit le prêt (RLS magasin), redirige vers `/sav/<sav_case_id>?tab=loaner&returnLoan=<loanId>` ; prêt introuvable/autre magasin → message d'erreur.
- `SAVDetail` / `SAVLoanerCard` : lecture du paramètre `returnLoan` pour ouvrir la fenêtre de retour automatiquement, puis nettoyage de l'URL.
- Redirection après connexion vers l'URL scannée (mécanisme de retour existant de la page de connexion).
- Aucun changement de base de données.
