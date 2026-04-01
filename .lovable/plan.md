

## Plan : Double presentation des cards SAV avec switch

### Objectif
Ajouter un switch sur la page SAV List permettant de basculer entre la vue actuelle (standard, detaillee) et une vue compacte plus claire et moins chargee. La preference est sauvegardee dans localStorage.

### Vue compacte proposee
- Cards plus etroites, sur une grille 2 colonnes (desktop) au lieu d'une seule colonne
- Suppression de la timeline, description du probleme, et boutons d'action individuels
- Affichage condense : une ligne avec nom client + n° dossier, une ligne avec appareil + statut + delai
- Badge de type SAV et indicateur de messages non lus conserves
- Clic sur la card entiere pour naviguer vers le detail
- Police uniformisee en `text-sm`, espacement reduit

### Modifications

**Fichier : `src/pages/SAVList.tsx`**

1. Ajouter un state `viewMode` initialise depuis `localStorage.getItem('fixway_sav_view_mode') || 'standard'`
2. Ajouter un composant Switch avec label "Vue compacte" a cote du compteur de resultats
3. Sauvegarder dans localStorage a chaque changement
4. Conditionner le rendu des cards :
   - **Standard** : le rendu actuel (inchange)
   - **Compact** : grille `grid-cols-1 md:grid-cols-2`, cards simplifiees sans timeline, sans description, sans boutons individuels, clic global vers le detail

### Detail de la card compacte

```text
┌──────────────────────────────┐
│ 🔴 DUPONT Jean    #SAV-0042  │
│ iPhone 13 Pro  ● En cours    │
│ ⏱ 2j restants   👁 3 visites │
│ 📱 Client        💬           │
└──────────────────────────────┘
```

- Bordure gauche coloree selon urgence (comme la vue standard)
- Badge statut avec couleur personnalisee
- Badge type SAV
- Indicateur messages non lus
- Fond sky-50 conserve

### Fichier impacte
- `src/pages/SAVList.tsx` uniquement

