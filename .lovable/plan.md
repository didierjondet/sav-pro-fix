

## Plan : Ajouter le commentaire technicien sous chaque ligne SAV dans les rapports

### Ce qui change

**1. `src/hooks/useReportData.ts`** — Ajouter `technician_comments` au select Supabase et au type `ReportSAVItem`, puis le mapper dans le traitement des données.

**2. `src/pages/Reports.tsx`** — Afficher le commentaire technicien sous la ligne principale du SAV (entre la ligne SAV et la ligne des pièces), dans une ligne similaire à celle des pièces avec un fond légèrement différent et un préfixe "Commentaire technicien :".

### Détail technique

- Dans `useReportData.ts` : ajouter `technician_comments` dans la requête `.select(...)` (ligne ~113) et dans l'interface `ReportSAVItem`, puis le passer dans le mapping.
- Dans `Reports.tsx` : après la `TableRow` principale (ligne ~702), ajouter un bloc conditionnel `{item.technician_comments && (...)}` qui affiche une ligne sur toute la largeur (`colSpan={10}`) avec le commentaire en italique, style similaire à la ligne des pièces.
- L'export Excel sera aussi enrichi avec une colonne "Commentaire technicien".

