

## Diagnostic

Le systeme fonctionne en 3 couches :

```text
Plan (menu_config)     →  Base : ce que le plan autorise
Forced Features        →  Override super admin : force ON meme si plan dit NON  
Shop Preferences       →  Choix boutique : peut masquer ce que le plan autorise
```

**Pour le plan gratuit** : si toutes les options sont cochees dans `menu_config` du plan, alors tout est deja actif. L'onglet "Forcer l'acces" montre tout dechoche car `forced_features` est vide — ce qui est **normal** puisqu'il n'y a rien a forcer (le plan autorise deja tout).

**Le vrai probleme** : l'interface est confuse. On voit des switches OFF et on pense que les menus sont desactives. Il manque un affichage clair de l'etat effectif.

## Plan de correction

### 1. Refondre l'onglet "Forcer l'acces" dans ShopManagementDialog

Transformer l'onglet pour afficher l'etat reel de chaque menu :

- Afficher pour chaque feature : un badge "Plan" (vert si autorise, rouge sinon) + le switch de forçage
- Si le plan autorise deja la feature, afficher un badge vert "Inclus dans le plan" et griser le switch (pas besoin de forcer)
- Le switch ne s'active que si le plan n'autorise PAS la feature, permettant de forcer l'acces
- Ajouter un bouton "Synchroniser avec le plan" qui remet `forced_features` en coherence

### 2. Corriger les permissions par defaut dans useMenuPermissions

Les valeurs par defaut (quand `menuConfig` est null, lignes 40-55) ont `quotes: false`, `orders: false`, `chats: false`, `statistics: false`. Pendant le chargement du plan, ces menus disparaissent brievement. Mettre tout a `true` par defaut pour eviter le flash.

### 3. Ajouter la synchronisation automatique plan → forced_features

Quand le super admin change le plan d'un magasin, nettoyer automatiquement les `forced_features` qui sont deja incluses dans le nouveau plan (pour eviter la confusion).

### Details techniques

**ShopManagementDialog.tsx** — Onglet overrides :
- Charger le `menu_config` du plan actuel du magasin
- Pour chaque feature : afficher l'etat du plan + le switch de forçage conditionnel
- Badge vert "Inclus" / rouge "Non inclus" selon le plan

**useMenuPermissions.ts** — Defaults :
- Changer les valeurs par defaut (fallback) pour que tout soit `true` au lieu d'avoir des `false` sur quotes/orders/chats/statistics

**ShopManagementDialog.tsx** — Changement de plan :
- Lors du changement de tier, nettoyer les forced_features redondantes

