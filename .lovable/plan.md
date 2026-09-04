# Interrupteur « Mode discret » (masquer CGU/CGV et mentions HAPICS)

Un seul switch dans le Super Admin permet de :
- masquer tous les liens et documents légaux (CGU, CGV, Politique de confidentialité) du site public ;
- remplacer partout le nom **HAPICS** par **Didier Jondet** dans les textes affichés (factures, contenus légaux, pieds de page).

Le switch est réversible : le désactiver restaure l'affichage d'origine. Aucun contenu n'est supprimé en base, seul l'affichage change.

## Où se trouve le bouton

Super Admin → **Landing Page** (là où les contenus CGU/CGV/Confidentialité sont déjà édités) : une carte « Mode discret » avec un switch et une explication courte.

## Ce qui change quand le switch est activé

1. Pied de page public (`LandingFooter`, utilisé par `/` et la landing publique) : les trois boutons CGU / CGV / Politique de confidentialité disparaissent. Le reste du pied de page est inchangé.
2. Fenêtre de document légal : si elle est ouverte par un ancien lien, elle n'affiche plus le contenu (message neutre) et, en tout état de cause, le texte est nettoyé de toute mention HAPICS.
3. Factures (écrans de facturation et PDF généré) : `company_name`, `footer_text`, `legal_text` et l'en‑tête affichent « Didier Jondet » au lieu de « HAPICS » / « SAS HAPICS ».
4. Toute autre chaîne affichée contenant « HAPICS » passe par le même filtre de remplacement.

## Détails techniques

- Réglage stocké dans `app_global_settings`, clé `white_label_hide_legal` (jsonb booléen, défaut `false`) — même mécanique que `prospect_redirect_enabled` (aucune migration de schéma nécessaire, simple upsert).
- Nouveau hook `src/hooks/useLegalVisibility.ts` : lecture du réglage (React Query, `staleTime` 60 s) + export d'un helper `maskCompanyName(text)` qui remplace, insensible à la casse, `SAS HAPICS` puis `HAPICS` par `Didier Jondet`.
- Nouveau composant `src/components/admin/LegalVisibilityToggle.tsx` (calqué sur `ProspectRedirectToggle`), rendu dans `LandingPageManager`.
- `LandingFooter` reçoit une prop `hideLegal` (défaut `false`) ; `Landing.tsx` et `PublicLanding.tsx` la passent depuis le hook.
- `LegalDocumentDialog` : applique `maskCompanyName` au contenu et n'affiche rien si le mode est actif.
- `useInvoiceConfig` : applique `maskCompanyName` aux champs texte retournés quand le mode est actif (l'édition dans `InvoiceConfigManager` reste sur les valeurs réelles).
- Edge function `generate-invoice-pdf` : lit `app_global_settings.white_label_hide_legal` puis applique le même remplacement sur `company_name`, `footer_text`, `legal_text` avant génération du HTML.

## Hors périmètre

Aucun autre élément d'interface, mise en page ou logique métier n'est modifié.
