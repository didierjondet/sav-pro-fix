## Phase 2.A — Sécurisation `satisfaction_surveys` + avis modifiable

### Problème sécurité
Les 2 policies publiques (`Public can view survey via token`, `Public can submit survey responses via token`) acceptent toute ligne où `access_token IS NOT NULL`. Comme **toutes** les lignes ont un token, n'importe quel anonyme peut lire/modifier l'ensemble des 95 enquêtes.

### Nouvelle fonctionnalité demandée
Un client re-sollicité doit pouvoir **modifier** sa note précédente (et non être bloqué par "déjà répondu"). Chaque token reste donc utilisable tant qu'il existe — la dernière soumission écrase la précédente sur la **même ligne** (même token).

> Note : la "re-sollicitation" envoie aujourd'hui un **nouveau token** (donc une nouvelle ligne). Ta demande couvre les deux cas naturellement :
> - même token réouvert → la nouvelle note remplace l'ancienne sur cette ligne
> - nouveau token envoyé → nouvelle ligne, nouvelle note (la précédente reste en historique)

### Solution — RPC SECURITY DEFINER scopée par token

**Migration A — créer 2 RPC publiques**

```sql
-- Lecture : renvoie la ligne du token + infos shop/SAV + note/commentaire actuels pour pré-remplir
CREATE OR REPLACE FUNCTION public.get_satisfaction_survey_by_token(p_token text)
RETURNS TABLE (
  id uuid, shop_id uuid, sav_case_id uuid,
  completed_at timestamptz, rating int, comment text,
  shop_name text, shop_logo_url text,
  sav_case_number text, sav_device_brand text, sav_device_model text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ss.id, ss.shop_id, ss.sav_case_id, ss.completed_at, ss.rating, ss.comment,
         s.name, s.logo_url,
         sc.case_number, sc.device_brand, sc.device_model
  FROM public.satisfaction_surveys ss
  LEFT JOIN public.shops s ON s.id = ss.shop_id
  LEFT JOIN public.sav_cases sc ON sc.id = ss.sav_case_id
  WHERE ss.access_token = p_token
  LIMIT 1;
END $$;

-- Soumission : autorise la modification (pas de blocage si déjà complété)
CREATE OR REPLACE FUNCTION public.submit_satisfaction_survey(
  p_token text, p_rating int, p_comment text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_found boolean; v_was_completed boolean;
BEGIN
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_rating');
  END IF;

  SELECT true, completed_at IS NOT NULL INTO v_found, v_was_completed
  FROM public.satisfaction_surveys WHERE access_token = p_token;

  IF NOT v_found THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  UPDATE public.satisfaction_surveys
  SET rating = p_rating,
      comment = NULLIF(trim(p_comment), ''),
      completed_at = now()   -- mis à jour à chaque soumission = horodatage du dernier avis
  WHERE access_token = p_token;

  RETURN jsonb_build_object('success', true, 'updated', v_was_completed);
END $$;

GRANT EXECUTE ON FUNCTION public.get_satisfaction_survey_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_satisfaction_survey(text,int,text) TO anon, authenticated;
```

**Modifications `src/pages/Satisfaction.tsx`**
- Remplacer les 3 requêtes directes (`satisfaction_surveys`, `shops`, `sav_cases`) par un seul `anonClient.rpc('get_satisfaction_survey_by_token', { p_token: token })`.
- Si `rating`/`comment` reviennent non nuls (avis déjà donné) :
  - Pré-remplir `setRating(...)` et `setComment(...)`
  - Afficher un bandeau d'info en haut du formulaire : *"Vous avez déjà donné un avis le {date}. Vous pouvez le modifier ci-dessous."*
  - **Ne plus** afficher l'écran "Déjà répondu" bloquant ; le formulaire reste accessible.
- Le `handleSubmit` :
  - Supprime la pré-vérification "déjà complété" (plus de blocage)
  - Appelle `anonClient.rpc('submit_satisfaction_survey', { p_token, p_rating, p_comment })`
  - Sur succès : message *"Avis enregistré, merci !"* (ou *"Avis mis à jour, merci !"* si `updated=true`).
- Supprimer toute la branche `alreadyCompleted`.

**Migration B — après validation utilisateur uniquement**
```sql
DROP POLICY "Public can view survey via token" ON public.satisfaction_surveys;
DROP POLICY "Public can submit survey responses via token" ON public.satisfaction_surveys;
```
Les RPC `SECURITY DEFINER` continuent de fonctionner (bypass RLS). Policies admin/shop inchangées.

### Impact ailleurs dans l'app
- `useSatisfactionSurveys.ts` (dashboard) : aucun changement requis — il lit via RLS authentifiée (policy `Shop users can view`).
- Edge functions : non concernées (utilisent `service_role`).
- SMS d'envoi de l'enquête : non concerné.

### Risque & rollback
Risque **très faible**. Rollback :
```sql
CREATE POLICY "Public can view survey via token" ON public.satisfaction_surveys
  FOR SELECT USING (access_token IS NOT NULL AND auth.uid() IS NULL);
CREATE POLICY "Public can submit survey responses via token" ON public.satisfaction_surveys
  FOR UPDATE USING (access_token IS NOT NULL AND completed_at IS NULL AND auth.uid() IS NULL);
```

### Ordre d'exécution
1. Migration A (RPC) — j'attends ton OK
2. Refonte `Satisfaction.tsx` (pré-remplissage + modification autorisée)
3. Tes tests prod : nouveau lien → noter ; rouvrir le même lien → note pré-affichée, modifiable, re-soumettre
4. Migration B (suppression policies publiques) — sur ton OK explicite

On part comme ça ?