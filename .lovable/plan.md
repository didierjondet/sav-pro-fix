## Problème constaté

Sur la page Statistiques, seule une partie des widgets passe réellement par `StatisticsWidgetContainer` (qui lit la config widget via `useWidgetConfiguration` puis appelle `useStatistics(effectivePeriod, { savStatuses, savTypes })`).

Les autres widgets utilisent directement les variables globales `revenue / expenses / topParts / topDevices / savStats / takeoverStats…` issues de l'appel `useStatistics(period)` fait UNE SEULE FOIS en haut du composant, sans aucun filtre statut/type et avec la période globale du sélecteur. Conséquences :
- Les réglages "quels SAV / quel statut / quelle période" configurés sur un widget ne sont pas appliqués pour ces widgets.
- Certains widgets affichent des données aléatoires (`Math.random()`), estimées (`part.quantity * 25`), ou en dur (Stockage, mois précédent multiplié par 0.85, croissance 15.2%, etc.).
- Le widget Top pièces et le Podium téléphones n'utilisent pas le même périmètre (bug déjà identifié au tour précédent : `topParts` ne compte que les SAV `ready` codés en dur, `topDevices` compte tout).

## Objectif

Un seul standard : **chaque widget = un appel `useStatistics` paramétré par sa propre `widget_configurations` (période + statuts + types)**. Plus aucun calcul aléatoire, plus aucune valeur fictive sur les widgets de données réelles.

## Liste des widgets à corriger

### Widgets qui n'utilisent pas du tout la config (à passer dans `StatisticsWidgetContainer`)
- `financial-overview`
- `performance-trends`
- `parts-usage-heatmap`
- `top-parts-chart`
- `top-devices`
- `finance-kpis`
- `annual-stats`

### Widgets qui doivent recalculer dynamiquement et arrêter d'inventer des données
- `parts-usage-heatmap` : retirer `cost: part.quantity * 25` et `frequency: 10 - index`. Utiliser le vrai `revenue` (donc `cost`) déjà présent dans `topParts` ainsi que la vraie quantité.
- `finance-kpis` : retirer `previousMonth = revenue * 0.85`, `growth: 15.2`, `target: revenue * 1.2`. Soit calculer le vrai mois précédent via une seconde plage, soit cacher ces métriques.
- `annual-stats` : retirer tout `Math.random()`. S'appuyer sur `useMonthlyStatistics(currentYear)` déjà disponible pour les vraies valeurs mensuelles.
- `storage-usage` : retirer les `storageCategories` en dur. Si la donnée réelle n'existe pas encore, masquer le widget ou afficher "Donnée indisponible". Pas de mock.

### Bug `topParts` vs `topDevices` dans `useStatistics.ts`
- Aujourd'hui `topParts` est calculé dans la boucle `readySavCases.forEach` (statut `'ready'` codé en dur) → incohérent avec `topDevices` qui balaye tous les SAV de la période.
- Déplacer le calcul de `partsUsage` dans une boucle parallèle à `deviceUsage`, sur le même périmètre (`savCases` filtrés hors types exclus, hors `cancelled`), en respectant `excludeRevenue`.
- Conserver `readySavCases` uniquement pour les calculs financiers (`totalRevenue`, `totalExpenses`).

## Détails techniques

### 1. `src/components/statistics/DragDropStatistics.tsx`

Pour chaque widget cité, remplacer l'usage des variables globales par un wrap dans `StatisticsWidgetContainer`. Exemple type :

```tsx
case 'top-devices':
  return (
    <div className={className}>
      <StatisticsWidgetContainer module={module} period={period}>
        {({ stats }) => (
          <DraggableStatisticsWidget {...baseProps}>
            {/* …mapping sur stats.topDevices… */}
          </DraggableStatisticsWidget>
        )}
      </StatisticsWidgetContainer>
    </div>
  );
```

À appliquer aux 7 cases listés ci-dessus. Le `StatisticsWidgetContainer` enveloppe déjà dans `DraggableStatisticsWidget` ; pour `top-devices` / `top-parts-chart` / `finance-kpis` / etc. il faut soit retirer le double `DraggableStatisticsWidget`, soit (plus simple) ajouter un mode "noWrapper" au container pour ces widgets qui ont besoin d'un wrapper personnalisé. Décision : passer un prop optionnel `wrap={false}` à `StatisticsWidgetContainer` pour ces cas, afin de garder leur structure visuelle actuelle.

L'appel global `useStatistics(period)` en haut du composant ne sera plus utilisé que pour la passerelle vers MonthlyStatistics et `loading`. À terme, supprimer son usage en lecture pour éviter toute confusion.

### 2. `src/hooks/useStatistics.ts`

```ts
// Nouveau périmètre commun, identique à celui de deviceUsage
const trackedSavCases = (savCases || []).filter((c: any) =>
  !excludedFromStatsTypes.includes(c.sav_type) && c.status !== 'cancelled'
);

trackedSavCases.forEach((savCase: any) => {
  const excludeRevenue = excludeFromSalesRevenue.includes(savCase.sav_type);
  savCase.sav_parts?.forEach((savPart: any) => {
    const partKey = savPart.part?.name || savPart.custom_part_name;
    if (!partKey) return;
    const partRevenue = (savPart.unit_price || savPart.part?.selling_price || 0) * savPart.quantity;
    if (!partsUsage[partKey]) partsUsage[partKey] = { quantity: 0, revenue: 0, name: partKey };
    partsUsage[partKey].quantity += savPart.quantity;
    if (!excludeRevenue) partsUsage[partKey].revenue += partRevenue;
  });
});
```

Et supprimer le bloc équivalent dans `readySavCases.forEach` (lignes ~436-446) pour ne pas double-compter.

### 3. Widgets affichés sans config liée

- `monthly-comparison`, `late-rate-chart`, `customer-satisfaction`, `quote-rejections`, `storage-usage` ont leur propre source (hooks dédiés / chiffres annuels). Ils ne reflètent pas la période sélectionnée par design. → Indiquer clairement dans leur sous-titre la portée réelle (ex. "Année en cours", "Tous statuts") pour éviter la confusion utilisateur, plutôt que de les forcer dans le moule période/statut qui n'a pas de sens pour eux.

## Vérification après implémentation

1. Configurer un widget (ex. Top pièces) sur 7 jours + statut "Prêt" uniquement → vérifier qu'il ne montre que des pièces issues de SAV ready des 7 derniers jours.
2. Reconfigurer le même widget sur 1 an + tous statuts → la liste change.
3. Le widget Podium téléphones, configuré identiquement, doit donner un classement compatible avec le top pièces.
4. Vérifier qu'aucun widget ne bouge en rechargeant la page (plus de `Math.random`).
5. Vérifier que `finance-kpis` n'affiche plus de "+15.2%" si le vrai calcul n'est pas branché.
