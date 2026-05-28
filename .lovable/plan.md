## Problème

Le badge rouge à côté du menu **Devis** affiche actuellement tous les devis non terminés (incluant `accepted` et `sms_accepted`). Or l'utilisateur veut que ce badge corresponde exactement au contenu de l'onglet **"Devis actifs"** de la page `/quotes`, qui exclut aussi les devis acceptés.

Filtre actuel de l'onglet "Devis actifs" (`src/pages/Quotes.tsx` L115-119) :
- Exclut : `rejected`, `accepted`, `sms_accepted`, `archived`
- Inclut donc : `draft`, `sent`, `viewed`, `expired`, `completed`

## Correctif

Aligner le compteur `inProgress` du Sidebar sur le même filtre que l'onglet "Devis actifs".

### Fichier modifié

**`src/components/layout/Sidebar.tsx`** (L108-126, uniquement la définition de `inactiveStatuses`)

Avant :
```ts
const inactiveStatuses = ['rejected', 'archived', 'completed'];
```

Après :
```ts
const inactiveStatuses = ['rejected', 'archived', 'accepted', 'sms_accepted'];
```

Résultat : le badge rouge affichera exactement le même nombre que `(Devis actifs)` dans la page `/quotes`. Les compteurs `clientAccepted` (badge vert SMS) et `rejected` restent inchangés.

## Hors scope

- Aucune modification de la page `/quotes`, du hook `useQuotes`, ou de la DB.
- Aucun changement visuel sur les autres badges.
