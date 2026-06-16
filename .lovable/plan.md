## Diagnostic

Le correctif précédent n’a pas suffi parce que la source réelle restante est un autre trigger :

- La clôture du SAV `2026-06-16-001` tente bien de passer `sav_cases.status` vers `pret_et_cloture`.
- Ce statut est bien final et personnalisé.
- Le trigger `release_part_reservations_on_final_status` libère la réservation en mettant à jour `parts.reserved_quantity`.
- Mais la table `parts` a un trigger trop large : `sync_part_updates_trigger AFTER UPDATE ON parts`.
- Ce trigger se déclenche même quand on change seulement `reserved_quantity`, puis il réécrit `sav_cases.total_cost/total_time_minutes` pour le même SAV en cours de clôture.
- PostgreSQL bloque alors l’opération avec : `tuple to be updated was already modified by an operation triggered by the current command`.

Donc le problème n’est pas le processus de fermeture/impression : la mise à jour SQL est annulée après l’impression, ce qui explique pourquoi le dossier reste `pending`.

## Plan de correction

1. Modifier uniquement le trigger `sync_part_updates_trigger` sur `public.parts`.
2. Le faire déclencher seulement quand les champs métier qu’il synchronise changent réellement :
   - `selling_price`
   - `purchase_price`
   - `time_minutes`
3. Ne plus le déclencher lors des changements de stock/réservation :
   - `quantity`
   - `reserved_quantity`
4. Garder les triggers existants de clôture/réservation, car leur logique est utile ; le conflit vient du trigger `parts` trop général.
5. Vérifier en base après migration :
   - le SAV `2026-06-16-001` peut passer de `pending` à `pret_et_cloture`,
   - son `closure_history` est ajouté,
   - la réservation de sa pièce est libérée,
   - aucune erreur `tuple to be updated...` ne réapparaît.

## Correction technique prévue

Créer une migration qui :

```sql
DROP TRIGGER IF EXISTS sync_part_updates_trigger ON public.parts;

CREATE TRIGGER sync_part_updates_trigger
AFTER UPDATE OF selling_price, purchase_price, time_minutes ON public.parts
FOR EACH ROW
WHEN (
  OLD.selling_price IS DISTINCT FROM NEW.selling_price
  OR OLD.purchase_price IS DISTINCT FROM NEW.purchase_price
  OR OLD.time_minutes IS DISTINCT FROM NEW.time_minutes
)
EXECUTE FUNCTION public.sync_part_updates_to_sav();
```

Ce correctif est volontairement minimal : il ne change pas l’interface, ne touche pas aux statuts, ne recalcule pas tout le stock et ne modifie pas les règles de clôture.