# Plan : Historique produit cross-SAV (sans rien casser)

## Objectif
Lorsqu'un même produit (identifié par IMEI, SKU ou marque+modèle) revient en SAV, on doit :
1. **Détecter automatiquement** qu'il est déjà passé.
2. **Alerter** le technicien à la création du nouveau SAV.
3. **Accéder à l'historique complet** (anciens SAV, messages, pièces, clôtures).
4. **Lier les SAV** à une fiche produit commune sans fusionner les SAV existants.

## Approche recommandée : "Fiche produit" (tracked_product) + lien

Plutôt que de rouvrir un ancien SAV (risque comptable, audit, clôtures déjà signées, devis liés, PDF déjà remis client), on garde **un SAV = un passage atelier** (intègre, immuable), et on introduit une **entité produit** qui relie tous les SAV d'un même appareil.

### Pourquoi pas "rouvrir l'ancien SAV"
- Casse l'historique de clôture (`closure_history`), les stats mensuelles, les délais, le revenue déjà compté.
- Casse les devis liés (`quote.sav_case_id`), les notifications de satisfaction déjà envoyées.
- Confusion entre "vraie réouverture pour garantie" (rare) et "nouveau problème" (fréquent).
- Légalement : chaque intervention facturée doit rester traçable distinctement.

Le bon compromis : **SAV séparés, mais regroupés sous une fiche produit** avec une timeline globale.

## Architecture proposée

```text
tracked_products (NEW)              sav_cases (existant)
┌──────────────────┐                ┌─────────────────────┐
│ id               │◄───────────────│ tracked_product_id  │ (NEW colonne, nullable)
│ shop_id          │      1..N      │ device_imei         │
│ device_imei      │                │ sku                 │
│ sku              │                │ device_brand/model  │
│ device_brand     │                │ ...                 │
│ device_model     │                └─────────────────────┘
│ first_seen_at    │
│ last_seen_at     │
│ sav_count        │  (compteur dénormalisé)
│ customer_id      │  (dernier propriétaire connu, nullable)
│ notes            │  (notes produit transversales, optionnel)
└──────────────────┘
```

### Règle d'identification (par ordre de fiabilité)
1. **IMEI** (15 chiffres) → match exact = certitude absolue.
2. **SKU** dans le même shop → match exact = très probable.
3. **Marque + modèle + customer_id identique** → probable (à confirmer manuellement).

Seul le niveau 1 (IMEI) déclenche un **rattachement automatique**. Les niveaux 2 et 3 affichent une **suggestion** ("Ce produit semble déjà connu, lier à la fiche existante ?").

## Étapes d'implémentation

### Étape 1 — Schéma DB (migration)
- Créer `public.tracked_products` (colonnes ci-dessus) + RLS isolation par `shop_id` + GRANT.
- Ajouter `tracked_product_id uuid NULL` sur `sav_cases` + index.
- Index unique partiel : `(shop_id, device_imei) WHERE device_imei IS NOT NULL AND length(device_imei) >= 10`.
- Fonction SQL `find_or_create_tracked_product(shop_id, imei, sku, brand, model, customer_id)` qui :
  - Cherche par IMEI → renvoie l'id existant.
  - Sinon crée la fiche.
- Trigger `BEFORE INSERT/UPDATE` sur `sav_cases` qui appelle cette fonction quand `tracked_product_id` est NULL et qu'un IMEI est fourni.
- Trigger `AFTER INSERT/UPDATE` qui met à jour `last_seen_at` + `sav_count`.
- **Backfill** unique : pour les SAV existants ayant un IMEI, créer/rattacher les fiches.

### Étape 2 — Hook de détection (`useProductHistory`)
- Hook `useProductHistory({ imei, sku, brand, model, shopId })` qui retourne :
  - `existingProduct` (la fiche si trouvée par IMEI).
  - `suggestedMatches` (par SKU ou brand+model+customer).
  - `previousCases` (liste des SAV précédents : numéro, date, statut, type, problème, clôture).
- N'effectue pas de modification, lecture seule.

### Étape 3 — UI Création SAV
Dans `SAVWizardDialog` / `SAVForm`, **au moment où l'utilisateur saisit l'IMEI** (onBlur ou debounce) :
- Si match IMEI → bandeau visible **non bloquant** : "⚠️ Produit déjà connu — X SAV précédents. [Voir historique]".
- Si match SKU/modèle → bandeau plus doux : "Produit potentiellement déjà vu. [Vérifier]".
- Bouton "Voir historique" ouvre un **drawer** avec la timeline produit (voir étape 5).
- Le rattachement à `tracked_product_id` se fait automatiquement à la création via le trigger DB.

### Étape 4 — UI Fiche SAV existante
Sur `SAVDetail`, ajouter un **badge "Produit récurrent (N° passages : X)"** à côté de l'IMEI si `sav_count > 1`.
Clic → ouvre la timeline produit.

### Étape 5 — Composant `ProductHistoryTimeline`
Nouveau composant (drawer ou page modale) qui affiche, pour une fiche produit :
- En-tête : IMEI, SKU, marque/modèle, nombre total de passages, premier/dernier passage.
- Timeline verticale chronologique des SAV : numéro, date, type, problème, statut final, technicien, lien "Ouvrir le SAV".
- Pour chaque SAV : possibilité de déplier les messages clés et les pièces remplacées.
- Lecture seule — ne modifie aucun SAV existant.

### Étape 6 — Liste SAV (option visuelle)
Sur les cards SAV de `SAVList`, ajouter un petit pictogramme discret (🔁 ou similaire) quand `sav_count > 1` pour la fiche produit liée. Aucune modif de layout, juste un badge dans le coin (cohérent avec le badge RDV existant).

## Ce qui N'est PAS modifié (garanties)
- Aucune modification de la structure existante de `sav_cases` à part l'ajout d'une colonne nullable.
- Aucun changement du flux de clôture, des statuts, des notifications, des stats.
- Aucun changement des devis, des SMS, du tracking client public.
- L'écran de création reste identique en flow ; on ajoute uniquement un bandeau d'alerte et un drawer.
- Les SAV historiques sans IMEI ne sont pas affectés (colonne nullable, suggestion uniquement).

## Points techniques à valider avec toi avant code
1. **Réouverture explicite** : veux-tu en plus un bouton "Cloner ce SAV pour nouveau passage" (préremplit un nouveau SAV avec les infos produit + lien automatique) ? *Recommandé.*
2. **Garantie** : veux-tu un champ "sous garantie atelier" (ex : retour < 90j après clôture du précédent SAV) qui se calcule automatiquement et alerte que la nouvelle intervention pourrait être à prise en charge ? *Très utile pour la gestion commerciale.*
3. **Niveau d'alerte** : bandeau seulement, ou dialog modal bloquant à confirmer ? *Recommandé : bandeau non-bloquant.*
4. **Notes produit** : veux-tu un champ libre `notes` sur la fiche produit (ex : "client mécontent", "appareil fragile") visible à chaque nouveau SAV ?

## Livrables ordonnés
1. Migration SQL (tables + triggers + backfill).
2. Hook `useProductHistory`.
3. Bandeau de détection dans `SAVWizardDialog` et `SAVForm`.
4. Composant `ProductHistoryTimeline` + drawer.
5. Badge "produit récurrent" sur `SAVDetail` et `SAVList`.
6. (Optionnel selon réponses) bouton "Cloner pour nouveau passage" + détection garantie.

Réponds aux 4 questions ci-dessus et je lance l'implémentation.
