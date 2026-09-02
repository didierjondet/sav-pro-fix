# Site vitrine introuvable + annuaire

## Ce que montre la base

Pour Easycash Agde : le magasin a bien un slug (`easycash-agde`), la fiche partenaire est publiée
(`is_published`, `visible_public`, `visible_pro` à true) et l'opt-in annuaire est actif.

En revanche il n'existe **aucune ligne** dans `shop_website_config` pour ce magasin : le site
vitrine n'a jamais été enregistré. Or la fonction `get_shop_website` renvoie NULL si la config est
absente ou désactivée — d'où la page « Site introuvable » qui renvoie vers l'annuaire.

Le réglage vitrine n'a donc pas été sauvegardé (ou l'interrupteur « activer le site » est resté à
false et rien n'a été écrit).

## Ce qu'on va faire

### 1. Rendre l'activation du site fiable et lisible
Dans l'onglet vitrine des réglages : créer la ligne de configuration dès l'ouverture/enregistrement,
afficher un bandeau d'état clair (« Votre site est en ligne à l'adresse … » avec lien cliquable et
copie de l'URL, ou « Site désactivé »), et signaler les champs manquants. Vérifier que le bouton
Enregistrer écrit bien `enabled` (upsert sur `shop_id`).

### 2. Page introuvable plus utile
Quand le slug existe mais que le site n'est pas activé, afficher un message adapté
(« Ce magasin n'a pas encore activé son site ») avec, s'il est référencé, un lien direct vers sa
fiche annuaire — plutôt qu'un renvoi générique.

### 3. L'annuaire pointe vers le site quand il est actif
Ajouter à `get_public_partner_directory` (et à la fiche publique) une information « site actif ».
Sur chaque carte de l'annuaire : bouton principal « Visiter le site » vers `/{slug}` si le site est
activé, sinon « Voir la fiche » comme aujourd'hui. Même logique sur la fiche partenaire publique.

### 4. Annuaire : ne rien afficher tant qu'aucune recherche
Tant que le champ de recherche est vide, l'annuaire n'affiche aucune carte mais une invitation à
saisir une ville, un code postal ou une spécialité. Les résultats n'apparaissent qu'à partir de la
saisie (et le message « aucun résultat » ne s'affiche que si une recherche a été faite).

## Détails techniques

- Migration : ajout d'une colonne calculée / jointure `shop_website_config.enabled` dans
  `get_public_partner_directory` et `get_public_partner`.
- `src/pages/ShopWebsite.tsx` : distinguer slug inconnu et site non activé (RPC renvoie
  aujourd'hui NULL dans les deux cas — ajout d'un motif dans la réponse).
- `src/pages/PartnersDirectory.tsx` : état initial vide + bouton « Visiter le site ».
- `src/components/settings/ShopWebsiteTab.tsx` : bandeau d'état, URL publique copiable,
  création de la config à l'enregistrement.

Aucun site n'est activé automatiquement à la place du magasin ; l'activation reste une action
explicite dans les réglages.
