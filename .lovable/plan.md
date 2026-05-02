
# Refonte ergonomique du module Inventaire

## Constat actuel

- On confond la page "module" et la page "session ouverte" (vue liste vs détail mélangée).
- Les boutons Synthèse / Feuille papier / Manquants sont visibles dès l'écran général alors qu'ils ne concernent qu'une session précise.
- Pas de différenciation visuelle entre un inventaire validé, en cours, en pause.
- Le détail d'une session mélange comptage, scan, rapprochement, logs, sans hiérarchie claire.
- Les logs globaux ne sont pas accessibles facilement.

## Nouvelle structure

Navigation principale par **onglets dynamiques** en haut de la page Inventaire :

```text
[ Général ] [ ● Inventaire Atelier 02/05 ] [ ● Stock vitrine ] [ + ]
```

- **Général** : onglet permanent par défaut.
- **Un onglet par session ouverte** (statut `in_progress` ou `paused`). Pastille colorée :
  - Vert clignotant = en cours
  - Orange = en pause
  - Gris = clôturée mais pas encore appliquée
- Bouton **« + Lancer un inventaire »** intégré comme dernier onglet (ou bouton à droite).
- Cliquer sur un onglet → bascule sur cette session sans perdre son état (search, filtres, brouillons).
- Fermer un onglet (croix) = le retirer de la navigation, sans supprimer la session.

### Onglet « Général »

Contenu :

1. **Bouton rouge proéminent** : « Lancer un nouvel inventaire » (en haut à droite).
2. **Sessions en cours / en pause** : cartes condensées résumant nom, progression %, manquants, valeur écart. Cliquer = ouvre l'onglet correspondant.
3. **Métriques & graphiques** sur les inventaires **validés uniquement** :
   - Nombre d'inventaires sur 12 mois
   - Valeur totale ajustée (gain / perte) par mois (bar chart)
   - Top 10 références les plus souvent manquantes
   - Taux de complétion moyen
4. **Historique des inventaires clôturés** (tableau compact, filtrable).
5. **Logs globaux** (tous inventaires confondus) — section dépliable en bas, présentés en timeline.

⚠️ Pas de boutons « Synthèse / Feuille papier / Manquants » sur cet onglet — ils sont propres à une session.

### Onglet d'une session ouverte

Hiérarchie claire en deux blocs visuellement séparés :

```text
┌─────────────────────────────────────────────────────┐
│ EN-TÊTE SESSION                                     │
│ Nom · Mode · Statut · Progression bar · Actions     │
│ [Pause] [Reprendre] [Clôturer] [Imprimer ▼]         │
└─────────────────────────────────────────────────────┘

┌──────────────── BLOC 1 : COMPTAGE ──────────────────┐
│ Sous-onglets : [Saisie] [Scan code-barres]          │
│ - Recherche / filtres                               │
│ - Liste des pièces avec actions ligne par ligne     │
└─────────────────────────────────────────────────────┘

┌──────────── BLOC 2 : RAPPROCHEMENT ─────────────────┐
│ Sous-onglets :                                      │
│ [Synthèse] [Écarts] [Manquants] [Réécritures]       │
│ - Affichage en lecture / impression                 │
│ - Bouton final : « Valider et appliquer au stock »  │
└─────────────────────────────────────────────────────┘
```

- **Comptage = ce que l'utilisateur fait** (action terrain).
- **Rapprochement = ce qu'il analyse avant de valider** (vue analytique).
- Le bouton « Valider et appliquer » reste visible mais désactivé tant que la session n'est pas clôturée, avec un tooltip clair (« Clôturez d'abord le comptage »).

### Indicateurs visuels d'état

- Bandeau coloré en haut de l'onglet session selon statut (bleu en cours, orange pause, vert prêt à appliquer, gris validé).
- Badge "Terminé ✓" quand `completionRate === 100` pour signaler clairement que l'on peut clôturer.
- Quand toutes les pièces sont traitées, afficher un encart vert d'appel à l'action : « Comptage terminé — Clôturer l'inventaire ».

## Détails techniques

Fichiers impactés :

- `src/components/settings/inventory/InventoryManager.tsx` : remplacer le système `viewMode list/detail` par un système d'onglets contrôlés (state local `openTabs: string[]` + `activeTab: 'general' | sessionId`).
- Nouveau composant `InventoryGeneralTab.tsx` : métriques + graphiques (recharts) + historique + logs globaux + bouton lancement.
- Nouveau composant `InventorySessionTab.tsx` : en-tête + bloc Comptage + bloc Rapprochement (utilise `InventoryManualEditor` et `InventorySessionSummary` existants, recomposés).
- `useInventory` : ajouter capacité à charger logs globaux du shop (sans `inventory_session_id`) pour l'onglet Général.
- Persistance des onglets ouverts dans `localStorage` (clé `fixway_inventory_open_tabs`) pour ne pas perdre la nav après refresh.
- Réutilisation des composants UI existants (`Tabs`, `Card`, `Badge`). Ajout d'un bouton de fermeture sur chaque `TabsTrigger` de session.
- Aucune modification base de données nécessaire.

## Hors scope

- Pas de changement des règles métier (calcul valeurs, RPC `apply_inventory_session`, statuts).
- Pas de modification de l'impression PDF (déjà refactorée précédemment).
- Pas de changement du flux scan code-barres existant.
