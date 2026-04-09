

## Plan : Conserver les devis acceptés et refusés au lieu de les supprimer

### Problème identifié

Deux suppressions empêchent les onglets "Devis acceptés" et "Devis refusés" de fonctionner :

1. **Devis refusé** : dans `useQuotes.ts` ligne 194-196, `updateQuote` avec `status: 'rejected'` appelle `deleteQuote()` → le devis est supprimé de la base.
2. **Devis accepté puis converti en SAV** : dans `Quotes.tsx` ligne 543-544, après la conversion, `deleteQuote()` est appelé → le devis disparaît aussi.

Les onglets filtrent par `status === 'accepted'` et `status === 'rejected'`, mais ces devis n'existent plus en base.

### Corrections

**1. `src/hooks/useQuotes.ts` — Ne plus supprimer les devis refusés**
- Supprimer le bloc `if (quoteData.status === 'rejected') { await deleteQuote(...) }` dans `updateQuote`.
- Laisser le statut `rejected` se mettre à jour normalement en base (avec `rejection_reason` et `rejected_at`).

**2. `src/pages/Quotes.tsx` — Ne plus supprimer le devis après conversion en SAV**
- Retirer l'appel `deleteQuote(quoteToConvert.id)` à la fin de `convertQuoteToSAV`.
- Le devis reste en base avec `status: 'accepted'` et `sav_case_id` renseigné, ce qui permet de l'afficher dans l'onglet "Devis acceptés" avec un badge "Converti en SAV".

**3. `src/pages/Quotes.tsx` — Ajuster le filtre des devis actifs**
- Les devis actifs excluent déjà `accepted` et `rejected`, donc aucun changement nécessaire là.

**4. `src/pages/Quotes.tsx` — Enrichir l'affichage dans l'onglet "Devis acceptés"**
- Afficher un badge "Transformé en SAV" si `sav_case_id` est renseigné.
- Désactiver le bouton "Convertir en SAV" pour les devis déjà liés à un SAV.

### Détail technique

- `useQuotes.ts` `updateQuote()` : supprimer les lignes 193-197 (le bloc `if rejected → delete`).
- `Quotes.tsx` `convertQuoteToSAV()` : supprimer les lignes 543-545 (le `deleteQuote` post-conversion). Garder les étapes 1 à 6 (mise à jour statut, création SAV, liaison pièces, envoi SMS, lien devis↔SAV).
- Les données existantes déjà supprimées ne pourront pas être récupérées ; seuls les futurs devis seront conservés.

### Fichiers impactés
- `src/hooks/useQuotes.ts` — 4 lignes supprimées
- `src/pages/Quotes.tsx` — 3 lignes supprimées + badge conditionnel ajouté

