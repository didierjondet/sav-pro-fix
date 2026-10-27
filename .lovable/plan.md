# Envoi de photos / PDF depuis le téléphone dans la zone Documents d'un nouveau SAV

## Ce que vous verrez
- Dans la zone « Documents / Photos » du nouveau SAV (formulaire complet et assistant simplifié), un bouton icône téléphone coloré qui bouge doucement (petite oscillation répétée) avec le texte « Depuis mon téléphone ».
- Un clic ouvre une fenêtre avec un QR code (valable 15 minutes, comme pour la création SAV par smartphone), sans connexion nécessaire sur le téléphone.
- Sur le téléphone : une page très simple « Ajouter des documents » avec deux gros boutons : « Prendre une photo » et « Choisir un fichier (photo ou PDF) ». On peut en ajouter plusieurs, voir les miniatures, en retirer, puis « Envoyer à l'ordinateur ».
- Sur l'ordinateur : chaque fichier envoyé apparaît automatiquement dans la zone Documents du SAV en cours, en temps réel ; la fenêtre affiche « 3 fichiers reçus » et peut être fermée à tout moment.
- Le reste du formulaire n'est pas modifié.

## Détails techniques
- Réutiliser `mobile_sav_sessions` avec un champ `purpose` (`sav_intake` par défaut, nouveau `documents`) ; nouvelle route publique `/m/sav/documents/:token` (page légère, aucun hook magasin/auth).
- `mobile-sav-upload` : accepter aussi `application/pdf` (limite 10 Mo pour PDF, 5 Mo images), même contrôle de jeton et chemin limité au magasin de la session ; pour `documents`, ajouter le chemin au `payload.photos` de la session (sans clôturer le jeton) pour permettre plusieurs envois.
- Bureau : composant `PhoneUploadButton` (QR bwip-js identique à `NewSAVModeDialog`, abonnement Realtime à la session) qui fusionne les nouveaux fichiers dans `deviceInfo.attachments` via `onFilesChange`. Branché à côté de `FileUpload` dans `SAVForm.tsx` et `SAVWizardDialog.tsx`.
- Animation : classe Tailwind keyframe « wiggle » définie dans la config, couleurs via tokens existants.
- Vérifier que `FileUpload` affiche correctement un PDF (icône + lien) ; sinon ajouter l'affichage PDF.
- Test : règle de type/taille de fichier accepté (images ≤5 Mo, PDF ≤10 Mo, autres refusés).
