# Correction : impression vierge depuis le popup "Validation du dossier SAV" (mode simplifié)

## Symptôme
Dans le wizard simplifié (`SAVWizardDialog`), au dernier popup `PrintConfirmDialog`, cliquer sur **Imprimer** sort une feuille vide. En revanche, si on clique sur **Valider** puis qu'on imprime depuis la fiche SAV, le document est correct. Le problème est surtout visible sur les SAV **internes** (et potentiellement présent sur tout type sans client), beaucoup moins visible sur **externe/client** car ces fiches affichent au moins les infos client du brouillon.

## Cause racine
Dans `SAVWizardDialog.tsx` :

1. Avant la persistance, on injecte un **brouillon** dans l'état : `setCreatedSAVCase(draftCase)` (sans `id`, sans `case_number`, sans `tracking_slug`, et sans `customer` pour les types qui ne demandent pas d'info client → cas SAV interne).
2. `<SAVPrintButton savCase={createdSAVCase} ref={printButtonRef} />` est monté avec ce brouillon.
3. À l'appui sur **Imprimer**, `PrintConfirmDialog` exécute d'abord `onPersistBeforeAction` (= `persistSAV`) puis appelle immédiatement `onConfirm` (= `handlePrintConfirm` → `printButtonRef.current.print()`).
4. Bien que `persistSAV` fasse `setCreatedSAVCase(enrichedCase)`, React n'a pas eu le temps de re-rendre `SAVPrintButton` avec le nouveau `savCase`. De plus, dans `SAVPrint.tsx`, `useImperativeHandle(ref, () => ({ print: handlePrint }), [])` est figé sur la **closure initiale** (deps vides), donc même après le re-render, l'appel `print()` exécute toujours l'ancien `handlePrint` qui voit le **brouillon**.
5. `handlePrint` requête `sav_parts` avec `savCase.id` = `undefined` → 0 ligne ; et rend le HTML avec un `case_number` vide, sans client (interne) → **feuille vierge**.

L'externe « semble » fonctionner uniquement parce que le brouillon contient au moins les coordonnées client saisies, mais en réalité il manque aussi case_number, tracking, pièces, totaux : le bug est universel, juste plus discret.

## Correctif (ciblé, sans casser le reste)

Deux ajustements minimaux et complémentaires :

### 1. `src/components/sav/SAVPrint.tsx`
- Permettre à la méthode exposée d'accepter un `savCase` en paramètre, et corriger les deps de `useImperativeHandle` pour qu'elle suive le prop courant.
- Signature : `print: (override?: SAVCase) => void` ; en interne, `handlePrint` utilise `override ?? savCase`.
- Deps : `[savCase]` (au lieu de `[]`).

### 2. `src/components/sav/SAVWizardDialog.tsx`
- Conserver le retour de `persistSAV` (déjà fait) et le passer directement à l'impression.
- `handlePrintConfirm` devient : reçoit le `enrichedCase` via une `ref` (`persistedCaseRef.current`) renseignée à la fin de `persistSAV`, et appelle `printButtonRef.current?.print(persistedCaseRef.current ?? createdSAVCase)`.
- Aucun changement de logique métier (persistance, parts, commandes), uniquement le câblage d'impression.

### Effets de bord vérifiés
- `SAVForm.tsx` utilise aussi `SAVPrintButton` mais via le clic direct sur le bouton (pas via `ref.print()`) → comportement inchangé.
- `SAVDetail`/réimpression : utilise le bouton standard → inchangé.
- Le paramètre `override` est optionnel : tous les appelants existants restent compatibles.

## Fichiers modifiés
- `src/components/sav/SAVPrint.tsx` (signature `print`, deps de `useImperativeHandle`).
- `src/components/sav/SAVWizardDialog.tsx` (ref `persistedCaseRef`, `handlePrintConfirm`).

## Hors périmètre
- Pas de modification de `PrintConfirmDialog`, de la persistance, des hooks SAV, ni de la logique d'impression côté HTML/PDF.
