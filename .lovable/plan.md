# Main d'œuvre ajoutée automatiquement aux devis — diagnostic et correctif

## Diagnostic

La main d'œuvre qui « se met toute seule » sur les devis vient d'un réglage du magasin :

- **Paramètres → Facturation → TVA & MO** contient un interrupteur **« Activer la facturation main d'œuvre »**.
- Quand il est activé, chaque pièce qui a un « Coût MO » (forfait) ou un « Temps » (taux horaire) ajoute automatiquement une ligne de main d'œuvre au récapitulatif du devis (et du SAV, du PDF).
- Cet onglet n'est visible que par les **admins** du magasin — un prospect ou un technicien ne le voit pas, d'où l'impression que la MO « se met toute seule » sans moyen de l'enlever.

**Réponse immédiate au prospect** : aller dans Paramètres → Facturation → **TVA & MO** → désactiver « Activer la facturation main d'œuvre » → Enregistrer. La ligne disparaît de tous les nouveaux devis.

## Correctif proposé

1. **Lien d'aide directement dans le devis** : dans le récapitulatif (`BillingTotalsSummary`), quand une ligne de main d'œuvre automatique est affichée, ajouter une petite ligne d'information : « Main d'œuvre ajoutée automatiquement — modifiable dans Paramètres → TVA & MO », avec un lien direct vers `/settings?tab=billing-vat` (visible uniquement pour les admins ; les autres rôles voient juste la mention sans lien).

2. **Aucun changement de calcul** : la logique de facturation MO (forfait / taux horaire), les montants et les PDF restent strictement identiques. Seul un indice visuel est ajouté pour que chacun comprenne d'où vient la ligne et comment la désactiver.

## Détails techniques

- Fichier touché : `src/components/billing/BillingTotalsSummary.tsx` (ajout d'une mention + lien conditionné par le rôle admin, sous la ligne « Main d'œuvre (HT) »).
- Aucune migration, aucune modification de `vatCalculator.ts` ni des réglages existants.
- Vérification : compilation (`tsgo`) + contrôle visuel sur un devis avec MO activée.
