## Objectif
Sur la page mobile `/m/sav`, ajouter la possibilité de lancer un inventaire, et rendre l'URL mobile facilement retrouvable dans les Réglages.

## 1. Page mobile `/m/sav` — bouton Inventaire
Fichier : `src/pages/MobileSAVLookup.tsx`
- Ajouter, sous les boutons existants (Scan QR / Recherche), un troisième bouton pleine largeur **« Lancer un inventaire »** (icône `ClipboardList` ou `PackageSearch`).
- Au clic : `navigate('/inventory')` (page existante déjà responsive et protégée par l'auth).
- Aucun changement à la logique d'inventaire elle-même.

## 2. Réglages — bloc « Accès mobile »
Fichier : `src/pages/Settings.tsx` (ou un nouveau petit composant `src/components/settings/MobileAccessCard.tsx` intégré dans l'onglet Général).
- Ajouter une carte **« Accès rapide mobile »** contenant :
  - Le libellé de l'URL : `{origin}/m/sav`
  - Un bouton **Copier** (clipboard).
  - Un bouton **Ouvrir** (nouvelle fenêtre).
  - Un petit QR code (via `qrcode.react`, déjà utilisé dans le projet) pour scanner depuis un smartphone et l'enregistrer en favori.
  - Note d'usage : « Ouvrez cette adresse sur votre smartphone puis ajoutez-la à l'écran d'accueil. »

## Détails techniques
- Utiliser `window.location.origin` côté client pour construire l'URL (respect de la règle domaine de production quand applicable).
- Réutiliser les composants existants (`Button`, `Card`, `Input readOnly`).
- Pas de modification back-end, pas de migration.

## Hors périmètre
- Pas de version mobile dédiée de l'inventaire (la page `/inventory` existante est réutilisée telle quelle).
- Aucun autre changement UI/logique.