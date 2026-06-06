## Objectif

1. Distinguer visuellement dans le menu « Devis » les devis **acceptés** et **refusés** par le client (en plus des « en cours »).
2. Notifier ces actions client via la **cloche de notifications**.
3. Corriger la page `/notifications` qui n'est **pas scrollable ni responsive**.

---

## 1. Indicateurs sur le menu « Devis » (`src/components/layout/Sidebar.tsx`)

Actuellement deux badges sont affichés :
- `inProgress` → badge rouge (destructive)
- `clientAccepted` (sms_accepted) → badge vert

Ajouts :
- **Badge orange** pour `rejected` (devis refusés par le client non encore traités).
- Réajuster les couleurs pour bien différencier :
  - En cours → badge **bleu / secondary** (info)
  - Accepté client → badge **vert** (inchangé)
  - Refusé client → badge **orange** (warning)

Les compteurs `accepted`/`rejected` ne comptent que les devis qui ne sont pas encore transformés/archivés (statuts vivants), pour que les badges disparaissent une fois l'utilisateur a traité l'action.

## 2. Notifications cloche pour actions client (`supabase/functions/quote-public/index.ts`)

Actuellement seule l'action `sms_accepted` insère une notification. Étendre :

- `accepted` (validation depuis la page publique du devis) → notification :
  - titre : « Devis accepté par le client »
  - message : `Le devis n°{quote_number} vient d'être accepté par {customer_name}.`
- `rejected` → notification :
  - titre : « Devis refusé par le client »
  - message inclut le motif traduit (`too_expensive` → trop cher, `too_slow` → délai trop long, `no_trust` → manque de confiance, `postponed` → reporté).

Type de notification : `general` (cohérent avec l'existant), `shop_id` du devis, `read=false`. Aucun changement de schéma DB nécessaire.

## 3. Page Notifications scrollable + responsive (`src/pages/Notifications.tsx`)

Cause : `AppLayout` met `overflow-hidden` sur le conteneur principal ; la page `Notifications` utilise `container mx-auto p-6` sans zone scrollable interne → contenu coupé et non défilable.

Corrections :
- Envelopper le contenu dans un wrapper `flex-1 overflow-y-auto` afin que la page défile dans la zone de contenu.
- Rendre l'en-tête (titre + bouton « Tout marquer comme lu ») responsive : passage en colonne sur mobile, bouton pleine largeur < `sm`.
- Cartes notifications : autoriser le retour à la ligne du badge sur mobile (`flex-wrap`, `gap`).
- Conserver visuellement le bouton « Retour » et le titre actuels (pas de refonte UI).

Aucune autre page ni logique métier modifiée.
