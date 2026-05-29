# Inclusion du statut « Prêt et cloturé » dans toutes les métriques

## Contexte
Suite à la migration des SAV d'Agde vers le nouveau statut `pret_et_cloture` (statut final), tous les calculs métiers qui filtraient sur `status = 'ready'` excluent désormais ces 776 dossiers. Résultat : tableau de bord, statistiques et rapports affichent des chiffres vides.

Il faut traiter `ready` ET `pret_et_cloture` comme équivalents partout où un SAV « terminé / facturable » est compté.

## Fichiers à modifier

### Frontend — Hooks de calcul
- `src/hooks/useStatistics.ts` (lignes 278, 306, 309, 522, 537, 547) — KPIs financiers, comptage « Prêt », exclusions
- `src/hooks/useMonthlyStatistics.ts` (lignes 60, 156) — CA mensuel et SAV en retard
- `src/hooks/useMonthlyLateRate.ts` (ligne 61) — clés de statuts finaux
- `src/hooks/useSAVPartsCosts.ts` (ligne 109) — coûts pièces
- `src/hooks/useCustomWidgetData.ts` (lignes 162, 244, 277) — widgets personnalisés

### Frontend — Pages
- `src/pages/Reports.tsx` (ligne 35) — pré-sélection des statuts inclut `pret_et_cloture` par défaut ; (lignes 476-477) — tri liste statuts
- `src/pages/RevenueDetails.tsx` (ligne 51) — détail CA
- `src/pages/ExpensesDetails.tsx` (ligne 50) — détail dépenses
- `src/components/sav/SAVDashboard.tsx` (ligne 188) — lien vers liste SAV « prêts »
- `src/components/reports/ReportChartsSection.tsx` (ligne 200) — couleur graphique

### Backend — Edge functions
- `supabase/functions/daily-assistant/index.ts` (ligne 214) — assistant quotidien
- `supabase/functions/generate-custom-widget/index.ts` (lignes 52, 80) — doc prompt IA

## Approche technique
Remplacement systématique de :
- `.eq('status', 'ready')` → `.in('status', ['ready', 'pret_et_cloture'])`
- `c.status === 'ready'` → `['ready','pret_et_cloture'].includes(c.status)`
- `.in('status', ['ready', ...])` → ajouter `'pret_et_cloture'` à la liste
- Pour les labels d'affichage (`name === 'ready' ? 'Prêt' : ...`) : ajouter une branche `'pret_et_cloture' → 'Prêt et cloturé'`

Aucun changement de schéma DB, aucun changement UI, aucun changement de logique métier — uniquement étendre les filtres existants.

## Hors-scope
- `check-sav-delays` : `'ready'` y est utilisé pour EXCLURE des alertes retard. `pret_et_cloture` étant déjà final (`is_final_status=true`), il est déjà exclu dynamiquement → pas de modification nécessaire.
- `SAVList.tsx`, `TrackSAV.tsx`, `SAVDetail.tsx`, `SuperAdmin.tsx`, `Sidebar.tsx`, `ImportSAVs.tsx`, `useSAVCases.ts`, `useShopSAVStatuses.ts`, `useSAVUnreadMessages.ts`, `useOrders.ts`, `pdfGenerator.ts` : usages liés à l'affichage/navigation, pas aux métriques → à laisser.

## Validation
Après modification, rechargement du tableau de bord magasin Agde : les 776 SAV `pret_et_cloture` doivent réapparaître dans CA, marge, compteurs « Prêt » et rapports mensuels.
