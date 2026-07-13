## Objectif
Ajouter dans la page Super Admin > Crédits SMS un bouton raccourci qui redirige vers la page d'achat de crédits SMS Brevo dans un nouvel onglet.

## Modification
Fichier : `src/components/admin/SMSCreditsTab.tsx`

Dans la carte "Crédits SMS en temps réel" (à côté du bouton refresh) OU en tête de la carte "Ajouter des crédits SMS manuellement", ajouter un bouton :

- Libellé : « Acheter des SMS sur Brevo »
- Icône : `ExternalLink` (lucide-react)
- Action : `window.open('https://app.brevo.com/billing/plan/customize/transactional-sms', '_blank', 'noopener,noreferrer')`
- Style : `variant="outline"`
- Petit texte d'aide : « Ouvre la page d'achat de crédits SMS Brevo dans un nouvel onglet »

Aucune modification backend, aucun changement de logique métier, aucun autre élément UI touché.
