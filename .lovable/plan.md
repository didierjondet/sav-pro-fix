# Phase 2.C — Durcissement RLS suite

Suite logique de Phase 2.B (satisfaction_surveys). Le linter Supabase remonte encore 3 policies UPDATE/INSERT/DELETE avec `USING(true)` ou `WITH CHECK(true)` (warnings 7-9). Objectif : les éliminer sans casser les flux publics existants.

## Cibles identifiées

Tables avec accès public par token où des policies trop larges subsistent probablement :

1. **sav_tracking_visits** — insertion publique pour tracker les visites du QR code client
2. **sav_messages** — envoi public de messages par le client (chat libre d'accès)
3. **appointments** — confirmation / contre-proposition publique via token

## Approche (identique à Phase 2.B, déjà validée)

Pour chaque table :

```text
1. Identifier la policy USING(true) / WITH CHECK(true)
2. Vérifier qu'une RPC SECURITY DEFINER équivalente existe
   - sav_tracking_visits → record_tracking_visit (à vérifier/créer)
   - sav_messages → insert_public_message (à vérifier/créer)
   - appointments → confirm_appointment / counter_propose (existant)
3. Si la RPC existe : DROP POLICY
4. Sinon : créer la RPC (token + validation), puis DROP POLICY
```

## Étape 1 (cette migration) — sav_tracking_visits

D'après la mémoire projet ([Visit Tracking](mem://features/sav-visit-tracking-architecture)) la RPC `record_tracking_visit` existe déjà avec dédup IP/UA.

```sql
-- Vérifier d'abord les policies en place puis :
DROP POLICY IF EXISTS "<nom_policy_anon_insert>" ON public.sav_tracking_visits;
-- Les policies internes (lecture par membres du shop) restent intactes
```

Avant de droper, j'inspecterai les policies actuelles via `supabase--read_query` sur `pg_policies` pour cibler le bon nom.

## Étape 2 & 3 (migrations suivantes, après validation prod de l'étape 1)

- `sav_messages` : audit policy publique, créer RPC `post_public_message(tracking_slug, sender_name, message)` si absente
- `appointments` : auditer policies `confirm`/`counter_propose` via token public

Chaque étape sera une migration distincte avec vérifs prod entre les deux, comme on l'a fait pour 2.A→2.B.

## Vérifications après étape 1

1. Scanner un QR code SAV en navigation privée → la visite est bien loggée (vérif via dashboard)
2. Linter Supabase : -1 warning "RLS Policy Always True"
3. Aucune régression sur la page `/track/:slug`

## Rollback

Recréer la policy droppée (snapshot exact capturé avant le DROP dans la migration).

---

Une fois cette plan validée, j'inspecte les policies exactes de `sav_tracking_visits` puis je soumets la migration via le tool d'approbation.
