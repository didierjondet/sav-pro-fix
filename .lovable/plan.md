

## Plan : Comparaison mensuelle année N vs année N-1

### Probleme
- **DragDropStatistics** et **ReportChartsSection** comparent deja correctement avec l'annee precedente (N-1), mais affichent `0%` quand il n'y a pas de donnees N-1 — ce qui est trompeur.
- **SAVDashboard** compare avec le **mois precedent** au lieu du meme mois de l'annee precedente — c'est incorrect.

### Regle metier
- Janvier 2026 se compare a Janvier 2025, Fevrier 2026 a Fevrier 2025, etc.
- Si le mois N-1 n'a aucun CA (pas d'historique), afficher un badge "Nouveau" au lieu de 0% ou d'un pourcentage infini.
- Le meilleur/pire mois et la croissance globale ne prennent en compte que les mois ayant une reference N-1.

### Modifications

**1. `src/components/sav/SAVDashboard.tsx`** (~lignes 950-1000)
- Ajouter l'import de `useMonthlyStatistics` pour l'annee N-1
- Remplacer la logique de comparaison "mois precedent" par une comparaison avec le meme mois de l'annee N-1 (identique a DragDropStatistics)

**2. `src/components/statistics/advanced/MonthlyComparisonWidget.tsx`**
- Ajouter la gestion du cas "pas de reference" : si `previousRevenue === 0` et `currentRevenue > 0`, afficher un badge "Nouveau" vert au lieu de `+0%`
- Dans le graphique, utiliser `null` pour la courbe growth quand il n'y a pas de reference (coupure de la ligne)
- Dans les KPI : le compteur "Mois positifs" exclut les mois sans reference
- Meilleur/pire mois : seuls les mois avec reference sont consideres

**3. `src/components/statistics/DragDropStatistics.tsx`** (~lignes 284-315)
- Ajuster le calcul de `growth` : quand `previousRevenue === 0` et `currentRevenue > 0`, mettre `growth = null` (au lieu de 0)
- Adapter le type pour accepter `growth: number | null`

**4. `src/components/reports/ReportChartsSection.tsx`** (~lignes 113-152)
- Meme ajustement : `growth = null` quand pas de reference N-1

### Interface MonthlyData mise a jour

```text
growth: number | null
  — null  = pas de donnees N-1 → badge "Nouveau"
  — 0     = meme CA que N-1
  — >0/<0 = variation en %
```

### Fichiers impactes
- `src/components/statistics/advanced/MonthlyComparisonWidget.tsx`
- `src/components/statistics/DragDropStatistics.tsx`
- `src/components/sav/SAVDashboard.tsx`
- `src/components/reports/ReportChartsSection.tsx`

