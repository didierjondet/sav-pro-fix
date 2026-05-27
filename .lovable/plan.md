## Problème

Dans `src/components/layout/Sidebar.tsx` (L108-125), le badge rouge à côté du menu **Devis** ne compte que les statuts `draft`, `sent`, `viewed`. Les devis au statut `accepted` (validés en attente de transformation) ne sont comptés dans aucun badge visible. Résultat : pour Easycash Agde (qui n'a actuellement que des devis `accepted`/`archived`/`completed`/`rejected`), aucun badge n'apparaît, alors que la page `/quotes` affiche bien des devis dans les onglets Actifs/Validés.

## Correctif

Élargir la définition du compteur `inProgress` à **tous les devis sauf** `rejected`, `archived`, `completed`. Cela inclut donc : `draft`, `sent`, `viewed`, `accepted`, `sms_accepted`, `expired`.

### Fichier modifié

**`src/components/layout/Sidebar.tsx`** (uniquement la logique du `reduce` L108-125)

Avant :
```ts
const activeStatuses = ['draft', 'sent', 'viewed'];
if (q.status === 'sms_accepted') acc.clientAccepted++;
else if (q.status === 'accepted') acc.accepted++;
else if (q.status === 'rejected') acc.rejected++;
else if (activeStatuses.includes(q.status)) acc.inProgress++;
```

Après :
```ts
const inactiveStatuses = ['rejected', 'archived', 'completed'];
if (!inactiveStatuses.includes(q.status)) acc.inProgress++;
if (q.status === 'sms_accepted') acc.clientAccepted++;
```

Le badge rouge `inProgress` reflètera tous les devis encore actifs (Agde : 1 `accepted` → badge "1"). Le badge vert `clientAccepted` (sms_accepted) reste inchangé pour signaler les acceptations client à traiter.

## Hors scope

- Aucune modification de la page `/quotes`, des onglets, ou du hook `useQuotes`.
- Aucun changement visuel autre que la réapparition du badge.
- Aucune modification de logique métier ou de DB.