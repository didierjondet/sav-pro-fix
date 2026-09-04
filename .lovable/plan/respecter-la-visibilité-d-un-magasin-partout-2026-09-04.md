# Respecter la visibilité d'un magasin partout

## Ce que montre la base

Pour Easycash Agde, les réglages de visibilité sont bien enregistrés :
opt-in annuaire `false`, fiche publiée `false`, visible particuliers `false`, visible pro `false`.

Pourtant le magasin apparaît encore dans le sélecteur de magasin de la page de vente/cotation :
la fonction `get_buyback_shops` ne regarde que `shop_website_config.enabled` et
`buyback_enabled` (tous deux encore à `true`), et ignore complètement les réglages de visibilité.
Même problème potentiel pour le site vitrine et les demandes de rachat diffusées au réseau.

## Règle appliquée

Un magasin est « publiquement visible » uniquement si :
- l'opt-in annuaire est actif, **et**
- il est visible pour les particuliers et/ou pour les pros.

S'il n'est pas visible :
- il n'apparaît plus dans l'annuaire public ni dans l'annuaire pro,
- il n'apparaît plus dans la liste de choix de magasin lors d'une cotation de rachat,
- son site vitrine devient inaccessible, même via son adresse directe ou un QR code,
- il ne reçoit plus les demandes de rachat ouvertes au réseau national.

Tout est réversible : réactiver la visibilité remet immédiatement le magasin en ligne.

## Ce qu'on va faire

### 1. Une seule source de vérité côté base
Créer une fonction interne `shop_is_publicly_visible(shop_id)` qui applique la règle ci-dessus,
et l'utiliser dans toutes les fonctions qui exposent un magasin :
- `get_buyback_shops` (sélecteur de magasin pour la vente d'appareil)
- `get_shop_website` (site vitrine par adresse personnalisée)
- `get_public_partner_directory`, `get_public_partner`, `get_pro_partner_directory`
- `get_network_buyback_requests` (le magasin invisible ne voit plus les demandes réseau)

### 2. Site vitrine cohérent
Quand le magasin est invisible, `get_shop_website` renvoie le statut `disabled` déjà géré par
la page : le visiteur voit un message clair « ce site n'est pas accessible actuellement »
plutôt qu'une page cassée. Idem pour la page de vente partenaire `/:slug/vendre`.

### 3. Message clair dans les réglages
Dans Réglages → Mon site internet, le bandeau d'état indique explicitement que couper la
visibilité désactive aussi le site vitrine, la présence dans les annuaires et la réception des
demandes de rachat, pour éviter toute surprise.

## Détails techniques

- Migration : nouvelle fonction SQL `public.shop_is_publicly_visible(uuid)` (stable, security
  definer, `search_path=public`), puis `CREATE OR REPLACE` des six fonctions listées avec la
  condition ajoutée. Aucune donnée modifiée, aucun réglage changé à la place du magasin.
- Front : `src/components/settings/website/WebsiteDirectorySection.tsx` (texte du bandeau d'état),
  `src/pages/ShopWebsite.tsx` / `src/pages/ShopWebsiteSell.tsx` (déjà prêts pour le statut
  `disabled`, vérification du rendu), `src/pages/SellDevice.tsx` inchangé (la liste vient du RPC).
