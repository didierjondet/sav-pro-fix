# Smartphone sans connexion : le téléphone collecte, l'ordinateur crée le SAV

## Nouveau partage des rôles

**Sur le smartphone (aucune connexion, aucun compte)** — seulement ce qui ne demande pas d'accès aux données du magasin :
1. Marque et modèle (saisie libre)
2. IMEI / n° de série et SKU — saisie ou photo lue par l'IA
3. Couleur
4. État (grade) + photos de l'état
5. Description de la panne (avec reformulation IA concise)
6. Accessoires laissés et code de déverrouillage
7. Bouton **« Envoyer à l'ordinateur »** → écran « C'est envoyé, terminez sur l'ordinateur ».

**Sur l'ordinateur (connecté, comme aujourd'hui)** — dès l'envoi, le formulaire de création habituel s'ouvre **déjà rempli** avec les informations du téléphone. Le technicien choisit ensuite : type de SAV, client (recherche/création), pièces détachées (déjà pré-filtrées sur marque/modèle), prestataire si besoin, initiales, puis valide. L'impression se lance exactement comme d'habitude.

Le SAV n'est donc créé que sur l'ordinateur, avec toutes les règles actuelles (numérotation, stock, limites d'abonnement, impressions client/magasin, feuille manette).

## Sécurité
- Le QR code contient un lien secret à usage unique, valable 15 minutes. Sans ce lien, rien n'est accessible.
- Le téléphone ne peut **que déposer** des informations dans cette fiche temporaire : il ne voit ni clients, ni stock, ni SAV, ni réglages du magasin.
- Une fois envoyé ou expiré, le lien ne fonctionne plus.
- La lecture IA et l'envoi de photos ne fonctionnent qu'avec un lien valide (pas d'abus possible des crédits IA).

## Ce qui disparaît / change
- Plus de passage par la page de connexion sur le téléphone ; le retour après connexion vers /m/... est retiré.
- Les étapes Type, Client, Pièces et Initiales sont retirées du téléphone.
- Ce qui reste inchangé : le choix « Avec l'ordinateur / Avec mon smartphone », le QR code, le suivi en direct, le parcours ordinateur classique.

## Détails techniques
- **Migration** : colonne `payload jsonb` sur `mobile_sav_sessions`. Fonctions SECURITY DEFINER exécutables par `anon` : `mobile_sav_open(token)` (valide + passe en `connected`, renvoie uniquement statut/expiration) et `mobile_sav_submit(token, payload)` (taille limitée, champs filtrés, passe en `submitted`). Aucune politique `anon` sur la table elle-même.
- **Photos** : nouvelle edge function `mobile-sav-upload` (validation du jeton côté serveur, type image et 5 Mo max, rangement dans le dossier du magasin du bucket existant) qui renvoie le chemin.
- **OCR** : `ai-read-device-codes` accepte soit un utilisateur connecté, soit un jeton de session valide (vérifié côté serveur).
- **Mobile** : `MobileSAVWizard` réduit à 6 étapes, sans hooks magasin ; plus de redirection auth. Brouillon local conservé.
- **Desktop** : à `submitted`, `NewSAVModeDialog` ouvre le parcours ordinateur (`/sav/new` ou assistant simplifié) en passant le `payload` ; `SAVForm` et `SAVWizardDialog` reçoivent un prop optionnel `initialDeviceData` qui pré-remplit appareil, codes, couleur, grade, photos, panne, accessoires et code de déverrouillage. Sans ce prop, comportement strictement identique.
- Suppression de `MobileCreatedPrintDialog` (l'impression reste celle du parcours de création habituel).
- Tests : filtrage du payload (champs autorisés uniquement) et règles de session existantes.
- Mise à jour de la règle `AGENTS.md` sur la saisie mobile.
