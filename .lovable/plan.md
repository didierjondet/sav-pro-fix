

## Plan : accessoire libre + désactivation autofill + PIN à 6 chiffres

### 1. Ajouter un champ libre « Autre accessoire »

Permettre au technicien de saisir un accessoire non listé (ex : oreillettes, stylet, carte SIM, dragonne) en plus des trois cases existantes (Chargeur, Coque, Protection d'écran).

**Modèle de données (sans migration)**

La colonne `sav_cases.accessories` est de type `JSONB`. On ajoute simplement une clé `other` (string) à l'objet :
```
{ charger: bool, case: bool, screen_protector: bool, other: string }
```
Aucune migration nécessaire — JSONB accepte des clés supplémentaires. La valeur n'est enregistrée que si elle est non vide.

**Fichiers modifiés**

- `src/components/sav/SAVForm.tsx` (vue normale)
  - Étendre l'état `accessories` avec `other: ''`
  - Ajouter sous la grille des 3 checkboxes un champ texte « Autre accessoire » (Input + Label, placeholder « Ex : stylet, écouteurs, carte SIM… »)
  - Réinitialiser `other: ''` dans le reset de formulaire
- `src/components/sav/SAVWizardDialog.tsx` (vue simplifiée)
  - Mêmes modifications, dans l'étape `accessories`
  - Champ texte affiché juste sous les 3 checkboxes
- `src/pages/SAVDetail.tsx`
  - Étendre la condition d'affichage de la carte « Accessoires présents » pour aussi déclencher si `accessories.other` est non vide
  - Ajouter une 4ᵉ ligne dans la grille (ou en pleine largeur si `other` est saisi) : icône `CheckCircle` verte + texte `Autre : {valeur}`

### 2. Empêcher l'autofill du navigateur sur les codes de sécurité

Les champs identifiant iCloud, mot de passe iCloud, code de déverrouillage et PIN SIM sont actuellement préremplis par le gestionnaire de mots de passe du navigateur (Chrome/Safari).

**Fichiers modifiés**

- `src/components/sav/SecurityCodesSection.tsx` (utilisé par `SAVForm`)
- `src/components/sav/SAVWizardDialog.tsx` (étape `accessories`, inputs en lignes ~558-578)

Sur **chaque** Input des codes de sécurité (unlock_code, icloud_id, icloud_password, sim_pin), ajouter :
- `autoComplete="off"`
- `autoCorrect="off"`
- `autoCapitalize="off"`
- `spellCheck={false}`
- `data-form-type="other"` (astuce reconnue par les gestionnaires de mots de passe)
- Pour le mot de passe iCloud : utiliser `type="text"` avec un masquage CSS `style={{ WebkitTextSecurity: 'disc' }}` au lieu de `type="password"` afin de bloquer définitivement le remplissage automatique des password managers, **et** ajouter un `name` aléatoire (ex : `name={'pwd_' + uniqueId}`) pour qu'aucune correspondance d'historique n'opère
- Pour l'identifiant iCloud : changer `type="email"` en `type="text"` (mêmes raisons), conserver le placeholder `mail@gmail.com`

### 3. PIN SIM : passer de 4 à 6 caractères

- `src/components/sav/SecurityCodesSection.tsx` :
  - Label : « Code PIN carte SIM (4 à 6 chiffres) »
  - `maxLength={6}`
  - Placeholder : `123456`
- `src/components/sav/SAVWizardDialog.tsx` (étape accessories) :
  - Label : « Code PIN SIM (4 à 6 chiffres) »
  - `maxLength={6}`
  - Placeholder : `123456`

Aucune contrainte de longueur minimale imposée (4, 5 ou 6 chiffres tous acceptés, conforme aux PIN SIM réels).

### Comportements préservés

- Les valeurs existantes en base restent compatibles (clé `other` simplement absente sur les anciens dossiers).
- Suppression automatique des codes de sécurité à la clôture inchangée.
- Ordre des étapes du wizard inchangé, pas de nouvelle étape.
- Aucun changement visuel sur les autres champs validés (préférence utilisateur respectée).

### Fichiers modifiés

- `src/components/sav/SAVForm.tsx`
- `src/components/sav/SAVWizardDialog.tsx`
- `src/components/sav/SecurityCodesSection.tsx`
- `src/pages/SAVDetail.tsx`

### Vérifications après implémentation

- Vue normale : champ « Autre accessoire » saisi → enregistré et visible dans le détail SAV
- Vue simplifiée (wizard) : même comportement à l'étape « Accessoires & Codes »
- Ouverture du formulaire dans Chrome/Safari avec gestionnaire de mots de passe actif → aucun champ de codes de sécurité n'est prérempli
- PIN SIM accepte 6 chiffres maximum (saisie de 7e chiffre bloquée)
- Saisie d'un PIN à 4 ou 5 chiffres reste valide
- Aucune régression sur les SAV existants ni sur la clôture (suppression des codes)

