

## Plan : sécurité doublon client + non-validation à la fermeture + détection correcte du code de déverrouillage

### 1. Détection de doublon client dans le wizard simplifié

Dans l'étape « Client » du wizard (`SAVWizardDialog.tsx`), une fois que le **prénom + nom** sont saisis manuellement (cas où l'utilisateur tape directement sans utiliser la barre de recherche), une vérification automatique compare la saisie aux clients existants du magasin via `useAllCustomers`.

**Logique de détection**
- Déclencheur : prénom et nom tous deux remplis (≥ 2 caractères chacun) **et** aucun client déjà sélectionné via `selectedCustomer`.
- Match : `first_name` + `last_name` (insensible à la casse, trim, accents normalisés via `localeCompare` accent-insensible).
- Debounce 400 ms pour éviter de relancer à chaque frappe.

**Affichage des correspondances**
- Encart bleu informatif sous les champs prénom/nom, intitulé : « X client(s) existant(s) avec ce nom ».
- Pour chaque doublon trouvé : carte cliquable affichant `Prénom Nom` + téléphone + email (pour différencier les homonymes).
- Bouton **« Utiliser ce client »** sur chaque carte → appelle `selectCustomer(c)` (même comportement que la barre de recherche existante).
- Bouton **« Créer quand même un nouveau client »** en dessous → masque l'encart et autorise la création (gère le vrai homonyme).
- Si zéro doublon trouvé → aucun encart, comportement actuel (création silencieuse à la soumission).

**Validation finale** : si l'utilisateur ignore l'encart et clique sur Suivant alors que des doublons existent et qu'il n'a ni sélectionné un client existant ni cliqué « Créer quand même », un message d'erreur s'affiche pour forcer un choix explicite. Si **aucun téléphone** n'est saisi alors qu'au moins un homonyme existe, le wizard exige le téléphone (différenciateur obligatoire).

### 2. Aucune création de SAV si l'utilisateur ferme la modale

Aujourd'hui : `handleSubmit` insère le SAV en BDD **avant** d'ouvrir `PrintConfirmDialog`. Si l'utilisateur clique sur la croix (ou hors modale), le SAV est déjà créé.

**Correction** :
- Ne plus appeler `createCase` / `createCustomer` dans `handleSubmit`.
- À la place : `handleSubmit` ouvre directement `PrintConfirmDialog` avec un brouillon (les états locaux du wizard suffisent — le client peut être pré-créé en mémoire mais pas persisté).
- La création réelle (customer + SAV case + sav_parts + order_items) est déplacée dans une fonction `persistSAV()` appelée **uniquement** par :
  - le bouton **« Imprimer »** (`handlePrintConfirm`),
  - le bouton **« Valider »** (`handlePrintCancel`),
  - le bouton **« Envoyer SMS »** (dans `PrintConfirmDialog`, via un nouveau callback `onPersistBeforeSMS`).
