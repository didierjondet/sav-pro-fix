# Site vitrine par abonné + rachat de matériel cassé

Chaque abonné Fixway obtient un vrai mini-site public à une adresse courte à donner sur sa carte de visite, avec un parcours « Vendre mon matériel cassé ou défectueux » et, en cas de refus, une cotation ouverte au réseau.

## 1. Le site du magasin

Adresse : `fixway.fr/nom-du-magasin` (slug modifiable, unicité vérifiée, ancien slug conservé en redirection).

Contenu, réorganisé proprement en sections :

- En-tête : logo, nom, phrase d'accroche, boutons Appeler / Itinéraire / Vendre mon matériel
- Présentation : description, spécialités (badges déjà existants), certifications
- Galerie photos : jusqu'à 8 photos de la boutique/atelier
- Services et tarifs indicatifs (reprend `shop_services`)
- Infos pratiques : adresse, carte, horaires d'ouverture, téléphone, email, délais moyens, garantie
- Avis / lien avis Google si renseigné
- Bloc « Rachat » listant les catégories rachetées

SEO : titre, description, données structurées LocalBusiness, une seule H1, images en lazy loading.

## 2. Réglages « Votre site internet »

Nouvel onglet dans Réglages (catégorie Mon magasin), séparé de la Vitrine partenaire :

- Activation du site + aperçu de l'URL publique avec bouton copier et QR code à imprimer
- Édition des sections ci-dessus (accroche, description, photos, horaires, réseaux sociaux)
- Bloc Rachat : activer/désactiver, cocher les catégories acceptées (smartphone, tablette, ordinateur, TV, électroménager, trottinette/vélo électrique, console, autre), choisir réception automatique ou validation manuelle des demandes, message d'accueil du formulaire
- Bandeau d'état indiquant ce qui manque avant publication

## 3. Parcours client « Vendre mon matériel »

`fixway.fr/nom-du-magasin/vendre`, sans compte :

1. Choix de la catégorie (parmi celles cochées par le pro)
2. Questions adaptées au produit : marque, modèle, capacité/taille, état écran, allumage, panne décrite, accessoires, facture — un jeu de questions par catégorie
3. Photos et vidéo courte (upload dans un bucket privé, suppression automatique après 2 mois)
4. Coordonnées du client et envoi
5. Page de suivi par lien unique pour voir l'offre et répondre

## 4. Côté professionnel

Nouvelle page « Rachat » dans l'application :

- Liste des demandes reçues avec photos, réponses au questionnaire, badge « Client de votre site » ou « Cotation réseau » (visuellement distinct pour indiquer que c'est une demande lointaine)
- Assistant IA d'estimation : trois fourchettes basse / moyenne / haute basées sur le modèle, l'état et les prix constatés ; le pro reste totalement libre du montant saisi
- Envoi de l'offre (montant, validité, conditions, commentaire) — notification SMS/email au client

## 5. Refus et cotation réseau

Si le client refuse, on lui propose d'ouvrir sa demande au réseau Fixway :

- Les frais d'envoi sont annoncés à sa charge
- La demande est diffusée uniquement aux magasins dont les catégories rachetées correspondent
- Chaque magasin répond comme pour un client à lui
- Un délai maximum de réponse s'applique ; à son expiration, les offres sont triées puis 3 offres sont envoyées au client
- Règle de sélection configurable en Super Admin, modifiable à tout moment, par défaut « tirage pondéré par le montant » ; les deux autres options restent disponibles : tirage au sort parmi les meilleures offres, ou les 3 meilleurs montants en ordre aléatoire
- Garde-fou d'équité : plafond de pondération et malus temporaire pour un magasin déjà retenu récemment, afin qu'aucun ne soit systématiquement avantagé
- Le client reçoit les 3 offres et reste libre de conclure ou non

## 6. Super Admin

Nouvelle section « Rachat & réseau » :

- Délai maximum de réponse des magasins, réglable en heures et/ou jours
- Choix de la règle de sélection des 3 offres (3 options)
- Durée de conservation des médias (2 mois par défaut)
- Suivi : demandes reçues, taux de réponse, offres acceptées

## Détails techniques

Base de données (nouvelles tables, RLS et GRANT complets) :

- `shop_website_config` : activation, accroche, horaires, réseaux sociaux, réglages rachat, catégories acceptées, mode auto/manuel
- `shop_website_photos` : galerie
- `buyback_requests` : demande client (catégorie, réponses JSONB, coordonnées, magasin d'origine, statut, jeton public, ouverture réseau, date d'expiration des médias)
- `buyback_offers` : offres des magasins (montant, message, validité, statut, sélection)
- `buyback_settings` (globale, Super Admin) : délai de réponse, règle de sélection, rétention

Accès public sans compte via fonctions SECURITY DEFINER (`get_shop_website`, `submit_buyback_request`, `get_buyback_request_by_token`, `respond_to_buyback_offer`) pour ne jamais exposer de données privées, comme le suivi SAV public existant.

Bucket privé `buyback-media` avec URLs signées ; tâche planifiée de purge à 60 jours.

Edge functions : `buyback-ai-estimate` (fourchettes IA), `buyback-close-round` (fin du délai, tri, sélection des 3 offres avec garde-fou d'équité), notifications SMS/email réutilisant l'infrastructure existante.

Front : `src/pages/ShopWebsite.tsx` refondu en sections, nouvelles pages publiques `/:slug/vendre` et suivi par jeton, onglet Réglages « Votre site internet », page interne « Rachat », section Super Admin.
