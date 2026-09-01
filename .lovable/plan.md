# Pastille "Client" conditionnée au type de SAV

## Objectif
Dans la fiche SAV, l’avertissement rouge et la pastille "!" sur l’onglet **Client** ne doivent s’afficher que lorsque le type de SAV a activé la saisie d’informations client (`show_customer_info = true`). Si le type de SAV a désactivé cette option, l’onglet reste neutre et le contenu indique que ce type de SAV ne nécessite pas de client.

## Ce qui sera modifié

1. **`src/components/sav/SAVCustomerTab.tsx`**
   - Ajout d’une prop optionnelle `requiresCustomer?: boolean`.
   - Le bandeau rouge "Aucun client rattaché à ce dossier" n’est affiché que si `requiresCustomer` est `true`.
   - Si `requiresCustomer` est `false`, remplacer le bandeau rouge par un message informatif gris : "Ce type de SAV ne nécessite pas de client."
   - La recherche/création de client reste disponible manuellement dans tous les cas.

2. **`src/pages/SAVDetail.tsx`**
   - Calculer `const requiresCustomer = getTypeInfo(savCase.sav_type).show_customer_info;`.
   - Sur les deux onglets **Client** (vue simplifiée et vue standard), n’appliquer les classes `text-destructive` et la pastille "!" que si `!savCase.customer_id && requiresCustomer`.
   - Passer la prop `requiresCustomer` aux deux instances de `<SAVCustomerTab>`.

## Non-régressions
- Aucun changement de schéma de base de données.
- Aucune modification des autres onglets, de l’audit, ni des actions de liaison/déliaison.
- Le comportement actuel reste inchangé pour les types de SAV avec informations client activées.
