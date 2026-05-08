## Objectif

Quand un client accepte un devis depuis la page publique SMS (`status = 'sms_accepted'`), il doit :
1. apparaître dans l'onglet **"Devis acceptés"** (déplacement uniquement, pas de changement de couleur)
2. afficher un compteur dans le titre de l'onglet
3. afficher un compteur (badge) sur l'item **Devis** de la sidebar
4. déclencher une **notification** (cloche) du type "Votre devis n°XXX vient d'être accepté par le client. Transformez-le en SAV."
5. corriger le SMS post-conversion qui réutilise encore l'URL preview lovable

## Plan

### 1. `src/pages/Quotes.tsx` — onglets et carte

- `acceptedQuotes` : inclure aussi `status === 'sms_accepted'` (en plus de `'accepted'`).
- `activeQuotes` : exclure `'sms_accepted'`.
- Onglet "Devis acceptés" : afficher déjà `({acceptedQuotes.length})`. Vérifier que c'est bien visible (déjà le cas ligne 782).
- Dans `renderQuoteCard`, pour `status === 'sms_accepted'` :
  - Affichage normal (pas de fond vert), juste un badge "Accepté par le client le <date>" (réutiliser le bloc lignes 592–597 en l'étendant à `sms_accepted` et en libellant "le client").
  - Bouton **Valider** (transformation en SAV) : déjà présent pour `'accepted'` ligne 627 — étendre la condition à `['accepted','sms_accepted'].includes(quote.status)`.
  - Masquer le bouton "Renvoyer SMS" / "SMS" pour `sms_accepted` (le devis est déjà accepté).
- `getStatusText` / `getStatusColor` : ajouter mapping `sms_accepted` → "Accepté par client" / `default`.

### 2. `src/components/layout/Sidebar.tsx` — badge

Dans le `reduce` (ligne 108–123) : compter `sms_accepted` dans `acc.accepted` (ou créer un compteur dédié `clientAccepted`).

Ajouter à côté du badge "inProgress" un second badge orange pour les devis acceptés-client en attente de validation (ligne 265) :
```tsx
{item.href === '/quotes' && quoteCounts.clientAccepted > 0 && (
  <Badge className="ml-1 bg-green-600 text-white text-xs">{quoteCounts.clientAccepted}</Badge>
)}
```

### 3. Notification cloche — création depuis l'edge function `quote-public`

Dans `supabase/functions/quote-public/index.ts`, juste après l'update réussie quand `status === 'sms_accepted'` (lignes 102–104) :

```ts
if (status === 'sms_accepted' && updatedQuote.shop_id) {
  await supabase.from('notifications').insert({
    shop_id: updatedQuote.shop_id,
    type: 'general',
    title: 'Devis accepté par le client',
    message: `Le devis n°${updatedQuote.quote_number} vient d'être accepté par ${updatedQuote.customer_name}. Transformez-le en SAV pour finaliser.`,
    read: false,
  });
}
```

Vérifier le schéma `notifications` (colonnes `shop_id`, `type`, `title`, `message`, `read`) — déjà utilisé par `useNotifications.ts` (lignes 162–170, 361). Si `'general'` n'est pas suffisant, ajouter à terme un type `'quote_accepted'`, mais pour rester sans migration on garde `'general'`.

Le hook `useNotifications` est déjà branché sur le realtime `notifications-realtime` → la cloche se mettra à jour automatiquement côté magasin.

### 4. Correction SMS de conversion devis → SAV (bug lovable persistant)

Dans `src/pages/Quotes.tsx`, fonction `convertQuoteToSAV` (lignes 514–540) :

- Remplacer :
  ```ts
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const trackingUrl = `${baseUrl}/track/${createdSAV.tracking_slug}`;
  ```
  par :
  ```ts
  import { generateShortTrackingUrl } from '@/utils/trackingUtils';
  const trackingUrl = generateShortTrackingUrl(createdSAV.tracking_slug);
  ```
  → produit `fixway.fr/track/<slug>` sans `https://` ni domaine preview lovable, identique au reste des SMS SAV.

### 5. Vérification

- Accepter un devis test depuis la page publique :
  - apparaît dans l'onglet "Devis acceptés" avec compteur incrémenté
  - badge vert sur l'item Devis de la sidebar
  - notification cloche "Votre devis n°XXX..."
- Cliquer **Valider** → choisir un type SAV → SAV créé, devis passe à `accepted`, SMS reçu sur le téléphone test contenant `fixway.fr/track/<slug>` (sans `https://`, sans "lovable").

### Fichiers modifiés

- `src/pages/Quotes.tsx` (filtres `acceptedQuotes`/`activeQuotes`, conditions sur la carte, libellés, correction URL SMS).
- `src/components/layout/Sidebar.tsx` (compteur acceptés client + badge).
- `supabase/functions/quote-public/index.ts` (insertion notification sur `sms_accepted`).

### Hors scope

- Pas de migration DB.
- Pas de changement de couleur de carte.
- Pas de modification du SMS initial du devis (déjà corrigé précédemment).
