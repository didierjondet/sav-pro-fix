# Réparer l'impression à la fin de la création d'un SAV (wizard + form classique)

## Symptôme
Après création d'un SAV (par le wizard simplifié OU le formulaire classique), un clic sur « Imprimer » dans la popup de confirmation ferme la popup **sans lancer l'impression**. L'utilisateur doit ouvrir le SAV nouvellement créé pour le réimprimer.

## Cause technique
Deux problèmes cumulés dans `SAVPrint.tsx` + `SAVWizardDialog.tsx` + `SAVForm.tsx` :

1. **Popup bloquée par le navigateur** — `SAVPrint.handlePrint()` exécute plusieurs `await` (chargement des pièces, config TVA) *avant* d'appeler `window.open("", "_blank")`. À ce moment-là, le geste utilisateur est « consommé » : la plupart des navigateurs bloquent silencieusement la nouvelle fenêtre. Pas de fenêtre = pas d'impression.

2. **Démontage immédiat du bouton d'impression** — `handlePrintConfirm` lance `printButtonRef.current.print()` en *fire-and-forget* puis appelle aussitôt `resetAndClose()` (wizard) ou `onSuccess?.()` (form classique). Ces deux fonctions démontent le composant `<SAVPrintButton>` pendant que son `await` interne tourne encore → la fenêtre enfant peut être fermée par le navigateur quand son parent disparaît.

## Correctifs

### 1. `src/components/sav/SAVPrint.tsx`
- Ouvrir la nouvelle fenêtre **synchronement, tout au début de `handlePrint`** (avant tout `await`) avec un HTML minimal « Préparation de l'impression… ». Conserver la ref `printWindow`.
- Si `window.open` renvoie `null` (popup bloquée navigateur), conserver le fallback actuel : téléchargement du fichier HTML.
- Après les `await` (Supabase + billing), faire `printWindow.document.open(); write(html); close();` puis lancer `printWindow.print()` comme aujourd'hui.
- `handlePrint` est déjà `async` → `print()` exposé via `useImperativeHandle` retournera la Promise (signature : `print: (override?) => Promise<void>`). Mettre à jour l'interface `SAVPrintButtonRef` en conséquence.

### 2. `src/components/sav/SAVWizardDialog.tsx`
- Rendre `handlePrintConfirm` `async` et **attendre** la fin de l'impression avant de réinitialiser :
  ```ts
  const handlePrintConfirm = async () => {
    const caseToPrint = persistedCaseRef.current ?? createdSAVCase;
    if (printButtonRef.current) {
      await printButtonRef.current.print(caseToPrint);
    }
    resetAndClose();
  };
  ```

### 3. `src/components/sav/SAVForm.tsx`
- Même correctif : `handlePrintConfirm` passe en `async`, `await printButtonRef.current.print()`, puis `onSuccess?.()`.

## Hors-scope (rien d'autre n'est touché)
- Aucun changement de mise en page, de styles, ni du contenu HTML imprimé.
- Aucune modification de `PrintConfirmDialog`, de `persistSAV`, du flux SMS ou « Valider ».
- Aucune migration BDD, aucun autre composant.

## Validation
1. Wizard : créer un SAV → cliquer « Imprimer » → la fenêtre d'aperçu d'impression du navigateur s'ouvre immédiatement avec le contenu du SAV ; la popup wizard se ferme proprement ensuite.
2. Formulaire classique (`/sav/new`) : même comportement.
3. Si le navigateur bloque la popup malgré tout, le fichier HTML se télécharge en fallback (comportement préservé).
4. Les boutons « Valider » et « Envoyer SMS » restent inchangés.
