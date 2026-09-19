# Magasin d'Agde invisible dans l'annuaire — correction

## Diagnostic (confirmé en base)

Pour Easycash Agde (`shop_id add89e6c…`) :
- `partner_profiles.is_published = false`, `visible_public = false`, `visible_pro = false`
- `shops.partner_directory_opt_in = false`

Or la recherche annuaire (`get_public_partner_directory` + `shop_is_publicly_visible`) exige les quatre à `true`.

**Cause :** dans Réglages → Mon site internet → Visibilité & annuaire, les interrupteurs « particuliers » / « professionnels » ne changent que l'état local du formulaire. Rien n'est écrit en base sans cliquer sur « Enregistrer ces informations » tout en bas de la page. L'interrupteur « Apparaître dans l'annuaire », lui, sauvegarde immédiatement — comportement incohérent qui piège l'utilisateur.

## Changements

### 1. Réparer les données du magasin d'Agde (migration SQL)
Puisque vous confirmez vouloir être publié :
- `partner_profiles` : `is_published = true`, `visible_public = true`, `visible_pro = true`
- `shops` : `partner_directory_opt_in = true`

Résultat immédiat : « agde », « easycash » ou « 34300 » font remonter le magasin dans l'annuaire public et pro, le site `/easycash-agde` redevient accessible, et le magasin réapparaît dans le rachat réseau.

### 2. Sauvegarde immédiate des interrupteurs de visibilité
`src/components/settings/website/WebsiteDirectorySection.tsx` :
- Les deux interrupteurs « Magasin visible par les particuliers » et « Prestataire visible par les magasins » enregistrent **immédiatement** en base (comme l'interrupteur annuaire), avec toast de confirmation — publication calculée `is_published = visible_public || visible_pro`.
- Un indicateur « modifications non enregistrées » apparaît sur les champs texte tant que le bouton Enregistrer n'a pas été cliqué, pour lever toute ambiguïté.

### 3. Vérification
- Requête de contrôle : les 4 drapeaux à `true` pour Agde.
- Test navigateur : recherche « agde » sur `/partenaires` affiche Easycash Agde ; `/easycash-agde` s'ouvre.
- Build OK.

## Détails techniques
- Fichier : `src/components/settings/website/WebsiteDirectorySection.tsx` (handlers des deux Switch → appel direct à `saveProfile`, état `dirty` pour les champs texte).
- Migration : `UPDATE partner_profiles … / UPDATE shops … WHERE id = 'add89e6c-2bff-4799-a062-63cd0a9b33c0'` (soumis à votre approbation).
- Aucun changement de schéma ni des RPC existantes.
