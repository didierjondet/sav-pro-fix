## Objectif

Réorganiser l'affichage des logs d'inventaire pour réduire la surcharge visuelle ET permettre une consultation/impression complète des mouvements pour chaque inventaire clôturé.

## 1. Page Inventaire — Vue générale (`InventoryGeneralTab.tsx`)

### En-tête
- À côté du bouton rouge "Lancer un nouvel inventaire", ajouter un bouton secondaire `variant="outline"` **"Journal log global"** (icône `History`).
- Au clic : ouvre un `Dialog` plein écran (max-w-5xl) listant tous les logs (contenu de la carte "Journal global" actuelle), avec recherche par session/action et filtre par type d'action.

### Carte "Historique des inventaires clôturés"
- Chaque ligne devient un `Collapsible` :
  - Header : nom + date + écart + badge statut + chevron.
  - Contenu déployé : 2 onglets (`Tabs`)
    - **Détails** : récap (compteurs, valeurs, dates clés).
    - **Logs** : entrées `inventory_audit_logs` filtrées sur cette `inventory_session_id`.
  - Bouton "Ouvrir la session" conservé dans le contenu déployé.

### Suppression
- Retirer la carte "Journal global" affichée en bas (déplacée dans le dialog du bouton du haut).

## 2. Vue d'une session clôturée (`InventorySessionTab.tsx`)

À l'ouverture d'un inventaire déjà validé/cloturé/annulé :

### Bouton en haut "Journal log"
- Nouveau bouton (icône `History` + libellé **"Journal log"**) dans la barre d'actions de la session.
- Au clic : ouvre un `Dialog` (max-w-5xl) **"Journal de l'inventaire — {nom}"** affichant **tous les mouvements** de cette session, présentés clairement pour la lecture et l'impression.

### Contenu du dialog (par log, présentation tableau imprimable)
Colonnes :
- Date/heure
- Auteur (`changed_by_name`)
- Action (badge lisible : Modification quantité, Marquée manquante, Lot scan, Application stock, Suppression, Pause, Reprise, etc.)
- Pièce concernée (`metadata.item_name` / référence)
- Champ modifié (`field_name`)
- Ancienne valeur → Nouvelle valeur
- Notes (`metadata` complémentaire)

Regroupement chronologique par jour avec sous-totaux (nb actions, valeur d'écart cumulée du jour si dispo).

### Bouton "Imprimer"
- Bouton `Printer` dans le header du dialog.
- Génère une vue imprimable (nouvel onglet ou `window.print()` sur un conteneur dédié avec CSS `@media print`) :
  - En-tête : nom inventaire, date création/clôture, auteur, statut, totaux (comptés/manquants/écart €).
  - Tableau complet des logs (mêmes colonnes).
  - Pied : page / total pages, mention magasin.
- Réutiliser le pattern existant `src/lib/inventoryPrint.ts` si pertinent (à étendre avec une fonction `printInventoryAuditLog(session, logs)`).

### Données
- Étendre/réutiliser la query existante `inventory-logs-global` ou créer `inventory-logs-session` filtrant par `inventory_session_id` (limit 1000).
- Aucune modif SQL/RLS.

## Hors périmètre
- Pas de changement sur la création/édition d'un inventaire en cours.
- Pas de modification des graphiques ni des métriques.
- Pas d'export Excel (impression PDF via navigateur uniquement).
