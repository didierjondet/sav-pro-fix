

## Plan : réorganisation du menu latéral

### Nouvel ordre demandé

Bloc « Travail au quotidien »
1. Tableau de bord
2. Dossiers SAV
3. Devis
4. Clients
5. Agenda
6. Chat clients

— séparateur visuel —

Bloc « Gestion »

7. Stock pièces
8. Commandes
9. Inventaire
10. Rapports

### Modifications

**Fichier : `src/components/layout/Sidebar.tsx`**

- Réordonner `baseNavigation` selon la liste ci-dessus.
- Ajouter une nouvelle entrée « Inventaire » (icône `ClipboardList` de lucide) pointant vers `/settings?tab=inventory` — l'onglet existe déjà dans `Settings.tsx` et reste protégé par `rolePermissions.settings_inventory`.
- Introduire un marqueur de groupe (`group: 'work' | 'management'`) sur chaque entrée de `baseNavigation` afin de pouvoir intercaler un séparateur entre les deux blocs lors du rendu.
- Dans le rendu de `<nav>`, parcourir la navigation filtrée et insérer un trait fin (`<div className="my-3 border-t border-border/60" />`) entre la dernière entrée du bloc « work » et la première entrée du bloc « management ». Si l'un des deux blocs est vide après filtrage permissions/vue simplifiée, ne pas afficher le séparateur.
- Étendre la logique du `switch` de filtrage pour le cas `/settings?tab=inventory` : autoriser uniquement si `rolePermissions.settings_inventory` est vrai (pas de dépendance plan supplémentaire, comme aujourd'hui dans Settings).
- Mettre à jour la détection `isActive` pour Inventaire : actif lorsque `location.pathname === '/settings'` ET `searchParams.get('tab') === 'inventory'`.
- Ne rien changer dans la « vue simplifiée » : `simplifiedPaths` reste `['/sav','/quotes','/agenda','/client-chats']`, donc le shop_admin ne voit ni Stock, ni Commandes, ni Inventaire, ni Rapports, ni Tableau de bord, ni Clients (comportement inchangé).

**Aucun autre fichier n'est modifié.**

### Comportements préservés
- Permissions de plan + RBAC inchangés (logique `checkBoth` conservée).
- Badges existants (chat clients, devis en cours, RDV en attente) conservés sur leurs entrées respectives.
- Encarts « SAV en retard », « Types de SAV », « Statuts SAV » inchangés sous le menu.
- Bouton « Super Admin » inchangé en bas.
- Préférence utilisateur respectée : aucune modification visuelle des entrées validées, uniquement réordonnancement + un trait fin de séparation.

### Vérifications après implémentation
- Vue Administrateur : les 10 entrées apparaissent dans l'ordre demandé avec un trait entre Chat clients et Stock pièces.
- Vue Technicien (par défaut) : même ordre, entrées masquées si la permission RBAC est absente (Rapports notamment).
- Vue simplifiée (shop_admin) : seuls SAV, Devis, Agenda, Chat clients restent visibles, sans trait de séparation parasite.
- Clic sur « Inventaire » → ouvre `/settings` avec l'onglet « Inventaire » actif.
- Aucune régression sur les badges ni sur les encarts du bas.

