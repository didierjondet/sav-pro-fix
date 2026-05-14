
# Refonte de la page Inventaire — onglet "Général"

## Objectifs

- Mettre la **vue générale des inventaires en haut** et le **bloc de synthèse (KPI + graphique) en dessous**.
- Synthèse filtrable sur une **période personnalisable** (défaut : année en cours, presets + plage personnalisée).
- Ajouter un **centre d'impression** : sélection multi-inventaires + génération PDF (synthèse + manquants).
- Filtres puissants sur l'historique (statut, mode, période, recherche par nom).
- Présentation moderne, dense mais lisible, ergonomique.

## Nouvelle structure de la page (de haut en bas)

```text
┌────────────────────────────────────────────────────────────────────┐
│ En-tête : titre + actions [Journal global] [Imprimer] [+ Nouvel.] │
├────────────────────────────────────────────────────────────────────┤
│ BLOC 1 — Inventaires en cours / à clôturer (cards)                 │
├────────────────────────────────────────────────────────────────────┤
│ BLOC 2 — Historique des inventaires clôturés                       │
│  Toolbar : recherche · statut · mode · période · [Imprimer sélec.] │
│  Liste : checkbox + accordéon (détails + logs + actions PDF/Open)  │
├────────────────────────────────────────────────────────────────────┤
│ BLOC 3 — Synthèse & analyse (déplacé en bas)                       │
│  Sélecteur période : [Année courante ▼] [Du __/__/____ au __/__]  │
│   presets : Mois en cours · Trimestre · Année · 12 derniers mois   │
│  4 KPI (filtrés période) : Validés · Écart cumulé · Manquants · %  │
│  Graphique évolution sur la période                                │
└────────────────────────────────────────────────────────────────────┘
```

## Fonctionnalités détaillées

### 1) Sélecteur de période (BLOC 3)
- Composant `PeriodPicker` réutilisable avec presets : *Mois courant, Trimestre, Année courante (défaut), 12 derniers mois, Personnalisé*.
- En mode "Personnalisé" : deux date pickers (du / au).
- Filtre appliqué aux KPI **et** au graphique. Le graphique adapte sa granularité (jour / semaine / mois) selon la durée.

### 2) Toolbar de l'historique (BLOC 2)
- Recherche texte (nom de session).
- Filtre statut (Validé / Annulé / Tous).
- Filtre mode (Assisté / Scan / Manuel / Tous).
- Filtre période (réutilise `PeriodPicker`, indépendant du bloc synthèse).
- Tri (date ↓/↑, écart, nom).
- Compteur "X inventaires sélectionnés" + bouton **Imprimer la sélection**.

### 3) Centre d'impression
- Bouton "Imprimer" en en-tête → ouvre un **dialog** :
  - Étape 1 : choix des inventaires (multi-select, pré-coché si sélection courante).
  - Étape 2 : choix du document :
    - **Synthèse globale** (1 PDF agrégeant les sessions choisies : KPI globaux + tableau récap par session).
    - **Synthèse détaillée** (1 PDF par session avec totaux corrects — réutilise `inventoryPrint.ts` variant `summary`).
    - **Manquants** (1 PDF par session, variant `missing`).
    - **Pack ZIP** (option) : tout en un.
  - Étape 3 : génération + téléchargement.
- La sélection multi est aussi accessible via les checkbox de l'historique (bouton "Imprimer sélection" dans la toolbar).

### 4) Présentation / ergonomie
- Cards compactes au design cohérent (bord léger, hover, badges sémantiques).
- KPI : icônes Lucide à gauche, valeur en grand, sous-texte "vs période précédente" (delta coloré).
- Graphique : `ComposedChart` (barres = nb d'inventaires, ligne = valeur d'écart cumulée).
- Toolbar sticky en haut de l'historique pour rester accessible au scroll.
- États vides illustrés par section.
- Responsive : KPI en 2 colonnes sur mobile, 4 sur desktop ; toolbar wrap.

## Détails techniques

- **Fichiers modifiés** :
  - `src/components/settings/inventory/InventoryGeneralTab.tsx` — réorganisation des blocs, intégration toolbar, PeriodPicker, sélection multi.
- **Fichiers créés** :
  - `src/components/settings/inventory/InventoryPeriodPicker.tsx` — composant période avec presets + plage custom.
  - `src/components/settings/inventory/InventoryPrintDialog.tsx` — dialog multi-étapes pour impression groupée.
  - `src/lib/inventoryPrintAggregate.ts` — génération HTML/PDF pour la synthèse globale multi-sessions (réutilise les helpers existants de `inventoryPrint.ts`).
- **Logique** :
  - Filtre période sur `applied_at || completed_at || created_at`.
  - KPI delta : compare période N vs N-1 de même durée.
  - Graphique : bucket dynamique via `date-fns` (`eachDayOfInterval`, `eachWeekOfInterval`, `eachMonthOfInterval`).
  - Pour la synthèse globale multi : on charge `inventory_session_items` à la demande (lazy via `useQuery`) pour chaque session sélectionnée afin d'avoir les valeurs d'écart correctes (réutilise les helpers `isMissing` / `ecartGlobal` déjà introduits).
  - ZIP optionnel : utiliser `jszip` (déjà dans le projet ? sinon ajout).
- **Aucun changement DB**. Aucune RPC nouvelle. UI / présentation uniquement.

## Hors périmètre

- Pas de modification de la logique de calcul des écarts (déjà corrigée).
- Pas de modification de l'onglet d'une session ouverte.
- Pas de modification du schéma Supabase.
