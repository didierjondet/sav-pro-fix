# Accès SAV optimisé smartphone

## Objectif

Une URL dédiée, à enregistrer sur l'écran d'accueil du téléphone, qui permet à un utilisateur connecté du magasin de :

1. Rechercher un SAV manuellement (numéro de dossier, nom client, marque, modèle, IMEI) — même moteur que la vue classique.
2. Scanner directement le QR code d'un SAV avec l'appareil photo, et être envoyé sur la fiche du dossier.
3. Rester derrière l'authentification existante (redirection vers `/auth` si non connecté, retour automatique après login).

## URL

- Route protégée : **`/m/sav`** (courte, facile à retenir, "m" pour mobile).
- Ajoutée dans le bloc `AppLayout` de `src/App.tsx` → hérite automatiquement du `RequireAuth` déjà en place pour les routes internes. Pas de nouvelle logique d'auth à écrire.

## Page

Nouvelle page `src/pages/MobileSAVLookup.tsx`, pensée pour l'écran vertical d'un téléphone :

- En‑tête compact : logo boutique + titre "Recherche SAV".
- Gros bouton **Scanner un QR code** (icône appareil photo).
- Champ **Recherche** (numéro dossier / client / IMEI / marque / modèle).
- Liste des résultats en cartes tactiles (grande cible) reprenant les infos clés déjà utilisées dans la vue standard : n° dossier, statut coloré, client, appareil, date. Tap = ouvre `/sav/:id`.
- État vide : message d'accueil + suggestion de scanner ou de saisir.

La recherche réutilise le hook existant (`useSAVCases` déjà utilisé par `SAVList`) et filtre côté client sur les mêmes champs que la liste standard, avec un debounce léger.

## Scanner QR / code-barres

- Composant `MobileQRScanner` (nouveau) qui ouvre l'appareil photo via l'API `BarcodeDetector` du navigateur quand disponible, avec fallback sur la librairie `@zxing/browser` (déjà utilisée ailleurs dans le projet pour le scan de pièces, à confirmer à l'implémentation ; sinon ajout de `@zxing/browser`).
- Demande la permission caméra à l'ouverture, préférence caméra arrière (`facingMode: 'environment'`).
- Interprétation de la valeur scannée :
  - URL de suivi (`/track/<slug>` ou URL courte générée par `generateShortTrackingUrl`) → résout le `tracking_slug`, retrouve le SAV du magasin courant, redirige vers `/sav/:id`.
  - Numéro de dossier brut (format `YYYY-MM-DD-NNN`, code-barres 128 imprimé sur l'étiquette) → cherche par `case_number` dans le shop courant, redirige vers `/sav/:id`.
  - Valeur non reconnue → toast d'erreur, reste sur l'écran de scan.
- Si aucun SAV correspondant dans le shop → toast "SAV introuvable dans votre boutique".
- Bouton "Annuler" pour fermer la caméra proprement (arrêt du `MediaStream`).

## Authentification

Aucun changement au système d'auth. La route étant placée sous `AppLayout`, si l'utilisateur ouvre `/m/sav` sans session, il est redirigé vers `/auth` puis renvoyé sur `/m/sav` après connexion — comme pour toutes les routes internes. À noter pour toi : après avoir enregistré l'URL sur l'écran d'accueil, la première ouverture demandera la connexion, puis la session reste active tant que le navigateur la conserve.

## Hors périmètre (je n'y touche pas)

- Pas de modification de la liste SAV classique (`SAVList`), de la fiche SAV, du QR déjà imprimé, ni de `AppLayout` / sidebar.
- Pas de PWA / installation "vraie appli" (sauf demande explicite ultérieure).
- Pas de nouvelle table ni de migration.

## Fichiers touchés

- `src/App.tsx` — ajout de la route `/m/sav` dans le bloc `AppLayout`.
- `src/pages/MobileSAVLookup.tsx` — nouvelle page.
- `src/components/sav/MobileQRScanner.tsx` — nouveau composant scanner caméra.
- Éventuellement `package.json` si `@zxing/browser` n'est pas déjà présent.
