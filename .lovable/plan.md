
## Finalisation complète du module Inventaire

### Constats à corriger en priorité
Le module existe, mais il n’est pas encore exploitable en production sur tous les modes :
- le mode manuel repose sur des actions trop limitées et un `prompt`, donc pas sur une vraie interface de saisie
- l’arrêt / annulation / reprise ne sont pas assez visibles ni suffisamment guidés selon le mode
- il manque une vraie synthèse de rapprochement avant validation
- il manque une vue claire des pièces manquantes, des surplus et des quantités corrigées
- la validation finale peut être lancée sans workflow de contrôle assez rassurant
- la logique de session doit mieux distinguer “comptage en cours”, “inventaire clos”, “prêt à appliquer”

### Objectif
Transformer l’onglet Inventaire en outil réellement opérationnel :
- simple pour un débutant
- rapide pour un utilisateur expert
- traçable
- sécurisé par permissions
- cohérent avant, pendant et après validation du stock

### Travaux à implémenter

#### 1. Refaire le mode manuel en vraie interface de comptage
Dans `InventoryManager.tsx`, remplacer la saisie actuelle par un vrai module manuel avec :
- champ de quantité éditable directement dans la ligne
- actions explicites : “Trouvé”, “Non trouvé”, “Ajuster”, “Réinitialiser”
- sauvegarde propre sans `window.prompt`
- possibilité d’ajouter une note sur une ligne
- filtres rapides : tout, à traiter, trouvés, manquants, écarts
- compteurs visibles en haut de la table

Le mode manuel devra permettre :
- de saisir une quantité libre
- de corriger une quantité déjà saisie
- de remettre une ligne en état “à traiter”
- de marquer rapidement une ligne manquante à 0

#### 2. Ajouter un vrai pilotage de session
Renforcer les actions de session dans `InventoryManager.tsx` et `useInventory.ts` :
- “Mettre en pause”
- “Reprendre”
- “Arrêter l’inventaire”
- “Annuler l’inventaire”
- “Clôturer le comptage” avant application finale
- “Supprimer” uniquement si statut autorisé

L’interface devra adapter les actions selon le statut :
```text
En cours      -> pause / arrêter / annuler / continuer la saisie
En pause      -> reprendre / annuler
Terminé       -> revoir les écarts / appliquer le stock
Appliqué      -> lecture seule + historique
Annulé        -> lecture seule + suppression si autorisée
```

#### 3. Ajouter une synthèse métier avant validation
Créer une vraie zone de synthèse dans `InventoryManager.tsx` avec sections :
- pièces non traitées
- pièces trouvées exactes
- pièces ajustées
- pièces manquantes
- surplus de stock constatés
- valeur d’écart globale
- pièces qui vont être écrasées dans Fixway

Cette synthèse devra être visible avant le bouton de validation finale, pour que l’utilisateur comprenne exactement ce qui va changer.

#### 4. Ajouter des vues dédiées “écarts”, “manquants”, “écrasements”
Dans l’interface inventaire, ajouter des sous-vues ou onglets internes :
- `Comptage`
- `Écarts`
- `Manquants`
- `Stocks écrasés`
- `Journal`

Contenu attendu :
- `Écarts` : toutes les lignes où compté ≠ théorique
- `Manquants` : lignes à 0 / non retrouvées
- `Stocks écrasés` : avant/après une fois appliqué
- `Journal` : historique d’actions lisible métier

#### 5. Améliorer le mode assisté
Dans `InventoryAssistedDialog.tsx` :
- ajouter navigation précédente / suivante
- permettre de corriger une ligne déjà passée
- afficher le rang courant
- afficher les pièces restantes
- offrir “ignorer pour l’instant”
- fermer proprement si pause ou arrêt

Le mode assisté doit rester le plus simple possible, mais ne pas enfermer l’utilisateur dans un flux irréversible.

#### 6. Renforcer le mode scan
Dans `InventoryManager.tsx` et `useInventory.ts` :
- meilleure visualisation des SKU inconnus
- résumé du dernier lot scanné
- accès direct aux lignes ajustées par scan
- correction manuelle d’une ligne scannée
- affichage du nombre de scans par pièce
- meilleure distinction entre quantité théorique, comptée et delta

