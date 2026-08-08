# RDV libre : création client + envoi SMS

Améliorer la fenêtre "Nouveau rendez-vous" (agenda, RDV sans SAV) pour pouvoir créer un client à la volée et prévenir le client par SMS dès la création.

## 1. Créer un client depuis la fenêtre RDV

Dans le sélecteur de client (liste déroulante de recherche) :
- Ajouter en bas de liste une entrée "Créer le client « … »" quand la recherche ne correspond à personne.
- Un petit formulaire inline apparaît dans la fenêtre : prénom, nom, téléphone (validé au format français), email (optionnel).
- À la validation, le client est créé via la logique existante anti-doublon (si un client avec le même téléphone / email / nom existe déjà, il est réutilisé au lieu d'en créer un nouveau) puis sélectionné automatiquement pour le RDV.

## 2. Envoi SMS du RDV fixé

- Ajouter une case à cocher "Prévenir le client par SMS" dans la fenêtre de création, activée par défaut dès qu'un client avec téléphone est sélectionné, désactivée (et grisée) sinon.
- À la création du RDV, si la case est cochée : envoi d'un SMS reprenant la date, l'heure, le type de RDV, la durée, et le lien de confirmation public (`/rdv/:token`) — même format que la proposition de RDV existante.
- Le résultat de l'envoi est affiché (SMS envoyé / erreur), sans bloquer la création du RDV : le RDV reste créé même si le SMS échoue.
- Les erreurs de crédits SMS (magasin sans crédits, réseau saturé) restent gérées par le mécanisme existant.

## Détails techniques

- `src/hooks/useAppointments.ts` : la mutation de création retourne déjà la ligne insérée ; s'assurer que `confirmation_token` est bien renvoyé dans le `select()` pour construire l'URL publique.
- `src/components/agenda/AppointmentDialog.tsx` :
  - état local pour le mini-formulaire client + case SMS ;
  - création client via `createCustomer` de `useCustomers` (protection doublons existante) avec `shop_id` du profil ;
  - envoi via `sendAppointmentSMS` de `useSMS` et `generatePublicAppointmentUrl` (même appel que `AppointmentProposalDialog`).
- Aucun changement de base de données, aucune modification des autres écrans de l'agenda.
