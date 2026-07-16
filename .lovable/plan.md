## Objectif

Uniformiser la fiche SAV standard sur le modèle de la vue simplifiée (organisation en onglets), et unifier le rendu de l'alerte "Produit déjà connu" (IMEI/SKU) partout, en reprenant exactement la card validée par l'utilisateur (capture d'écran fournie).

---

## 1. Fiche SAV — Vue standard alignée sur la vue simplifiée

Le contenu, les hooks et les composants métier de la vue standard restent identiques. Seule la **présentation** change : passage d'une longue page scrollable à la même structure en 5 onglets que la vue simplifiée.

Fichier : `src/pages/SAVDetail.tsx` (bloc rendu standard, à partir de la ligne 625).

### Structure cible (identique à la vue simplifiée)

- **Bandeau sticky** en haut : bouton Retour, numéro de dossier, badge type, badge statut, appareil, client à droite. Version standard : on garde en plus le badge `taken_over_by` et le bouton `Log` (admin), qui n'existent pas dans la simplifiée.
- **Tabs** (même ordre, même clé `fixway_sav_detail_tab` pour partager la persistance) :
  1. **Aperçu** : `ProblemDescriptionDisplay`, `Card` Client (version standard = `Coordonnées du client` avec `EditSAVCustomerDialog`), `Card` Appareil & dossier (version standard = `Détails du dossier` avec `EditSAVDetailsDialog`, `ProductRecurrenceBadge`, `SecurityCodesDisplay`, `PatternLock`, notes de réparation, commentaires technicien + privés, `AITextReformulator`), `SAVLoanerCard`, `SAVPartsRequirements`, `SAVStatusManager`.
  2. **Communication** : boutons SMS / Proposer RDV / Partager / Demande d'avis, `SAVMessaging`, `Card` Lien de suivi.
  3. **Pièces** : `SAVPartsEditor` dans une card.
  4. **Impression** : `SAVPrintButton` (prise en charge), bouton restitution conditionnel (`isReadyStatus`), `SAVBarcode` (étiquette/QR).
  5. **Documents** : `SAVDocuments`.
- Les boutons d'action actuellement en haut de la vue standard (SMS, RDV, Partager, Restitution, Print, Parts) sont **déplacés dans leur onglet respectif** — plus de barre d'actions dupliquée en haut.
- Les blocs Édition (`EditSAVCustomerDialog`, `EditSAVDetailsDialog`, `AITextReformulator`, commentaires technicien/privés, `PatternLock`, `SecurityCodesDisplay`) restent réservés à la vue standard : ils sont placés dans les cards de l'onglet **Aperçu** afin de ne rien perdre par rapport à la version actuelle.
- Bouton **Log** (admin) et badge **taken_over_by** : conservés dans le bandeau sticky standard.

### Ce qui ne change pas

- Aucune modification des hooks, du realtime, des fonctions save/update, des permissions, ni du contenu métier.
- La vue simplifiée reste strictement identique.
- Le toggle `fixway_simplified_view` continue à choisir laquelle des deux vues rendre.

---

## 2. Alerte "Produit déjà connu" — card unique et réutilisée

L'utilisateur valide visuellement la card actuelle rendue par `ProductHistoryBanner` (capture fournie : fond ambre, icône AlertCircle, titre + sous-texte, boutons "Voir l'historique" et "Nouveau SAV pour ce produit" empilés à droite).

### Action

- Faire de `ProductHistoryBanner` la **seule** source de rendu pour l'alerte de récurrence produit (IMEI + SKU).
- S'assurer qu'elle est présente aux mêmes endroits en **vue standard** et en **vue simplifiée** :
  - `SAVForm` (formulaire de création : `src/pages/NewSAV.tsx` → `SAVForm.tsx`), dès que l'IMEI ou le SKU saisi déclenche une détection.
  - `SAVDetail.tsx` — vue standard : injectée en haut de l'onglet **Aperçu**, juste au-dessus de la card `Détails du dossier`.
  - `SAVDetail.tsx` — vue simplifiée : injectée en haut de l'onglet **Aperçu**, au-dessus de `ProblemDescriptionDisplay`.
- Vérifier que dans les deux cas :
  - Le bouton **Nouveau SAV pour ce produit** ouvre `NewSAVFromProductDialog` avec le dernier dossier comme source (comportement actuel du banner).
  - Le bouton **Voir l'historique** ouvre `ProductHistoryDrawer`.
  - La détection combine IMEI (exact) **et** SKU (suggestion) via le hook `useProductHistory` existant — pas de duplication de logique.
- Supprimer tout rendu concurrent (badges/cards ad hoc) qui afficherait une alerte de récurrence avec un style différent, pour éviter les doublons visuels. Le petit `ProductRecurrenceBadge` (badge compact à côté de l'IMEI, sans texte explicatif) reste utilisé uniquement dans les listes/cards SAV — il ne concurrence pas la card d'alerte.

### Ce qui ne change pas

- Le composant `ProductHistoryBanner` conserve ses styles actuels (ceux de la capture d'écran validée).
- Aucune modification des hooks `useProductHistory` / `useProductHistoryById`, ni du schéma DB.

---

## Détails techniques

- Fichiers modifiés :
  - `src/pages/SAVDetail.tsx` : refonte du bloc rendu standard en Tabs + insertion du banner dans l'onglet Aperçu (standard **et** simplifiée).
  - `src/components/sav/SAVForm.tsx` : vérification que `ProductHistoryBanner` y est bien rendu (déjà probablement le cas — sinon, l'ajouter en dessous des champs IMEI/SKU).
- Aucune migration Supabase.
- Aucun impact sur les rôles/permissions : `isAdmin` continue de piloter le bouton Log.
- Persistance de l'onglet actif partagée entre les deux vues via `localStorage['fixway_sav_detail_tab']`.
- Typecheck exécuté après implémentation.
