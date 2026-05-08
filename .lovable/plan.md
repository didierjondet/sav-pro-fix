## Diagnostic

Logs edge `quote-public` confirment : `Quote f54974d4... updated to status: sms_accepted` ✅
Notification cloche reçue ✅ (table `notifications` est branchée sur son propre realtime).
**Mais** la table `public.quotes` n'est **pas** dans la publication `supabase_realtime` :

```
pg_publication_tables (supabase_realtime) →
  sav_cases, sav_parts, sav_status_history, sav_messages, support_*
  ❌ quotes absent
  ❌ notifications absent (mais géré ailleurs)
```

Conséquence : le canal `quotes-changes` (`useQuotes.ts` ligne 111) ne reçoit aucun événement quand l'edge function modifie le statut. L'UI ne bouge donc pas tant qu'on ne recharge pas la page. C'est aussi pour ça que le badge "Accepté par le client" n'apparaît pas : la carte n'est jamais re-rendue avec le nouveau statut `sms_accepted`.

## Plan

### 1. Migration DB — activer realtime sur `quotes`

```sql
ALTER TABLE public.quotes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
```

`REPLICA IDENTITY FULL` permet au payload `UPDATE` realtime de contenir toutes les colonnes (sinon le filtre côté client ne marche pas correctement).

### 2. Filet de sécurité côté front (`src/pages/Quotes.tsx`)

Ajouter un `refetch()` de `useQuotes` au focus de la fenêtre **et** quand une nouvelle notification de type `quote_accepted` (ou message contenant "devis accepté") arrive via `useNotifications`. Implémentation simple : `useEffect` qui écoute `window.addEventListener('focus', refetch)`.

Ainsi, même si realtime tarde, dès que l'utilisateur revient sur l'onglet la liste se met à jour.

### 3. Vérification

- Accepter un devis test depuis la page publique SMS.
- Sans recharger : la carte doit basculer de "Devis actifs" vers "Devis acceptés" et afficher le badge "Accepté par le client le …".
- Le compteur d'onglet et le badge sidebar doivent s'incrémenter en direct.

### Fichiers touchés

- Migration SQL (publication realtime + replica identity).
- `src/pages/Quotes.tsx` (refetch on focus, ~5 lignes).

### Hors scope

- Aucun changement UI / couleurs.
- Aucun changement edge function (déjà OK).
- Le devis `DEV-2026-05-08-001` mentionné par l'utilisateur n'est pas en base (introuvable, dernier devis = `DEV-2026-05-07-001`). Le problème observé est bien le bug realtime, pas un problème de données.
