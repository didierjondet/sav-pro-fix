## Problème

Sur la page SAV Détail, quand on ajoute/modifie/supprime le client via la popup `EditSAVCustomerDialog`, la popup se ferme mais le bloc « Coordonnées du client » continue d'afficher l'ancienne valeur (souvent vide) jusqu'à un reload manuel.

## Cause

Dans `src/pages/SAVDetail.tsx` :
- Le callback `onCustomerUpdated` du `EditSAVCustomerDialog` est vide (commentaire « Le realtime se charge de la mise à jour »).
- Le listener realtime sur `sav_cases` met bien à jour `customer_id`, mais il conserve volontairement `customer: prevCase?.customer` (la relation jointe). Donc le nom du client affiché ne change jamais sans reload.
- `useSAVCases().refetch` n'est pas exposé dans la déstructuration et n'est jamais appelé.

## Correction (uniquement le rafraîchissement, aucune autre modification)

Fichier : `src/pages/SAVDetail.tsx`

1. Ajouter `refetch` à la déstructuration de `useSAVCases()`.
2. Brancher `onCustomerUpdated` du `EditSAVCustomerDialog` sur une fonction qui :
   - récupère le `customer` à jour (`first_name, last_name, email, phone, address`) depuis Supabase à partir du `customer_id` courant du SAV (relu en base pour couvrir aussi le cas suppression : `customer_id` devenu `null`),
   - met à jour le `savCase` local avec le nouveau `customer_id` et l'objet `customer` correspondant (ou `undefined` si supprimé),
   - appelle `refetch()` pour synchroniser la liste globale (et donc la pastille, la liste SAV, etc.).
3. Corriger le listener realtime existant : si `payload.new.customer_id !== prevCase?.customer_id`, ne pas conserver `prevCase.customer` ; déclencher un refetch ciblé du customer (même helper que ci-dessus) au lieu de garder l'ancien.

Aucun changement sur le dialog lui-même, sur le style, ni sur les autres champs.

## Hors périmètre

- Pas de modification de `EditSAVCustomerDialog.tsx`.
- Pas de modification du changement de type de SAV (`updateSavType`) qui fonctionne déjà via `setSavCase`.
- Pas de modification visuelle.
