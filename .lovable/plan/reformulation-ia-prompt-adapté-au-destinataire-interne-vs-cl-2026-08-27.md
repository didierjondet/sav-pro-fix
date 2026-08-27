# Reformulation IA : prompt adapté au destinataire (interne vs client)

## Constat vérifié

Tous les boutons de reformulation appellent la même fonction `ai-reformulate-text` avec un simple `context`. Aujourd'hui le contexte `technician_comments` a un prompt qui dit explicitement « ces commentaires sont destinés aux TECHNICIENS » — or il est utilisé sur des zones réellement adressées au client :

- Clôture de SAV (`SAVCloseUnifiedDialog`) : carte « Commentaire pour le client » (visible sur le bon de restitution) → `technician_comments`.
- Fiche SAV (vues standard et simplifiée) : « Commentaire technicien / Commentaire pour le client », visible client et imprimé → `technician_comments`.
- Proposition de RDV (`AppointmentProposalDialog`) : « Informations supplémentaires pour le client » → `technician_comments`.

Résultat : le texte est reformulé en jargon interne alors qu'il sera lu par le client.

## Ce qui sera fait

1. **Deux familles de destinataires** clairement séparées dans la reformulation :
   - **Interne** : description de la panne, notes de réparation, commentaires privés magasin, notes internes → ton technique, factuel, structuré (inchangé).
   - **Client** : commentaire de clôture / commentaire visible client, notes de RDV envoyées au client, messages de chat et SMS → ton clair, courtois, sans jargon, explique ce qui a été fait et ce que le client doit retenir, pas de termes internes ni de références à des collègues.

2. **Nouveau contexte `customer_message`** dans la fonction IA, avec un prompt dédié « message destiné au client final ».

3. **Personnalisation** : le bouton pourra transmettre le prénom/nom du client, le nom du magasin et le numéro de dossier. Le prompt les utilisera pour une adresse personnalisée (ex. « Bonjour M. Dupont, … ») quand ces informations sont fournies, sans inventer de données absentes.

4. **Mise à jour des points d'appel** :
   - `SAVCloseUnifiedDialog` : « Commentaire pour le client » → contexte client + prénom/nom du client.
   - `SAVDetail` (vue standard et simplifiée) : « Commentaire technicien » (visible client) → contexte client + prénom/nom ; « Commentaires privés magasin » reste interne.
   - `AppointmentProposalDialog` : notes client → contexte client.
   - `MessagingInterface` (chat) et `SMSButton` (SMS) : conservent leurs contextes mais reçoivent aussi le nom du client pour la personnalisation ; la limite de 160 caractères du SMS reste impérative.
   - Aucun changement pour `SAVForm`, `SAVWizardDialog`, `QuoteForm` (usages internes).

5. **Infobulle du bouton** adaptée : « Reformuler pour le client » vs « Reformuler (note interne) », pour que l'utilisateur voie à qui s'adresse le formatage.

## Détails techniques

- `supabase/functions/ai-reformulate-text/index.ts` : ajout du cas `customer_message` dans `getSystemPrompt`, et prise en compte d'un objet optionnel `recipient` (`{ customerFirstName, customerLastName, shopName, caseNumber }`) injecté dans le prompt système. Rétrocompatible : sans `recipient`, comportement actuel.
- `src/components/sav/AITextReformulator.tsx` : ajout du type `"customer_message"` et d'une prop optionnelle `recipient`, transmise dans le body de l'invocation ; tooltips ajustés.
- Points d'appel modifiés : `SAVCloseUnifiedDialog.tsx`, `SAVDetail.tsx` (2 blocs technicien), `AppointmentProposalDialog.tsx`, `MessagingInterface.tsx`, `SMSButton.tsx`.
- Aucune modification de base de données, aucun changement de mise en page ni de comportement d'enregistrement.
