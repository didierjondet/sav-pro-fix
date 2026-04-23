

## Plan : blocage strict des doublons client à l'étape "Suivant"

### Problème actuel

1. La fonction `validateStep('client')` (qui gère le clic sur **Suivant**) ne vérifie pas la présence de doublons. Le blocage est uniquement dans `handleSubmit` (dernière étape "Récapitulatif"), donc l'utilisateur peut traverser tout le wizard avant d'être bloqué.
2. L'encart bleu de doublon dépend d'un `debounce` de 400 ms et de `allCustomers` chargé depuis `useAllCustomers`. Si l'utilisateur clique "Suivant" rapidement, le calcul n'a pas eu lieu → aucun blocage visuel ni logique.
3. Capture d'écran confirme : `jondet didier` saisi, aucun encart affiché, le bouton Suivant reste actif.

### Correctifs

**1. Ajouter la vérification de doublon dans `validateStep('client')`**

Dans `src/components/sav/SAVWizardDialog.tsx` :
- Étendre le `case 'client'` de `validateStep` :
  - Si l'utilisateur n'a pas sélectionné de client existant et qu'il a saisi prénom + nom (≥ 2 caractères chacun),
  - Calculer **immédiatement et synchronement** (sans dépendre du debounce) la liste des doublons via la même logique de normalisation (`normalize`),
  - Si des doublons existent et que `forceCreateNewCustomer === false` → retourner `{ ok: false, message: "Client(s) existant(s) trouvé(s). Sélectionnez un client dans la liste ou cliquez sur « Créer quand même un nouveau client »." }`.
  - Si `forceCreateNewCustomer === true` mais téléphone vide → exiger le téléphone.

**2. Calcul synchrone basé sur la saisie en temps réel**

- Remplacer la dépendance au debounce dans la validation : utiliser directement `customerInfo.firstName.trim()` et `customerInfo.lastName.trim()` au moment du clic Suivant.
- Le debounce reste utilisé uniquement pour l'affichage de l'encart bleu (UX fluide).
- Garantit que même un clic Suivant immédiat après saisie déclenche la détection.

**3. Forcer l'affichage de l'encart si validation échoue**

- Quand `validateStep` retourne le message de doublon, recalculer immédiatement `debouncedFirstName/LastName` depuis la valeur courante (force l'affichage de l'encart bleu sous les champs).
- Le message d'erreur rouge actuel (`validationError`) s'affiche déjà sous le bouton Suivant — il restera visible.
- Ajout d'un `scrollIntoView` doux sur l'encart pour que l'utilisateur le voie.

**4. Robustesse de la détection**

- Normaliser également les **espaces multiples** (`replace(/\s+/g, ' ')`) en plus de la suppression d'accents et de la casse, pour matcher `"jondet "` vs `"jondet"`.
- La comparaison reste sur `first_name + last_name` exacts après normalisation.

### Fichier modifié

- `src/components/sav/SAVWizardDialog.tsx`
  - `normalize()` : ajout du collapse des espaces.
  - `validateStep('client')` : ajout du calcul synchrone des doublons et retour d'erreur si non résolus.
  - `goNext()` : si l'erreur est de type doublon, forcer la mise à jour immédiate de `debouncedFirstName/LastName` pour révéler l'encart bleu.

### Hors scope

- Aucune modification de la BDD, des hooks, ou des autres étapes du wizard.
- Aucun changement visuel à part le déclenchement plus précoce de l'encart bleu existant.
- Vue normale (`NewSAV.tsx`) non concernée (pas de wizard).

### Vérification

- Saisir "jondet didier" (existant en base) → cliquer Suivant → blocage immédiat avec message rouge + encart bleu listant le client jondet didier existant + bouton "Utiliser ce client".
- Cliquer "Utiliser ce client" → champs auto-remplis, Suivant débloqué.
- Cliquer "Créer quand même un nouveau client" sans téléphone → blocage avec message "Téléphone requis".
- Saisir "jondet didier" + téléphone + "Créer quand même" → Suivant fonctionne.

