## Problème identifié

L'edge function `monthly-backup-reminder` s'exécute le dernier jour de chaque mois et insère une notification "Rappel sauvegarde de fin de mois" pour **toutes les boutiques sans exception**, y compris :
- les boutiques créées quelques jours avant (ex: MDI créée le 23/04, notification le 30/04),
- les boutiques qui n'ont aucun SAV ni devis à sauvegarder.

Résultat : une nouvelle boutique reçoit immédiatement un rappel de "sauvegarde antérieure" qui n'a aucun sens pour elle.

## Correctifs proposés

### 1. Filtrer les boutiques éligibles dans `supabase/functions/monthly-backup-reminder/index.ts`

N'envoyer la notification qu'aux boutiques qui remplissent **toutes** ces conditions :
- créées il y a **plus de 30 jours** (donc présentes au moins un mois calendaire complet),
- possédant au moins **1 SAV ou 1 devis** dans le mois écoulé (sinon il n'y a rien à sauvegarder).

Logique : pour chaque boutique, vérifier `created_at < now() - 30 days`, puis compter rapidement les `sav_cases` et `quotes` du mois courant. Insérer la notification uniquement si l'un des deux compteurs est > 0.

### 2. Nettoyage des notifications déjà créées à tort

Supprimer (via migration ponctuelle) les notifications `Rappel sauvegarde de fin de mois` adressées à des boutiques :
- créées dans le mois où la notification a été générée, **ou**
- sans aucun SAV / devis sur la période concernée.

Cela retirera les rappels parasites visibles aujourd'hui chez les nouveaux magasins.

### 3. (Optionnel, à confirmer) Adapter le message

Si tu le souhaites, on peut aussi rendre le message plus explicite en mentionnant le mois concerné ("Rappel sauvegarde – avril 2026") pour éviter toute ambiguïté future.

## Fichiers impactés

- `supabase/functions/monthly-backup-reminder/index.ts` (logique de filtrage)
- migration SQL ponctuelle (nettoyage des notifications obsolètes)
