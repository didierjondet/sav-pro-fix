# Phase 2.C — Durcissement RLS (suite, prudent et incrémental)

Objectif final : **0 alerte de sécurité** sur le projet. On reprend la cadence prudente validée en Phase 2.A → 2.B : **une seule migration à la fois**, avec consignes de vérification prod **avant** de passer à la suivante.

## État réel (inspection `pg_policies`)

Les 3 warnings `RLS Policy Always True` du linter portent en fait sur :

| # | Table | Action | Risque réel |
|---|-------|--------|-------------|
| 1 | `help_bot_faq` | UPDATE `USING(true)` aux authenticated | Tout user connecté peut **réécrire question, catégorie, shop_id** de n'importe quelle FAQ — pas seulement incrémenter `click_count` |
| 2 | `subscribers` | INSERT `WITH CHECK(true)` au public | N'importe qui peut insérer une ligne avec un `user_id`/`email` arbitraire (usurpation d'abonnement) |
| 3 | `prospects` | INSERT `WITH CHECK(true)` anon/auth | **Intentionnel** — formulaire prospect public sur la landing. À garder, à marquer comme accepté. |

Mes hypothèses précédentes (sav_tracking_visits, sav_messages, appointments) étaient fausses — ces tables ne sont pas concernées par ces warnings.

## Étape 1 — `help_bot_faq` (cette migration)

### Migration

```sql
-- RPC SECURITY DEFINER : seul moyen d'incrémenter, rien d'autre modifiable
CREATE OR REPLACE FUNCTION public.increment_faq_click(faq_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.help_bot_faq SET click_count = click_count + 1 WHERE id = faq_id;
$$;
REVOKE ALL ON FUNCTION public.increment_faq_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_faq_click(uuid) TO authenticated;

-- Drop la policy trop large
DROP POLICY IF EXISTS "Authenticated users can update FAQ click count" ON public.help_bot_faq;
```

### Code applicatif (dans la même release)

`src/hooks/useHelpBot.ts` ligne 124-127 : remplacer le `.from('help_bot_faq').update(...)` par `supabase.rpc('increment_faq_click', { faq_id: faqId })`.

### ⚠️ Consignes de vérification prod (à faire AVANT de valider l'étape 2)

1. **Ouvrir le HelpBot** (icône d'aide en bas à droite) sur la prod
2. **Cliquer sur une question FAQ suggérée** → la réponse doit s'afficher normalement
3. **Recharger la page**, rouvrir le HelpBot → vérifier que la même question est remontée plus haut (compteur incrémenté)
4. Aucun rouge dans la console navigateur ni d'erreur réseau 4xx/5xx sur `/rest/v1/rpc/increment_faq_click`
5. Relancer le **linter Supabase** : le warning sur `help_bot_faq` doit avoir disparu (passage de 3 → 2 warnings "RLS Always True")

### Rollback si problème

```sql
CREATE POLICY "Authenticated users can update FAQ click count"
  ON public.help_bot_faq FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP FUNCTION IF EXISTS public.increment_faq_click(uuid);
```

---

## Étape 2 (PLUS TARD, après ton OK sur l'étape 1) — `subscribers`

Resserrer la policy INSERT pour n'autoriser que `auth.uid() = user_id` (ou suppression complète si seules les Edge Functions service_role écrivent — à confirmer en inspectant les usages).

## Étape 3 — Accepter `prospects` comme exception légitime

Marquer le warning comme intentionnel via `manage_security_finding` (formulaire prospect public assumé) et documenter dans la security memory.

## Autres warnings du linter (à traiter en Phase 2.D)

- ~6 fonctions sans `search_path` figé → patch en lot
- ~3 buckets storage publics qui autorisent le listing → restreindre les SELECT policies
- ~40 fonctions SECURITY DEFINER exécutables par anon → audit (la plupart sont légitimes : RPCs publiques par token ; certaines doivent perdre `GRANT EXECUTE TO anon`)

Chaque sous-phase = 1 migration + consignes de test prod + ton feu vert avant la suivante.

---

**Prochaine action si tu valides ce plan :** je soumets uniquement la migration de l'étape 1 + l'edit de `useHelpBot.ts`, puis je m'arrête et t'attends pour la vérif prod.
