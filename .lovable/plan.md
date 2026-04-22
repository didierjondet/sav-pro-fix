

## Plan : améliorations du wizard de création SAV

### 1. Navigation libre entre les étapes

Rendre cliquables les **indicateurs d'étapes** (les ronds avec icônes en haut du dialogue) pour permettre de revenir sur une étape précédente.

- Fichier : `src/components/sav/SAVWizardDialog.tsx` (lignes ~751-768)
- Comportement :
  - Cliquer sur une étape **antérieure** (`i < currentStep`) → retour direct à cette étape, sans validation
  - Cliquer sur une étape **future** (`i > currentStep`) → autorisé uniquement si toutes les étapes intermédiaires sont valides (utilise la même logique `canProceed()` que le bouton « Suivant » pour l'étape courante). Si invalide, on affiche le message d'erreur et on reste sur l'étape courante
  - Cliquer sur l'étape **courante** → no-op
  - Curseur `cursor-pointer` sur les indicateurs cliquables, légère mise en avant au hover
- Le bouton « Retour » existant en bas est conservé (équivalent rapide vers l'étape précédente)

### 2. Reformulation IA sur les zones de texte

État actuel : seul le champ « Description du problème » dispose du bouton IA (étape Problème). C'est aujourd'hui la seule zone de texte libre du wizard, et le bouton est bien présent dans le code.

Action : aucun autre champ de saisie libre n'existe dans le wizard. Si l'utilisateur souhaite un champ supplémentaire (par exemple « Notes techniques internes »), nous l'ajouterons à l'étape « Problème », sous la description, avec son propre bouton de reformulation IA (`context="repair_notes"`). Sinon, on confirme simplement que le bouton IA est déjà actif sur la description du problème.

### 3. Placeholders des codes iCloud

Étape « Accessoires & Codes » (lignes ~558-567) : remplacer les placeholders pour qu'ils ressemblent clairement à des exemples génériques (et non des valeurs préremplies).

| Champ | Placeholder actuel | Nouveau placeholder |
|-------|-------------------|---------------------|
| Identifiant iCloud | `email@icloud.com` | `mail@gmail.com` |
| Mot de passe iCloud | *(aucun)* | `mot de passe` |

Aucune valeur n'est prérempli en base — il s'agit uniquement de placeholders visuels. Aucune autre modification sur cette étape.

### Fichier modifié
- `src/components/sav/SAVWizardDialog.tsx`

### Vérifications post-implémentation
- Cliquer sur un rond d'étape antérieure → retour immédiat à cette étape, données conservées
- Cliquer sur un rond d'étape future depuis une étape valide → avance ; sinon message d'erreur
- Bouton « Retour » et « Suivant » fonctionnent comme avant
- Champ « Description du problème » conserve son bouton IA
- Champ iCloud affiche `mail@gmail.com` en placeholder, champ mot de passe affiche `mot de passe`
- Aucune régression sur les autres étapes ni sur la création finale du SAV

