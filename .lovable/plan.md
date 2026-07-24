## Objectif
Améliorer la tooltip "SAV en retard" (sidebar) pour voir tous les dossiers concernés et retirer une info inutile.

## Modifications — `src/components/layout/Sidebar.tsx` (tooltip "SAV en retard", lignes ~296-317)

1. **Retirer** la ligne "Nombre de SAV: {count}" (l.299) — information redondante avec le badge déjà visible.

2. **Remplacer** le texte statique "+X autres..." par un bouton cliquable qui **déplie la liste complète** des SAV en retard dans la même tooltip.
   - Ajouter un state local `showAllLateSAV` (`useState(false)`).
   - Si `showAllLateSAV` est faux : afficher les 8 premiers + bouton "+{cases.length - 8} autres SAV en retard — afficher tout".
   - Si `showAllLateSAV` est vrai : afficher `cases` en entier, avec un bouton "Réduire" en bas.
   - Wrapper la liste dans un conteneur `max-h-[60vh] overflow-y-auto` pour rester utilisable même avec 800+ dossiers.

3. **Empêcher la fermeture de la tooltip au clic** sur le bouton d'expansion : `onClick` avec `e.preventDefault()` + `e.stopPropagation()` (le Tooltip Radix ne se ferme pas sur clic interne, mais on sécurise le comportement).

## Hors périmètre
- Aucun changement sur les autres tooltips (types SAV, statuts) ni sur le calcul des retards.
- Aucun changement de style visuel du bloc "SAV en retard".