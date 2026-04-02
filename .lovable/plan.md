

## Plan : Mémoriser les filtres SAV en localStorage avec réinitialisation quotidienne

### Principe
Sauvegarder les filtres actifs (type, statut, couleur, grade, tri, items/page) dans le localStorage. Au chargement, restaurer ces filtres sauf si la date du jour a changé — dans ce cas, remettre les valeurs par défaut. Ajouter un bouton "Réinitialiser les filtres" visible dans la barre de filtres.

### Modifications

**Fichier : `src/pages/SAVList.tsx`**

1. **Clé localStorage** : `fixway_sav_filters` contenant un objet JSON :
   ```json
   {
     "filterType": "all",
     "statusFilter": "all-except-ready",
     "colorFilter": "all",
     "gradeFilter": "all",
     "sortOrder": "priority",
     "itemsPerPage": 20,
     "savedDate": "2026-04-02"
   }
   ```

2. **Initialisation des states** : remplacer les valeurs en dur par une lecture du localStorage. Si `savedDate` !== date du jour → utiliser les valeurs par défaut et nettoyer le storage.

3. **Sauvegarde automatique** : un `useEffect` qui persiste les filtres dans le localStorage à chaque changement de l'un des filtres.

4. **Bouton "Réinitialiser"** : ajouter un bouton avec icône `RotateCcw` dans la zone des filtres, qui remet tous les filtres aux valeurs par défaut et supprime l'entrée localStorage.

5. **Priorité URL** : les paramètres URL (`searchParams`) restent prioritaires — si présents, ils écrasent le localStorage (comportement actuel inchangé).

### Valeurs par défaut
- `filterType`: `'all'`
- `statusFilter`: `'all-except-ready'`
- `colorFilter`: `'all'`
- `gradeFilter`: `'all'`
- `sortOrder`: `'priority'`
- `itemsPerPage`: `20`

### Fichier impacté
- `src/pages/SAVList.tsx`