- Si l'utilisateur ferme `PrintConfirmDialog` (croix, escape, clic dehors) → **rien n'est persisté**, le wizard se referme proprement.
- Le SMS de notification suivi (`Envoyer SMS` dans le dialog d'impression) doit aussi déclencher la persistance, sinon `tracking_slug` n'existe pas. Le bouton SMS appellera donc `persistSAV()` puis enverra le SMS sur le tracking_slug renvoyé.

**Conséquence sur le numéro de dossier** : le `case_number` étant généré côté trigger BDD à l'insertion, il n'apparaît qu'après validation de l'utilisateur — `PrintConfirmDialog` recevra donc le numéro via le retour de `persistSAV()` et l'affichera après confirmation. L'écran récapitulatif du wizard affichera, lui, `« — »` à la place du numéro (le numéro n'existe pas avant validation).

### 3. Détection correcte du code de déverrouillage + case « Pas de code »

**Bug actuel** : `PrintConfirmDialog` reçoit `hasUnlockPattern={unlockPattern.length > 0}`. Le wizard ne lui transmet **jamais** la valeur de `securityCodes.unlock_code` (code numérique alphanumérique 8 car.) ni `securityCodes.sim_pin`. Du coup, même un code parfaitement saisi est ignoré, seul le schéma graphique compte.

**Correctifs**

a) **Étendre la détection** : `hasUnlockPattern` (à renommer en `hasUnlockMethod` côté prop) devient :
   ```
   unlockPattern.length > 0
   || securityCodes.unlock_code.trim().length > 0
   || noUnlockCode === true
   ```

b) **Nouvelle case à cocher « N'a pas de code »** à l'étape « Accessoires & Codes » du wizard, juste au-dessus du bloc « Codes de sécurité » :
   - Libellé : « Cet appareil n'a pas de code de déverrouillage ».
   - Lorsqu'elle est cochée : les champs `unlock_code`, `sim_pin` et le `PatternLock` sont visuellement grisés (disabled) et leurs valeurs sont vidées ; aucun message d'erreur sur le code obligatoire ne sera affiché à la validation.
   - Lorsqu'elle est décochée : retour au comportement actuel (champs actifs).
   - L'état `noUnlockCode` (boolean local) est ajouté au reset.

c) **Application du même correctif à `NewSAV.tsx` (vue normale)** pour conserver la cohérence : même case à cocher dans `SecurityCodesSection` (ou ajout en parent), même logique transmise à `PrintConfirmDialog`. Vérification rapide à faire dans le code pour brancher le tout proprement sans casser la mise en page existante.

d) **Persistance** : si `noUnlockCode` est cochée, on enregistre `security_codes: null` et `unlock_pattern: null` (comportement déjà géré par le ternaire actuel). Aucune migration nécessaire.

### Fichiers modifiés

- `src/components/sav/SAVWizardDialog.tsx` (gros fichier, modifications ciblées)
  - Encart de détection de doublons dans le case `'client'`.
  - Refacto `handleSubmit` → `persistSAV()` appelée par les boutons du `PrintConfirmDialog`.
  - Case « N'a pas de code » dans le case `'accessories'`.
  - Calcul de `hasUnlockMethod` passé au `PrintConfirmDialog`.
- `src/components/sav/SecurityCodesSection.tsx` (vue normale)
  - Ajout de la case « N'a pas de code » + props `noCode` / `onNoCodeChange`.
- `src/pages/NewSAV.tsx` (vue normale)
  - Brancher `noUnlockCode` + même logique `hasUnlockMethod` envoyée au `PrintConfirmDialog`.
- `src/components/dialogs/PrintConfirmDialog.tsx`
  - Renommer la prop `hasUnlockPattern` en `hasUnlockMethod` (signification élargie).
  - Texte de l'alerte : « Code de déverrouillage manquant. Saisissez un code, un schéma, ou cochez « N'a pas de code ». ».

### Hors scope (non touché)

- Pas de modification de la BDD, des RLS, des hooks `useCustomers`/`useAllCustomers`.
- Aucune modification visuelle des étapes Type, Appareil, Problème, Pièces, Récapitulatif.
- Aucune modification de la barre de recherche client existante (elle continue de fonctionner indépendamment).

### Vérifications attendues

- Saisir « Jean Dupont » dans le wizard alors qu'un Jean Dupont existe → encart bleu apparaît, possibilité de le sélectionner ou de forcer la création.
- Ouvrir le wizard, remplir partiellement, fermer via la croix → aucun SAV n'apparaît dans la liste.
- Saisir uniquement un code numérique (sans schéma) puis valider → aucun message d'erreur sur code manquant, le SAV se crée.
- Cocher « N'a pas de code », laisser tous les champs vides → aucun message d'erreur, le SAV se crée.
- Vue normale (`/sav/new`) : mêmes 4 vérifications fonctionnent à l'identique.

