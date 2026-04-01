

## Plan : Corriger le calcul du taux de retard mensuel

### Probleme identifie

Le code actuel dans `useMonthlyLateRate.ts` mesure les SAV **encore actifs** a la fin de chaque mois. Cela exclut tous les SAV deja clotures, ce qui est l'inverse de la regle metier souhaitee.

Pour janvier et fevrier, la plupart des SAV sont probablement deja clotures, donc le filtre les exclut tous et le taux tombe a 0%.

### Regle metier correcte (confirmee par l'utilisateur)

1. **Ne compter que les SAV clotures** (statut final = `is_final_status`)
2. **Attribuer le SAV au mois de creation** (pas au mois de cloture)
3. **Un SAV est en retard** si : `date de cloture > date de creation + max_processing_days`
4. **Formule** : `taux = (nb SAV clotures en retard / nb SAV clotures total) * 100` pour les SAV crees dans ce mois
5. Exclure les types avec `exclude_from_stats` et les types avec `max_processing_days = 0` (internes)

### Changements concrets

**Fichier** : `src/hooks/useMonthlyLateRate.ts`

1. **Requete** : ajouter `closure_history` dans le select pour recuperer les dates de cloture reelles

2. **Logique par mois** : remplacer entierement le filtre et le calcul :
   - Filtrer les SAV **crees** dans le mois courant de la boucle
   - Parmi ceux-ci, ne garder que ceux qui ont un **statut final** (`is_final_status`)
   - Exclure les types exclus des stats et les types avec `max_processing_days = 0`
   - Pour chaque SAV cloture, extraire la date de cloture depuis la derniere entree de `closure_history` (fallback `updated_at`)
   - Comparer : si `closureDate > createdAt + maxProcessingDays` → en retard
   - Calculer le taux sur ce sous-ensemble

3. **Pour le mois en cours** : les SAV non encore clotures ne sont pas comptabilises (conformement a la regle "uniquement apres cloture")

### Resultat attendu

```text
Janvier :  12 SAV clotures crees en janvier, dont 4 en retard → 33.3%
Fevrier :   8 SAV clotures crees en fevrier, dont 2 en retard → 25%
Mars (en cours) : seuls les SAV deja clotures sont comptes
```

### Fichier impacte
- `src/hooks/useMonthlyLateRate.ts` — refonte complete de la logique de calcul (~40 lignes)

