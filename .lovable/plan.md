## Correction — HelpBot ne récupère pas l'historique client

### Diagnostic
- Les logs montrent `search_customers ok` : l'outil s'exécute correctement.
- Mais le bot répond « je n'ai pas l'identifiant » sans enchaîner sur `get_customer_history`.
- Deux causes probables :
  1. Le prompt système contient la règle « **Ne renvoie JAMAIS les coordonnées clients (téléphone, email, adresse)** ». Comme `search_customers` renvoie `phone` et `email`, Gemini interprète parfois cette règle comme un blocage et refuse de poursuivre.
  2. Gemini ne réutilise pas toujours un `id` UUID d'un tour à l'autre → il vaut mieux permettre à `get_customer_history` d'accepter un nom en secours.

### Modifications ciblées — `supabase/functions/help-bot/index.ts`

1. **`search_customers`** : ne renvoyer que `id, first_name, last_name` (retirer `phone`/`email` du payload) afin de ne pas confondre Gemini avec la règle "coordonnées". Les coordonnées restent accessibles via `get_customer_history` ou `get_sav_case_detail` si vraiment utiles côté fiche.
2. **`get_customer_history`** : rendre `customer_id` optionnel et accepter aussi un paramètre `query` (nom/prénom). Si `query` est fourni, résoudre server-side le/les clients correspondants (limite 3), puis retourner un tableau `results: [{ customer: {id, first_name, last_name}, savs, quotes, appointments }]`. Si `customer_id` est fourni, comportement inchangé (mais réponse enveloppée dans le même format).
3. **Prompt système** : ajouter une phrase explicite dans les règles d'usage :
   > « Pour l'historique d'un client : appelle `search_customers`, prends l'`id` du 1er résultat pertinent et enchaîne `get_customer_history`. Si tu hésites, passe directement le nom via `query` à `get_customer_history`. »

### Hors périmètre
- Pas de changement de RLS ni de schéma DB.
- Pas de modification des autres outils du bot.
- Pas d'impact sur la messagerie client interne (les logs pertinents proviennent d'un autre flux, pas du bot).
