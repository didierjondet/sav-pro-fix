

## Plan : finaliser l'inventaire + ajouter les catégories de pièces

### Partie A — Nouvel onglet « Catégories de pièces »

#### A.1 Base de données
Créer une nouvelle table dédiée :

- `part_categories`
  - `id` uuid PK
  - `shop_id` uuid (isolation boutique)
  - `name` text
  - `description` text nullable
  - `color` text nullable (badge visuel)
  - `display_order` int
  - `created_at`, `updated_at`
- Ajouter une colonne `category_id` (uuid, nullable, FK logique) sur la table `parts`
- RLS : lecture/écriture limitée aux utilisateurs du même shop ayant la permission `settings_part_categories`, super_admins inclus
- Ajouter une nouvelle permission `settings_part_categories` dans `default_role_permissions`, activée par défaut pour `admin`

#### A.2 Permissions (RBAC)
Dans `src/lib/rolePermissions.ts` :
- Ajouter `settings_part_categories: boolean`
- Défaut : `true` pour `admin`, `false` pour `technician` et `shop_admin`
- Ajouter le label dans le groupe « Réglages accessibles » pour que l'administrateur puisse déléguer

#### A.3 UI Réglages
- Nouvel onglet « Catégories de pièces » dans `src/pages/Settings.tsx`, conditionné par `rolePermissions.settings_part_categories`
- Nouveau composant `src/components/settings/PartCategoriesManager.tsx` :
  - liste des catégories
  - création / édition / suppression (avec confirmation)
  - couleur, nom, description, ordre d'affichage
  - compteur de pièces associées
  - blocage suppression si la catégorie est utilisée (proposer réaffectation)

#### A.4 Intégration au stock pièces
- Dans `src/components/parts/PartForm.tsx` : ajout d'un sélecteur « Catégorie » obligatoire
- Dans `src/pages/Parts.tsx` : badge catégorie + filtre par catégorie
- Hook `usePartCategories.ts` partagé

### Partie B — Inventaire : interface vraiment utilisable

#### B.1 Choix de la catégorie au démarrage
Dans la boîte « Nouvel inventaire » :
- Ajouter un sélecteur multi-catégories (« Toutes » par défaut)
- Modifier la fonction RPC `begin_inventory_session` pour accepter un paramètre `_category_ids uuid[] DEFAULT NULL` et filtrer le snapshot des `parts`
- Stocker les catégories choisies dans une colonne `category_filter jsonb` sur `inventory_sessions` pour rappel et impression

#### B.2 Refonte de la disposition (cause racine du « inutilisable »)
Aujourd'hui sur viewport ~1000px la grille `xl:grid-cols` ne s'active pas et la zone de comptage devient invisible sous la liste de sessions. Refonte :

```text
┌──────────────────────────────────────────────┐
│ En-tête : Lancer / Imprimer / KPIs           │
├──────────────────────────────────────────────┤
│ [si AUCUNE session sélectionnée]             │
│   Liste plein écran des sessions (cards)     │
│   → clic sur une carte = "ouvrir"            │
│                                              │
│ [si session sélectionnée]                    │
│   Bandeau session + bouton « Retour liste »  │
│   Actions session (pause/arrêt/clôt./suppr.) │
│   Synthèse                                   │
│   Onglets Comptage/Écarts/Manquants/Journal  │
└──────────────────────────────────────────────┘
```

Bénéfices :
- on voit d'abord les sessions
- on entre explicitement dedans (réponse au besoin « il faut pouvoir rentrer dans cette card »)
- la zone de comptage devient pleine largeur, donc visible quel que soit l'écran

#### B.3 Cohérence des actions de session
Dans `InventoryManager.tsx` et `useInventory.ts`, garantir la disponibilité visible :
- Pause / Reprendre
- Arrêter (fige le comptage)
- Annuler (abandonne)
- Clôturer le comptage (passe en `completed`)
- Supprimer (uniquement statuts autorisés)
- Réimprimer Synthèse / Feuille papier / Manquants à tout moment, y compris après application

