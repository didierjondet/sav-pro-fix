

## Plan : Affichage du temps de réparation dans la recherche de pièces SAV

### Objectif

Afficher le temps de réparation (`time_minutes`) de chaque pièce sous sa référence lors de la recherche, dans la sélection de pièces SAV (vue normale ET vue simplifiée).

### Règle visuelle

- Texte **rouge** si `time_minutes > 45`
- Texte **noir/standard** si `time_minutes <= 45`
- Format : `⏱ 30 min` (avec icône horloge `Clock` de lucide)
- Affiché juste sous la ligne `Réf: ...`
- Si `time_minutes` est `0` ou non défini, ne rien afficher

### Fichiers concernés

| Fichier | Modification |
|---------|--------------|
| `src/components/sav/PartsSelection.tsx` | Ajouter ligne temps sous `Réf:` dans les résultats de recherche (ligne ~196-198) |
| `src/components/sav/SAVWizardDialog.tsx` | Ajouter ligne temps sous `Réf:` dans les résultats de recherche du wizard (ligne ~595) |

### Détail du rendu

```text
┌─────────────────────────────────────┐
│ Écran iPhone 11                     │
│ Réf: SCR-IP11-BLK                   │
│ ⏱ 60 min          ← rouge si >45    │
└─────────────────────────────────────┘
```

### Ce qui ne change pas

- Aucune modification de la base de données (champ `time_minutes` existe déjà dans `parts`)
- Aucune modification de la logique d'ajout/sélection des pièces
- Le reste de l'interface (Badge stock, bouton Ajouter, pièces sélectionnées) reste identique
- Les autres composants utilisant `parts` ne sont pas touchés

