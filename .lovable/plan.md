

## Plan : corriger l'horodatage de clôture qui ne s'enregistre pas

### Diagnostic

Le problème est dans `useSAVCases.ts`, ligne 162-167. La requête qui vérifie si un statut est final interroge `shop_sav_statuses` **sans filtrer par `shop_id`** :

```typescript
const { data: statusData } = await supabase
  .from('shop_sav_statuses')
  .select('is_final_status, status_label')
  .eq('status_key', status)  // ← pas de filtre shop_id !
  .limit(1)
  .maybeSingle();
```

La politique RLS de `shop_sav_statuses` restreint l'accès via `get_current_user_shop_id()`. Quand un super admin est en mode impersonation, cette fonction retourne le shop_id du super admin (ou null), pas celui de la boutique impersonnée. Résultat : la requête ne trouve aucun statut → `statusData` est null → `is_final_status` n'est jamais true → `closure_history` n'est jamais rempli.

Même pour un utilisateur normal, sans filtre `shop_id` explicite, la requête pourrait trouver un statut d'une autre boutique ou aucun résultat.

### Correction dans `src/hooks/useSAVCases.ts`

Dans `updateCaseStatus`, avant de vérifier le statut final :

1. **Récupérer le `shop_id` du SAV** en cours de modification (depuis le cas lui-même ou le profil)
2. **Ajouter `.eq('shop_id', shopId)`** à la requête sur `shop_sav_statuses`

Concrètement :
- Récupérer d'abord le SAV case (`sav_cases`) pour obtenir son `shop_id` (on a déjà une requête pour `closure_history`, on peut la combiner)
- Utiliser ce `shop_id` pour filtrer `shop_sav_statuses`

```typescript
// Récupérer le SAV actuel (shop_id + closure_history en une seule requête)
const { data: currentCase } = await supabase
  .from('sav_cases')
  .select('shop_id, closure_history')
  .eq('id', caseId)
  .single();

// Vérifier le statut final avec le bon shop_id
const { data: statusData } = await supabase
  .from('shop_sav_statuses')
  .select('is_final_status, status_label')
  .eq('status_key', status)
  .eq('shop_id', currentCase.shop_id)  // ← correction
  .limit(1)
  .maybeSingle();
```

Cela élimine aussi la deuxième requête séparée pour `closure_history` (lignes 181-185) puisqu'on la récupère en même temps.

### Fichier modifié

- `src/hooks/useSAVCases.ts` — restructurer `updateCaseStatus` pour récupérer le SAV case en premier, utiliser son `shop_id` pour la requête de statut

