# Saisie d'un SAV depuis le smartphone

## Ce que l'utilisateur verra

**Sur l'ordinateur — clic sur « Nouveau SAV »**
Une petite fenêtre propose deux grands choix :
- **Avec l'ordinateur** : le parcours actuel s'ouvre exactement comme aujourd'hui (formulaire complet ou assistant en vue simplifiée). Rien ne change.
- **Avec mon smartphone** : un QR code s'affiche avec le message « Scannez avec votre téléphone ». La fenêtre reste ouverte et indique en direct : « Téléphone connecté », puis « Saisie en cours… », puis « SAV créé ».

**Sur le téléphone — formulaire étape par étape**
Une étape par écran, gros boutons, barre de progression, bouton « Retour » toujours visible, brouillon conservé si l'écran se verrouille.

1. **Type de SAV** — grosses tuiles aux couleurs des types actifs. Pas de statut ni de prestataire (statut par défaut appliqué automatiquement).
2. **Client** — uniquement si le type le demande : recherche par nom/téléphone ou création rapide (nom, prénom, téléphone).
3. **Produit** — marque puis modèle (suggestions issues de l'historique du magasin).
4. **Identifiants** — IMEI, SKU, numéro de série : saisie manuelle **ou** bouton « Photographier » : l'IA lit l'étiquette et remplit les champs, à vérifier avant de continuer. Alerte « Produit déjà connu » comme sur ordinateur.
5. **Couleur** — pastilles de couleur.
6. **État (grade)** — A/B/C/D + photos de l'état du produit (appareil photo du téléphone).
7. **Panne** — description, avec le bouton de reformulation IA concise existant.
8. **Accessoires & codes** — mêmes informations que l'assistant actuel (accessoires, code de déverrouillage / schéma, etc.).
9. **Pièces détachées** — liste **déjà filtrée sur la marque et le modèle** saisis. Bouton « Chercher autre chose » pour une recherche libre dans tout le stock, et « Ajouter une pièce libre » (nom + prix).
10. **Initiales** du technicien, puis **Valider**.

Au moment de la validation seulement, le SAV est créé.

**Étape finale sur l'ordinateur**
Dès la validation, l'ordinateur affiche le SAV créé et ouvre automatiquement la fenêtre d'impression habituelle (exemplaire(s) client/magasin, feuille manette si besoin). Le téléphone affiche « SAV n° … créé — l'impression continue sur l'ordinateur » et propose « Nouveau SAV ».

## Sécurité et connexion
- Le téléphone doit être connecté au compte Fixway (une seule fois : la session reste mémorisée). S'il ne l'est pas, il passe par la connexion puis revient automatiquement au formulaire.
- Le QR code contient un lien à usage unique, valable 15 minutes, lié au magasin et à la personne qui l'a affiché. Un téléphone connecté à un autre magasin est refusé.
- Les limites d'abonnement (nombre de SAV) restent vérifiées comme aujourd'hui.

## Ce qui ne change pas
- Le formulaire ordinateur, l'assistant simplifié, les impressions et les calculs restent identiques. Le nouveau parcours réutilise la même fonction de création de SAV, donc mêmes règles (numérotation, stock réservé, historique produit).
- Le test manette reste disponible sur ordinateur (il nécessite une manette branchée) ; il n'est pas proposé sur téléphone.

## Détails techniques
- **Table `mobile_sav_sessions`** (migration) : `id`, `token` (aléatoire), `shop_id`, `created_by`, `status` (`waiting` | `connected` | `submitted` | `expired`), `sav_case_id`, `expires_at`. RLS : lecture/écriture limitée au même `shop_id` via `get_current_user_shop_id()`. Ajoutée à la publication Realtime.
- **Desktop** : `NewSAVModeDialog` branché dans `handleNewSAV` (`SAVList.tsx`) et sur la route `/sav/new` en amont. Choix « ordinateur » → comportement actuel inchangé. Choix « smartphone » → création d'une session, QR généré localement, abonnement Realtime ; à `submitted`, navigation vers `/sav/:id` avec un paramètre déclenchant la fenêtre d'impression existante (`PrintConfirmDialog`/`SAVPrint`, `getSAVPrintCopies`).
- **Mobile** : route publique `/m/sav/nouveau/:token` (garde auth + redirection retour), page `MobileSAVWizard` dédiée mobile (une étape par écran, inputs `inputMode`, `capture="environment"` pour photos), brouillon en `localStorage` par token. Réutilise `useShopSAVTypes`, `useAllCustomers`, `useSAVCases.createCase`, logique pièces de `PartsSelection`, upload photos existant.
- **Pré-filtrage pièces** : filtre côté client sur `parts` par marque/modèle (nom, référence, `device_model`) via `searchUtils`, repli recherche complète.
- **OCR identifiants** : nouvelle edge function `ai-read-device-codes` (Lovable AI, `openai/gpt-6-astra`, Responses API en streaming, sortie JSON stricte `{imei, serial, sku}` nullable), validation IMEI (15 chiffres, Luhn) côté client. Gestion 402/429 avec message clair, aucune saisie bloquée en cas d'échec.
- **Test** : test unitaire de la validation IMEI/Luhn et de l'expiration de session.
- `AGENTS.md` : règle « la création mobile passe par `createCase` comme le desktop ».
