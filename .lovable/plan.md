## Réorganisation de l'onglet "Gestion des widgets"

Dans `src/components/statistics/WidgetManager.tsx`, réordonner les sections et différencier visuellement les widgets personnalisés.

### Nouvel ordre d'affichage

1. **Widgets personnalisés** (déplacé en haut)
   - Titre + bouton "Créer un widget" bien visible
   - Encadré avec un fond légèrement teinté (ex: `bg-purple-50/30 dark:bg-purple-950/10`) et bordure `border-purple-200` pour signaler visuellement qu'il s'agit d'une zone spéciale
   - Cartes des widgets custom existants conservant un accent violet (cohérent avec l'icône Sparkles déjà présente)
2. **Widgets Dashboard** (inchangé en contenu)
3. **Widgets Statistiques Avancés** (inchangé)
4. **Widgets Statistiques** (inchangé)

### Différenciation visuelle des widgets personnalisés

- Wrapper de la section custom : `rounded-lg border border-purple-200/60 bg-purple-50/30 dark:bg-purple-950/10 p-4`
- Les `Card` à l'intérieur (rendues par `CustomWidgetList`) utiliseront déjà ce contraste de fond. Si besoin, ajout d'un léger ring violet pour renforcer la distinction avec les widgets standards (fond neutre).
- Les sections standards conservent leur style actuel (fond neutre, séparateurs entre elles).

### Détails techniques

Fichier modifié : `src/components/statistics/WidgetManager.tsx` uniquement.
- Déplacer le bloc "Section 4 : Widgets personnalisés" tout en haut.
- Ajouter le wrapper coloré autour de cette section.
- Ajuster les `<Separator />` pour refléter le nouvel ordre (séparateur après la section custom, puis entre les autres sections).
- Aucune modification de logique métier, de hooks, ni de la base de données.
