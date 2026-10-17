# Classement automatique des smartphones (magasin d'Agde)

## Constat
- Agde : 1 577 SAV, dont **1 538 sans aucune pastille**. Seuls 39 ont une famille (dont les 2 « Smartphone » mis à la main).
- Les SAV sans pastille sont presque tous des iPhone / Samsung (iPhone 11 : 74, iPhone 13 : 71, iPhone 14 : 45, Samsung A51…). La règle locale reconnaît bien ces appareils et le nom « Smartphone ».
- Cause : les anciens SAV n'ont jamais été classés — le classement des SAV existants ne se fait qu'au clic sur « Classer les SAV existants », et ce bouton ne traite que 1 000 SAV à la fois et s'arrête au premier souci de l'IA. Les nouveaux SAV, eux, reçoivent leur pastille au moment de la saisie.

## Ce qui sera fait
1. **Classement immédiat d'Agde** : chaque SAV sans pastille reçoit sa famille selon la marque/modèle (iPhone, Galaxy, Redmi… → Smartphone ; iPad → Tablettes ; PC → Informatique ; manettes → Consoles). Les SAV non reconnus passent à l'IA avec vos familles (Bijouterie, Électroménager…), sinon « Autres ». Les pastilles déjà posées à la main ne sont **jamais modifiées**.
2. **Bouton « Classer les SAV existants » fiabilisé** : traite tous les SAV (plus de limite à 1 000), continue même si l'IA ne répond pas pour un lot, et affiche le nombre classé par famille.
3. Rien d'autre ne change (filtres, formulaires, couleurs).

## Détails techniques
- `ProductFamiliesManager.classifyExisting` : pagination par `range` jusqu'à épuisement, try/catch par lot IA, repli `findOtherFamily`, mise à jour uniquement `product_family_id is null`.
- Backfill Agde exécuté une fois via ce même algorithme (`matchFamilyForDevice` puis `classify-sav-category`), update conditionné à `product_family_id is null`.
- Test ajouté dans `tests/productFamilies.test.ts` : « APPLE / IPHONE 11 », « APPLE / 13 PRO MAX », « SAMSUNG / A51 » → famille nommée « Smartphone ».
