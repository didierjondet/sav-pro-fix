# Recherche de pièces plus pertinente

## Problème

`multiWordSearch` (utils/searchUtils.ts) vérifie seulement la présence de tous les mots dans un texte concaténé (name + reference + sku + supplier + notes). Conséquences :

- "iphone 12" matche aussi un produit nommé "Coque iPhone — compatible 12/13/14/15" ou dont la référence contient "12".
- Aucun classement : la liste reste triée alphabétiquement par nom, donc un "iPhone 15" peut apparaître avant un "iPhone 12" pertinent.
- Les correspondances dans le nom ne sont pas privilégiées par rapport aux correspondances dans notes/fournisseur.

Endroits concernés (4) :
- `src/pages/Parts.tsx` (recherche page Stock)
- `src/components/sav/PartsSelection.tsx` (rattacher pièce dans SAV)
- `src/components/sav/SAVPartsEditor.tsx` (édition pièces SAV)
- `src/components/quotes/QuoteForm.tsx` (recherche pièce dans devis)

## Solution

### 1. Nouveau utilitaire `searchAndRankParts` dans `src/utils/searchUtils.ts`

Fonction de scoring qui retourne les pièces triées par pertinence décroissante :

Pondération par champ :
- `name` exact (insensible casse/accents) → 1000
- `name` commence par la requête complète → 500
- chaque mot trouvé en début d'un token du `name` → +50
- chaque mot présent dans `name` → +20
- chaque mot présent dans `reference`/`sku` → +10
- chaque mot présent dans `supplier`/`notes` → +2
- bonus si TOUS les mots sont dans `name` → +100
- exclusion si un des mots n'est trouvé nulle part (comportement actuel conservé)

Normalisation : lowercase + suppression accents (`normalize('NFD')`) pour que "écran" = "ecran".

Retourne `Part[]` trié desc par score, puis alpha par name à score égal.

### 2. Appliquer dans les 4 composants

Remplacer :
```ts
parts.filter(p => multiWordSearch(term, p.name, p.reference, ...))
```
par :
```ts
searchAndRankParts(term, parts)
```
en conservant les `.slice(0, 10)` existants.

### 3. Couche IA optionnelle (re-ranking) — page Stock uniquement

Pour répondre à la demande "couche d'IA" sans alourdir chaque frappe :

- Bouton discret "Affiner avec l'IA" à côté du champ de recherche de la page Stock, visible uniquement quand `searchTerm.length >= 3` et `filteredParts.length > 5`.
- Au clic, appelle une nouvelle edge function `ai-rerank-parts` (Lovable AI Gateway, modèle `google/gemini-3-flash-preview`) avec la requête et les 30 premiers candidats (id, name, reference). Retourne un tableau d'`id` ordonnés. La liste est ensuite réordonnée côté client.
- Indicateur de chargement + toast d'erreur en cas d'échec (rate limit 429 / crédits 402). Pas de re-ranking automatique pour préserver les crédits et la latence.

Edge function : `supabase/functions/ai-rerank-parts/index.ts` avec `Output.object({ ids: z.array(z.string()) })`.

## Détails techniques

- Aucune migration DB.
- Aucune modification de schéma `Part`.
- L'utilitaire reste pur (testable, sans dépendance React).
- `multiWordSearch` reste inchangé (toujours utilisé ailleurs : SAV, clients, logs, etc.).

## Fichiers modifiés

```
src/utils/searchUtils.ts          (ajout searchAndRankParts + normalize helper)
src/pages/Parts.tsx               (utilise searchAndRankParts + bouton IA)
src/components/sav/PartsSelection.tsx        (utilise searchAndRankParts)
src/components/sav/SAVPartsEditor.tsx        (utilise searchAndRankParts)
src/components/quotes/QuoteForm.tsx          (utilise searchAndRankParts)
supabase/functions/ai-rerank-parts/index.ts  (nouveau, edge function)
supabase/config.toml              (déclaration de la function, verify_jwt = true)
```

## Question

Souhaitez-vous le bouton IA "Affiner" :
- (A) Uniquement sur la page Stock (proposé)
- (B) Aussi dans la recherche pièce des SAV et devis
- (C) Pas de bouton IA — uniquement le scoring local amélioré (plus rapide, gratuit)
