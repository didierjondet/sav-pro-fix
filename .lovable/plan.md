## Modification de la zone « Codes de sécurité »

Trois changements ciblés, sans toucher au reste de la mise en page.

### 1. Mot de passe iCloud visible
Retirer le masquage `WebkitTextSecurity: 'disc'` sur le champ « Mot de passe iCloud » dans :
- `src/components/sav/SecurityCodesSection.tsx`
- `src/components/sav/SAVWizardDialog.tsx` (formulaire inline du wizard)

Le champ reste un `Input type="text"`, mais le contenu sera affiché en clair pour permettre la relecture/vérification de la saisie.

### 2. Checkbox « Cet appareil n'a pas de code de déverrouillage » → ne touche QUE le déverrouillage
Aujourd'hui, cocher la case :
- vide tous les champs (`unlock_code`, `icloud_id`, `icloud_password`, `sim_pin`, `unlock_pattern`)
- désactive (`disabled`) tous les champs iCloud / PIN SIM
- empêche la sauvegarde des codes iCloud/SIM/Mail à l'envoi

À corriger :
- **`SecurityCodesSection.tsx`** : retirer `disabled={noCode}` des champs iCloud, PIN SIM (et futurs champs Mail). Conserver `disabled={noCode}` uniquement sur le champ « Code de déverrouillage ».
- **`SAVForm.tsx`** (ligne 887-893) : le `onNoCodeChange` ne doit vider QUE `unlock_code` et `unlock_pattern`, pas iCloud/SIM/Mail.
- **`SAVForm.tsx`** (ligne 319-324) : la condition de sauvegarde `security_codes` doit rester telle quelle (déjà OK, indépendante du flag).
- **`SAVWizardDialog.tsx`** (ligne 809-816 et 335-337) : même correction — la case ne vide que `unlock_code` + `unlock_pattern`, et la sauvegarde des autres codes ne doit plus être conditionnée à `!noUnlockCode` (ligne 335).
- **`SAVWizardDialog.tsx`** (lignes 838-857) : retirer `disabled={noUnlockCode}` des champs iCloud / PIN SIM.

### 3. Nouvelle zone « Compte Mail » (indépendante)
Ajouter dans la même carte « Codes de sécurité », à la suite du bloc iCloud :

```
Compte Mail
  Identifiant mail        [______________________]
  Mot de passe mail       [______________________]   ← visible en clair
```

- Toujours actif, jamais désactivé par la checkbox déverrouillage.
- Texte du mot de passe en clair (pas de masquage).

#### Détails techniques
- Étendre `interface SecurityCodes` dans `SecurityCodesSection.tsx` :
  ```ts
  email_id: string;
  email_password: string;
  ```
- Mettre à jour les états initiaux et resets dans `SAVForm.tsx` et `SAVWizardDialog.tsx` (`{ unlock_code:'', icloud_id:'', icloud_password:'', sim_pin:'', email_id:'', email_password:'' }`).
- Étendre la condition « au moins un champ rempli » et l'objet `security_codes` envoyé en base pour inclure `email_id` et `email_password` (la colonne `security_codes` est un `JSONB`, aucune migration nécessaire).
- Mettre à jour `SecurityCodesDisplay.tsx` :
  - `interface SecurityCodes` : ajouter `email_id?: string | null; email_password?: string | null;`
  - `hasAnyCodes` : inclure les nouveaux champs.
  - Mode édition : ajouter bloc « Compte Mail » (identifiant + mot de passe en clair).
  - Mode lecture : afficher le bloc « Compte Mail » si rempli.
- Ajouter le bloc UI « Compte Mail » dans `SecurityCodesSection.tsx` et dans le formulaire inline du `SAVWizardDialog.tsx`, sur le même modèle que la zone iCloud (sans le masquage).

### Hors périmètre
- Aucune autre modification UI (alerte orange, numérotation des étapes, structure de la carte, autres sections de SAVForm/Wizard).
- Pas de changement de la suppression automatique des codes à la livraison/annulation (existante côté backend).
- Pas de migration SQL (le JSONB accueille naturellement les nouveaux champs).
