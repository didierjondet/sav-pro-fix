# Feuille de clôture : grand encadré rouge « Prêt à récupérer »

## Ce qui existe aujourd'hui
Le document de restitution affiche déjà un petit bloc orange « Matériel de prêt NON restitué » en bas de page, juste avant les signatures. Il ne montre ni la caution, ni les photos, et il ne regarde que le dernier prêt.

## Ce qui change
Quand le SAV a un ou plusieurs prêts pas encore rendus au moment de la clôture :

- **Un grand encadré rouge** (bordure épaisse, titre en majuscules) placé au milieu de la feuille, juste après les informations de l'appareil et avant le détail des pièces :
  - Titre : « ⚠ MATÉRIEL DE PRÊT À RÉCUPÉRER »
  - Phrase : « Nous attendons le retour de : **[nom du matériel] — [marque modèle] ([couleur])** »
  - IMEI / numéro de série en gros si connus
  - Prêté le … / retour prévu le … (en rouge si la date est dépassée)
  - **Caution : XX,XX €** en gros si une caution existe, sinon « Aucune caution »
  - État au prêt et notes, en une ligne chacun
  - Jusqu'à 3 photos miniatures du matériel (photos d'état enregistrées sur la fiche du matériel), si elles existent
- Si plusieurs prêts sont en cours, chacun a sa ligne dans le même encadré.
- L'ancien petit bloc orange disparaît dans ce cas (pas de doublon).
- Prêt déjà rendu : le bloc vert actuel « restitué » reste comme aujourd'hui, inchangé.

## Mise en page (1 page si possible)
- Encadré, tableau des pièces, historique, photos et zone de signatures marqués « ne pas couper » : si la page déborde, la coupure se fait entre deux blocs, jamais au milieu d'un texte ou d'un tableau.
- Les titres de section ne restent jamais seuls en bas de page.
- Photos de l'encadré limitées à 3 petites miniatures pour garder la page compacte.

## Détails techniques
- `src/utils/pdfGenerator.ts` (`generateSAVRestitutionPDF`) : charger tous les prêts du SAV avec `deposit_amount`, `expected_return_at` et `equipment.condition_photos/photo_url` (URL signées du bucket `loaner-photos`) ; séparer prêts rendus / non rendus ; injecter le bloc rouge après la section appareil.
- CSS print : `break-inside: avoid` sur `.loaner-alert`, sections, tableaux, `.signature-section` ; `break-after: avoid` sur les titres `h4`.
- Couleurs via styles du document imprimé (comme le reste du PDF).
- Aucun changement de base de données.

---

# Ajout : photos au retour d'un prêt (ordinateur ou téléphone)

## Ce qui change
- Dans la fenêtre « Marquer rendu » d'un prêt (onglet Prêt matériel du SAV) :
  - on garde l'ajout de photos depuis l'ordinateur ;
  - on ajoute **le même bouton rouge qui bouge « Photos / PDF depuis mon téléphone »**, avec la même fenêtre QR code et les miniatures qui arrivent en direct (même composant que dans le nouveau SAV, aucune connexion sur le téléphone).
- Une fois le prêt marqué rendu, ces photos deviennent **les photos d'état de référence du matériel** : elles remplacent les anciennes sur la fiche du matériel et s'affichent au prochain prêt (et dans le grand encadré rouge de la feuille de clôture ci-dessus).
- Les photos restent aussi rattachées au retour de ce prêt (historique).

## Détails techniques
- `PhoneUploadButton` : réutilisé tel quel (prop `onFiles`), apparence inchangée ailleurs.
- `SAVLoanerCard.tsx` : bouton ajouté dans la fenêtre de retour ; chemins reçus ajoutés à `returnPhotos`. Les fichiers téléphone vivent dans le stockage des documents SAV, ceux de l'ordinateur dans celui des prêts : chaque chemin garde son origine pour l'affichage (URL signée sur le bon espace).
- `useLoanerLoans.returnLoan` : après enregistrement, met à jour `loaner_equipment.condition_photos` avec les photos du retour (si au moins une).
- Ajout des deux tâches dans roadmap.md au démarrage.
- Aucun changement de structure de base de données.
