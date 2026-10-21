# Créer un nouveau client après en avoir choisi un autre

## Ce qui ne marche pas
Quand un client est déjà choisi dans un nouveau SAV, la fiche se met à jour mais le formulaire de création reste caché. Si vous cliquez ensuite sur « Changer » ou « Créer un nouveau client », le formulaire continue de croire que l'ancien client est choisi. Les champs Prénom, Nom, Téléphone et E-mail ne réapparaissent donc pas.

## Correction
- Avec « Changer » ou « Créer un nouveau client », le SAV oublie bien l'ancien client.
- Les champs de création apparaissent tout de suite. Le prénom et le nom tapés dans la recherche sont déjà remplis.
- La recherche et la détection des doublons ne changent pas.
- Ça s'applique au formulaire complet et à l'assistant simplifié, y compris pour un SAV commencé sur le smartphone.

Le parcours sur le smartphone ne change pas.

## Détails techniques
- `CustomerSearch.tsx` : nouvelle prop optionnelle `onCustomerCleared`, appelée dans `clearSelection` et `createNewCustomer`.
- `SAVForm.tsx` et `SAVWizardDialog.tsx` : passer `onCustomerCleared={() => setSelectedCustomer(null)}`.
- Aucun changement dans la base de données ni dans le parcours mobile.