#### B.4 Mode manuel utilisable
Le composant `InventoryManualEditor` existe déjà mais n'est pas mis en avant. Améliorations :
- Bouton « +1 / -1 » à côté du champ quantité
- Sauvegarde automatique au blur (plus besoin de cliquer « Ajuster »)
- Ligne en surbrillance quand un brouillon non sauvegardé est présent
- Action « Tout marquer comme conforme » pour les listes courtes
- Compteurs en haut : à traiter / trouvés / manquants / écarts

#### B.5 Mode scan utilisable
- Champ de saisie large + scan continu (Enter ajoute le code)
- Affichage du dernier code scanné en gros
- Lien direct « Voir » sur les codes inconnus / ambigus

#### B.6 Mode assisté
Déjà fonctionnel : on garde, on ajoute juste un raccourci clavier (Entrée = valider, M = manquant).

#### B.7 Synthèse et rapprochement final
- La carte « Synthèse » doit toujours être visible quand une session est ouverte
- Vue « Écarts » : table compacte écart par écart avec valeur impactée
- Vue « Manquants » : table des pièces qui passeront à 0
- Vue « Stocks écrasés » : avant/après après application
- Avant validation : confirmation forte (déjà présente, à conserver)

#### B.8 Permissions inventaire (rappel)
- L'onglet Inventaire reste conditionné à `settings_inventory`
- L'application finale du stock reste conditionnée à `inventory_apply_stock`
- Le filtre par catégorie n'introduit aucune nouvelle permission (suit `settings_inventory`)

### Partie C — Vérifications à faire après implémentation

#### Tests fonctionnels
- Création d'une catégorie → affectation à plusieurs pièces
- Lancement d'un inventaire filtré sur 1 catégorie → seules ces pièces apparaissent
- Lancement d'un inventaire « toutes catégories » → comportement actuel conservé
- Saisie manuelle, scan, assisté : tous opérationnels
- Pause / Reprendre / Arrêter / Annuler / Clôturer / Supprimer
- Réimpression à tout moment (synthèse, feuille papier, manquants)
- Application finale → stocks Fixway corrects, manquants à 0

#### Tests permissions
- Admin : voit Catégories + Inventaire
- Technicien sans droit : ni l'un ni l'autre
- Technicien à qui l'admin a donné `settings_inventory` : voit Inventaire mais ne peut pas valider
- Technicien à qui l'admin a aussi donné `inventory_apply_stock` : peut valider
- Technicien à qui l'admin a donné `settings_part_categories` : voit l'onglet catégories

#### Non-régression
- Page Stock pièces (création / édition / liste / filtres)
- Imports de stock
- Devis / SAV qui consomment des pièces
- Commandes
- Build TypeScript et lint

### Fichiers à créer / modifier

#### Création
- `src/components/settings/PartCategoriesManager.tsx`
- `src/hooks/usePartCategories.ts`
- migration SQL : table `part_categories`, colonne `parts.category_id`, colonne `inventory_sessions.category_filter`, mise à jour `begin_inventory_session`, nouvelle permission `settings_part_categories` dans `default_role_permissions`

#### Modification
- `src/lib/rolePermissions.ts` (nouvelle permission)
- `src/pages/Settings.tsx` (nouvel onglet)
- `src/components/parts/PartForm.tsx` (champ catégorie)
- `src/pages/Parts.tsx` (filtre + badge)
- `src/components/settings/inventory/InventoryManager.tsx` (refonte navigation + sélecteur catégories)
- `src/components/settings/inventory/InventoryManualEditor.tsx` (UX +1/-1, autosave)
- `src/components/settings/inventory/InventoryAssistedDialog.tsx` (raccourcis clavier)
- `src/hooks/useInventory.ts` (passage de `category_ids` au RPC)
- `src/components/settings/inventory/types.ts` (nouveaux champs)
- `src/lib/inventoryPrint.ts` (mention de la catégorie filtrée)

### Résultat attendu
- L'administrateur dispose d'un nouvel onglet « Catégories de pièces » paramétrable et délégable par rôle
- Chaque pièce porte sa catégorie
- L'inventaire peut désormais être lancé sur une ou plusieurs catégories pour ne plus avoir tout le stock à compter
- Le module inventaire devient réellement utilisable : on entre dans une session, on compte, on corrige, on imprime, on suspend, on annule, on clôture, on valide — sur n'importe quelle taille d'écran

