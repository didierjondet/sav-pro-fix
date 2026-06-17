# Phase 2.B — Durcissement RLS `satisfaction_surveys`

Maintenant que les RPCs `get_satisfaction_survey_by_token` et `submit_satisfaction_survey` fonctionnent (validés en prod), on peut supprimer les 2 policies publiques trop larges qui exposaient toute la table aux anonymes.

## Migration

```sql
DROP POLICY IF EXISTS "Public can view survey via token" ON public.satisfaction_surveys;
DROP POLICY IF EXISTS "Public can submit survey responses via token" ON public.satisfaction_surveys;
```

## Ce qui reste actif après

- Les policies internes à la boutique (lecture/insert/update par les membres du shop) → inchangées
- L'accès public passe **exclusivement** par les 2 RPCs `SECURITY DEFINER` (token requis)
- Aucun anon ne peut plus `SELECT *` ou `UPDATE` directement sur la table

## Vérifications à faire après migration

1. Ouvrir un lien satisfaction client (token valide) → la page se charge, formulaire pré-rempli si déjà noté
2. Soumettre une note → succès
3. Re-soumettre avec une autre note → la note est mise à jour
4. Dashboard interne (membres du shop) → les avis s'affichent toujours

## Rollback

Si problème, recréer les 2 policies :

```sql
CREATE POLICY "Public can view survey via token"
  ON public.satisfaction_surveys FOR SELECT
  USING (true);

CREATE POLICY "Public can submit survey responses via token"
  ON public.satisfaction_surveys FOR UPDATE
  USING (true);
```
