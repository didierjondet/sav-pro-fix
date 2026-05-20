# Attribuer un dossier SAV à un rendez-vous confirmé

Objectif : depuis la fiche d'un rendez-vous confirmé, pouvoir rattacher un dossier SAV existant (utile quand le RDV a été pris avant la création du SAV).

## Comportement

- Dans la fenêtre « Modifier le rendez-vous » (ouverte depuis l'agenda), si le RDV est `confirmed` (ou `proposed` / `counter_proposed`) **et** qu'aucun `sav_case_id` n'est encore relié :
  - Afficher un bouton « Attribuer un dossier SAV ».
  - Ce bouton ouvre un sélecteur (popover/command) listant les SAV à choisir :
    - Si le RDV a déjà un client : on propose en priorité les SAV actifs de ce client (statut différent de `ready`, `cancelled`).
    - Sinon : champ de recherche libre par numéro de dossier, nom client, marque/modèle.
  - Validation → mise à jour de `appointments.sav_case_id` pour le RDV courant.
- Une fois rattaché, la section « Dossier SAV » déjà existante s'affiche normalement (appareil, pièces, bouton « Ouvrir le dossier SAV »).
- Possibilité de **détacher** le SAV (petit bouton « Détacher ») si on s'est trompé : remet `sav_case_id` à null.

## Détails techniques

1. `src/hooks/useAppointments.ts`
   - Ajouter `sav_case_id?: string | null` dans `UpdateAppointmentData` pour autoriser l'assignation et le détachement.

2. Nouveau composant `src/components/agenda/AttachSAVToAppointmentPopover.tsx`
   - Props : `appointmentId`, `customerId?`, `onAttached()`.
   - Charge :
     - Si `customerId` : SAV actifs du client (statut hors `ready`, `cancelled`), triés par date décroissante.
     - Sinon : recherche débouncée dans `sav_cases` (limit 20) filtrée sur le shop courant.
   - Sur sélection → `updateAppointment({ id, data: { sav_case_id } })` puis `onAttached()`.

3. `src/components/agenda/AppointmentDialog.tsx`
   - Quand `appointment` existe, statut ∈ {`proposed`, `confirmed`, `counter_proposed`} et `appointment.sav_case_id == null` :
     - Afficher le bouton + popover de rattachement.
   - Dans la section « Dossier SAV » existante : ajouter un petit bouton « Détacher » qui appelle `updateAppointment({ id, data: { sav_case_id: null } })`.
   - Invalider le cache des appointments + des badges SAV (`sav-next-appointments`) après changement.

## Hors scope

- Pas de création de SAV depuis le RDV (un bouton dédié pourra être ajouté ultérieurement).
- Pas de modification de la création de RDV ni du flux public client.
- Pas de migration base : la colonne `sav_case_id` existe déjà et est nullable.
- Pas de changement du badge rond RDV sur les cartes SAV (il bénéficiera automatiquement du rattachement).
