# Onglet "Client" dans la fiche SAV

## Objectif
Pouvoir lier, changer ou délier un client sur n'importe quel SAV (ex. #2026-08-15-006 sans client), voir l'historique du client, et créer un nouveau client depuis le SAV.

## Ce qui sera ajouté
Un nouvel onglet **Client** dans la fiche SAV (vue standard et vue simplifiée), placé juste après Aperçu, contenant :

1. **Client actuel**
   - Carte avec nom, téléphone, email, adresse.
   - Bouton "Changer de client" et bouton "Délier" (remet le SAV sans client).
   - Si aucun client : message clair + bouton "Lier un client".

2. **Recherche / liaison**
   - Recherche sur toute la base clients de la boutique (nom, prénom, email, téléphone), même logique que la création de SAV.
   - Sélection d'un résultat = liaison immédiate au SAV.
   - Bouton "Créer un nouveau client" avec le même formulaire qu'à la création d'un SAV (prénom, nom, email, téléphone, adresse), avec validation du téléphone et détection de doublons existante ; le client créé est directement rattaché au SAV.

3. **Historique du client sélectionné**
   - Liste des autres SAV du client (numéro, appareil, statut, date, montant), cliquables pour naviguer.
   - Compteur du nombre total de SAV du client.

## Signalement visuel
L'onglet Client apparaît en couleur d'alerte (comme Prêt matériel) lorsque le SAV n'a **aucun** client rattaché, pour rendre l'anomalie visible.

## Détails techniques
- Nouveau composant `src/components/sav/SAVCustomerTab.tsx`, réutilisant `useAllCustomers`, `useCustomers.createCustomer` (détection doublons déjà en place) et `useCustomerSAVs` pour l'historique.
- Liaison/déliaison = mise à jour de `sav_cases.customer_id` (mise à `null` pour délier) + `logSAVChange` pour l'audit, comme le fait déjà `EditSAVCustomerDialog`.
- Ajout de l'onglet dans les deux blocs `Tabs` de `src/pages/SAVDetail.tsx` avec invalidation des caches React Query du SAV après changement.
- Aucune modification de schéma de base de données, aucun changement sur les autres onglets.
