# Onglet "Devis" dans le SAV + gestion des acomptes

## Objectif

Pouvoir créer, consulter, envoyer et suivre des devis directement depuis une fiche SAV, avec le même moteur que la page Devis, et pouvoir acter un acompte ou un règlement total (devis et SAV).

## Ce qui existe déjà

- La table `quotes` possède déjà `sav_case_id`, `deposit_amount`, `discount_info`, `status`.
- La table `sav_cases` possède déjà `deposit_amount` (renseigné à la création du SAV) mais il n'est jamais réaffiché ni modifiable ensuite.
- La page Devis gère déjà : création (QuoteForm), envoi SMS, impression PDF, acceptation/refus client, conversion en SAV.

## 1. Nouvel onglet "Devis" dans la fiche SAV

- Ajouté dans les deux vues (standard et simplifiée), à côté de "Pièces".
- Pastille sur le titre de l'onglet : nombre de devis liés, en couleur d'alerte si au moins un devis est en attente de réponse client.
- Contenu :
  - Liste des devis liés au SAV (`quotes.sav_case_id = savCase.id`) : numéro, date, montant, statut (brouillon / envoyé / vu / accepté / refusé + motif / expiré), acompte et reste à payer.
  - Bouton "Nouveau devis" : ouvre le formulaire de devis existant, pré-rempli avec le client, la marque/modèle/IMEI, la panne du SAV, et lié automatiquement au SAV.
  - Par devis : Imprimer (PDF), Envoyer par SMS, Voir/Modifier, Marquer accepté/refusé, Supprimer/Archiver — exactement les mêmes actions que sur la page Devis.
- Les devis créés depuis le SAV apparaissent normalement dans la page Devis, avec un badge/lien "SAV n°…" pour naviguer vers la fiche.
- Le client retrouve ses devis dans son espace de suivi public via le lien SMS habituel (inchangé).

## 2. Acompte et règlement (devis)

Dans le formulaire de devis et sur la fiche devis (page Devis et onglet Devis du SAV) :

- Champ "Acompte versé" (€) déjà présent à la création, désormais aussi modifiable après coup.
- Bouton raccourci "Réglé en totalité" (met l'acompte au montant total) et "Aucun règlement" (remet à 0).
- Affichage clair : Total TTC / Acompte versé / **Reste à payer** (0 € si tout est réglé), avec un badge "Payé", "Acompte" ou "À régler".
- Ces montants apparaissent aussi sur le PDF du devis (bloc totaux déjà existant, complété).

## 3. Acompte et règlement (SAV)

- Dans le résumé "Détail du dossier" de la fiche SAV (deux vues) : bloc Montants — Total, Remise éventuelle, Acompte versé, Reste à payer.
- Édition de l'acompte sur place (même logique d'enregistrement direct que les commentaires), avec les mêmes raccourcis "Réglé en totalité" / "Aucun règlement".
- Le reste à payer est repris sur le document de restitution / prise en charge imprimé.
- Trace dans l'historique d'audit du SAV (le libellé `deposit_amount` = "Acompte" existe déjà).

## Détails techniques

- Base de données : aucune nouvelle table. Ajout d'une colonne `paid_in_full boolean default false` sur `quotes` et `sav_cases` uniquement si nécessaire — sinon le statut de règlement est déduit de `deposit_amount >= total` (approche retenue par défaut, pas de migration).
- Nouveau composant `src/components/sav/SAVQuotesTab.tsx`, monté dans `src/pages/SAVDetail.tsx` (vues standard et simplifiée).
- Extraction des actions communes (génération PDF devis, envoi SMS devis) de `src/pages/Quotes.tsx` vers un module partagé `src/lib/quoteActions.ts`, réutilisé par la page et par l'onglet SAV — aucun changement de rendu sur la page Devis.
- `src/hooks/useQuotes.ts` : ajout d'un sélecteur/hook `useSAVQuotes(savCaseId)` filtrant par `sav_case_id`, avec invalidation temps réel déjà en place.
- `QuoteForm` : accepte des valeurs initiales (client, appareil, panne, `sav_case_id`) et rend l'acompte éditable en modification.
- Calculs d'affichage centralisés dans un petit helper (total, acompte, reste à payer) pour garder page Devis, onglet SAV et PDF cohérents.
- Aucune modification des règles de marge/HT existantes, ni des mises en page déjà validées : seuls les blocs listés ci-dessus sont ajoutés.