#### 7. Ajouter des helpers métier dans le hook inventaire
Étendre `useInventory.ts` avec des helpers calculés pour éviter de surcharger le composant :
- `pendingItems`
- `missingItems`
- `adjustedItems`
- `exactMatchItems`
- `overstockItems`
- `understockItems`
- `completionRate`
- `canEditSession`
- `canCloseSession`
- `canApplySession`
- `canDeleteSession`

Ajouter aussi des actions utilitaires :
- reset d’une ligne
- marquer ligne ignorée
- marquer ligne manquante
- clôturer le comptage
- reprendre une ligne déjà traitée

#### 8. Ajuster le modèle de statuts sans casser la base existante
Conserver la structure actuelle autant que possible, mais faire évoluer la logique métier côté UI :
- `in_progress` = inventaire modifiable
- `paused` = inventaire modifiable après reprise
- `completed` = comptage terminé, plus de saisie normale
- `applied` = stocks Fixway écrasés
- `cancelled` = session abandonnée

Si nécessaire, prévoir une petite migration pour compléter la logique SQL afin de mieux journaliser la clôture de comptage, sans refaire tout le schéma.

#### 9. Mieux protéger l’application finale des stocks
Avant `apply_inventory_session`, ajouter une confirmation forte côté UI :
- résumé des lignes impactées
- rappel que les non trouvés passeront à 0
- mention des quantités réservées potentiellement incohérentes
- blocage ou avertissement si des lignes restent “à traiter”

Option recommandée :
- empêcher l’application tant qu’il reste des lignes `pending`
- ou demander une confirmation explicite “considérer les non traitées comme manquantes”

#### 10. Améliorer le journal d’audit inventaire
Le journal doit devenir lisible métier :
- création session
- pause / reprise
- arrêt / annulation
- modification d’une ligne
- changement de quantité
- passage en manquant
- reset d’une ligne
- application finale du stock

Afficher si possible :
- utilisateur
- date/heure
- type d’action
- ancienne valeur / nouvelle valeur
- pièce concernée

### Fichiers à faire évoluer
#### Frontend
- `src/components/settings/inventory/InventoryManager.tsx`
- `src/components/settings/inventory/InventoryAssistedDialog.tsx`
- `src/hooks/useInventory.ts`
- `src/components/settings/inventory/types.ts`
- éventuellement un ou plusieurs nouveaux composants dédiés, par exemple :
  - `InventorySessionSummary.tsx`
  - `InventoryManualEditor.tsx`
  - `InventoryDiscrepanciesTable.tsx`
  - `InventorySessionActions.tsx`

#### Impression / export
- `src/lib/inventoryPrint.ts`

#### Base de données
- migration complémentaire seulement si nécessaire pour :
  - mieux tracer les changements de statut
  - éventuellement ajouter une fonction RPC de “clôture de session”
  - éventuellement mieux distinguer arrêt forcé et fin de comptage

### Approche d’implémentation recommandée
1. Refactorer la logique de `useInventory`
2. Recomposer `InventoryManager` en sous-composants plus clairs
3. Construire le vrai mode manuel
4. renforcer assisté et scan
5. ajouter la synthèse et la confirmation finale
6. compléter l’audit log si besoin
7. tester les cas réels de bout en bout

### Vérifications à faire après implémentation
#### Tests inventaire
- création session manuelle
- saisie quantité libre
- correction d’une ligne déjà saisie
- marquage manquant
- pause / reprise
- arrêt / annulation
- clôture comptage
- validation finale
- vérification que les pièces non retrouvées passent bien à 0
- vérification que les pièces en surplus écrasent bien le stock Fixway

#### Vérifications permissions
- admin : accès complet
- technicien sans droit : onglet caché
- technicien avec droit inventaire seul : accès comptage sans validation finale
- responsable magasin avec les deux droits : accès complet

#### Non-régression Fixway
- page Réglages et autres onglets
- gestion des rôles
- module pièces / stock
- commandes
- devis utilisant le stock
- SAV utilisant les pièces
- build TypeScript complet
- contrôle UI sur desktop et mobile

### Résultat attendu
Après cette itération, le module Inventaire devra permettre :
- de lancer un inventaire dans chacun des 3 modes
- de compter, corriger, suspendre, reprendre ou annuler proprement
- de visualiser clairement les manquants et les écarts
- de voir exactement ce qui sera écrasé dans le stock Fixway
- de valider en toute sécurité
- de garder une traçabilité complète, réservée aux profils autorisés
