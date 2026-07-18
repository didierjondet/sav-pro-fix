
## 1. Certificat de non-réparabilité (onglet Documents)

Ajouter dans l'onglet **Documents** du SAV (vue simplifiée ET vue standard) une carte "Certificat de non-réparabilité" avec :

- Un bouton **"Générer le certificat"** qui ouvre un dialog.
- Dans le dialog : un `Textarea` pré-rempli avec un texte type éditable par l'utilisateur avant impression.
- Un bouton **"Imprimer / PDF"** qui ouvre une fenêtre d'impression A4 formatée avec :
  - **En-tête magasin** : logo (si présent), nom, adresse, code postal + ville, téléphone, email, SIRET (récupérés depuis `useShop()`).
  - **Titre** : « CERTIFICAT DE NON-RÉPARABILITÉ ».
  - **Bloc client** : nom, prénom, téléphone, email.
  - **Bloc appareil** : marque, modèle, IMEI/SN, référence SAV + code-barres Code128.
  - **Corps** : le texte modifiable.
  - **Motifs techniques** : liste puce (invention plausible selon le type d'appareil / panne — voir ci-dessous).
  - **Zones signatures** : Technicien / Client / Date.

### Texte pré-rempli (généré dynamiquement)

Construit à partir de `sav_case` (device_brand, device_model, problem_description, sav_type) :

> Après examen approfondi de l'appareil **{marque} {modèle}** (IMEI/SN : *{imei}*) confié dans le cadre du dossier SAV **{case_number}** en date du *{created_at}*, nos techniciens qualifiés ont procédé à un diagnostic complet.
>
> **Panne constatée :** {problem_description}
>
> À l'issue de nos investigations, nous sommes au regret de vous informer que **la réparation de cet appareil n'est pas réalisable** dans nos ateliers, pour les raisons techniques suivantes :
>
> - Dommages internes irréversibles affectant la carte-mère (composants BGA hors-service, pistes coupées non reconstructibles).
> - Pièces détachées d'origine constructeur indisponibles sur le marché ou en fin de vie (EOL).
> - Coût estimatif de la réparation supérieur à la valeur résiduelle de l'appareil.
> - Absence de garantie de fonctionnement post-intervention (risque élevé de récidive).
>
> Nous restons à votre disposition pour vous conseiller sur les alternatives possibles (reprise, recyclage, remplacement).
>
> *Le présent certificat est établi pour servir et valoir ce que de droit.*

Les motifs techniques listés seront adaptables (l'utilisateur peut tout modifier dans le Textarea). Le texte complet est mis dans **un seul Textarea** pour édition libre.

### Fichiers

- Créer `src/components/sav/NonRepairabilityCertificateDialog.tsx` — dialog avec textarea, bouton imprimer, template HTML A4 (inspiré de `SAVPrint.tsx`).
- Éditer `src/pages/SAVDetail.tsx` — ajouter la carte "Certificat de non-réparabilité" dans le `TabsContent value="documents"` des deux vues (simplifiée + standard), à côté / au-dessus de `SAVDocuments`.

## 2. Couleur du bandeau + onglets sélectionnés

Le bandeau sticky actuel `bg-slate-800 text-slate-50` est trop foncé et hors palette. Le remplacer par la teinte **`primary`** déjà utilisée pour attirer l'attention sur les éléments importants du SAV (cf. `ProblemDescriptionHighlight.tsx` qui utilise `primary/10`, `primary/5`, `border-l-primary`).

### Changements dans `src/pages/SAVDetail.tsx`

- Bandeau sticky (les deux vues) :
  - Remplacer `bg-slate-800 text-slate-50 border-b border-slate-900 shadow-md`
  - Par `bg-primary/10 border-b-2 border-primary/40 shadow-sm` (fond discret teinté, bordure basse marquée). Le texte reprend `text-foreground` par défaut — bien lisible en clair et sombre.
- Onglet actif : ajouter sur chaque `TabsTrigger` la classe :
  ```
  data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary
  ```
  pour marquer visuellement l'onglet sélectionné avec la même teinte que le bandeau. À appliquer sur les deux `TabsList` (simplifiée + standard), sans toucher aux règles existantes du "Prêt matériel" en rouge.

## Notes

- Aucun changement backend / DB : le certificat est généré côté client à partir des données déjà chargées (`savCase`, `shop`).
- Utilisation de `window.open` + `document.write` pour l'impression, comme `SAVPrint.tsx` et `SAVDocuments.tsx`.
- Le code-barres Code128 réutilise `JsBarcode` déjà présent (via `SAVBarcode.tsx`).
