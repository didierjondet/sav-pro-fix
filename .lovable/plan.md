# Réorganisation de la page SAV — vue simplifiée

## Constat

La page `SAVDetail` empile aujourd'hui, sur une seule colonne scrollable très longue :
en-tête + statut + actions, carte prêt, coordonnées client, détails dossier, description du problème, code-barres, pièces, documents, codes de sécurité, commentaires techniques, commentaires privés, messagerie. Résultat : on scrolle beaucoup, tout a le même poids visuel, on cherche l'info.

L'objectif est de **hiérarchiser** (ce qu'on regarde tout le temps vs. ce qu'on ouvre parfois) et de **grouper** (info client, info appareil, opérationnel, communication).

## Proposition — 3 axes combinables

### 1. Un bandeau « sticky » de contexte (toujours visible)

Un header condensé qui reste en haut au scroll, avec **uniquement l'essentiel** :
- Numéro de dossier + badge type (pastille couleur)
- Nom client + téléphone cliquable (SMS/appel)
- Appareil (marque + modèle) + IMEI compact
- Statut courant (sélecteur) + badge « en retard » si applicable
- Bouton actions rapides (⋯) : imprimer, PDF restitution, partager tracking, logs

Bénéfice : quel que soit l'endroit où l'on scrolle, on sait toujours **quel dossier, quel client, quel statut**.

### 2. Navigation par onglets plutôt qu'un long scroll

Sous le bandeau, remplacer la longue colonne par **4 onglets** :

```text
[ Aperçu ]  [ Réparation ]  [ Communication ]  [ Documents ]
```

- **Aperçu** (par défaut) : résumé condensé — coordonnées client (compact 2 colonnes), description du problème (mise en valeur, déjà stylisée), coût total, dates clés, prêt éventuel. Une seule page, pas de scroll ou presque.
- **Réparation** : détails techniques appareil, pièces requises / éditeur pièces, codes de sécurité / pattern, notes de réparation, commentaires techniques + privés, code-barres étiquette.
- **Communication** : messagerie interne, bouton SMS, lien tracking + QR, demande d'avis.
- **Documents** : documents attachés, PDF restitution, historique clôtures.

Bénéfice : chaque onglet tient dans un écran, on va directement à ce qu'on cherche.

### 3. Hiérarchie visuelle des cartes

- **Une seule carte "primaire"** par onglet (fond légèrement teinté, bordure accent) — la carte centrale de l'onglet.
- Les autres cartes en **secondaire** (fond neutre, bordure discrète) pour créer une lecture en Z.
- Icônes cohérentes en tête de carte, titres plus petits qu'aujourd'hui.
- Champs alignés en grille (labels gris clair au-dessus, valeurs en gras) plutôt qu'en `<strong>` inline.
- Regrouper les métadonnées peu utilisées (date création, SKU, date modif) dans un petit bloc `Infos` repliable en bas de l'onglet Aperçu.

## Vue simplifiée spécifiquement (`shop_admin`)

En vue simplifiée on peut aller plus loin :
- Masquer par défaut les onglets **Réparation** techniques (pièces, codes) → un seul onglet **Aperçu** + **Communication** + **Documents**.
- Cacher les blocs commentaires privés, logs, éditeur pièces.
- Description du problème reste la carte primaire de l'aperçu (déjà bien stylisée).

## Détails techniques

- Refactor de `src/pages/SAVDetail.tsx` uniquement (presentation, pas de logique métier).
- Utiliser `Tabs` de shadcn (`@/components/ui/tabs`) pour la navigation.
- Un composant `SAVStickyHeader` extrait pour le bandeau sticky (`position: sticky; top: 0; z-index`).
- Détecter la vue simplifiée via `localStorage.getItem('fixway_simplified_view')` + `useRolePermissions` (déjà utilisé ailleurs) pour conditionner les onglets visibles.
- Aucune modification de hooks, requêtes, RLS, DB, edge functions.
- Conserver **exactement** les composants existants (`SAVMessaging`, `SAVPartsEditor`, `SAVLoanerCard`, `ProblemDescriptionDisplay`, `SAVBarcode`, `SecurityCodesDisplay`, `SAVDocuments`, dialogs d'édition, etc.) — on ne change que leur emplacement et leur enveloppe visuelle.
- Onglet actif mémorisé en `localStorage` (`fixway_sav_detail_tab`) pour retrouver son contexte après retour arrière.

## Ce qui reste inchangé

- Toute la logique métier, hooks, mutations, permissions.
- Les composants enfants et leurs props.
- Les autres pages (liste SAV, dashboard, etc.).
- Le mode standard peut garder tout ou basculer aussi selon ton retour.

## Question ouverte avant implémentation

Souhaites-tu que **le mode standard** (admin/technicien) reçoive aussi ces onglets, ou uniquement la **vue simplifiée** ? Les deux sont possibles ; je peux aussi n'appliquer les onglets qu'en simplifié et garder l'existant pour les techniciens.
