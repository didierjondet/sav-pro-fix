
Constat confirmé après lecture du code et des logs :

1. Le spam de logs "Messages marked as read successfully" est bien anormal
- La cause est dans `src/components/sav/MessagingInterface.tsx` + `src/hooks/useMessaging.ts`.
- `MessagingInterface` lance `markAllAsRead()` dans un `useEffect` dépendant de `messages.length` et de `markAllAsRead`.
- Or `markAllAsRead` est recréée à chaque render, puis elle appelle `fetchMessages()`, ce qui rerender, ce qui relance l'effet, etc.
- Résultat : boucle quasi infinie de marquage "lu", donc bruit console + consommation inutile.

2. La panne SMS actuelle n’est pas Brevo lui-même
- Les logs `send-sms` montrent une erreur backend immédiate :
  `supabase.rpc(...).catch is not a function`
- Dans `supabase/functions/send-sms/index.ts`, la ligne
  `await supabase.rpc('reset_monthly_counters').catch(() => {});`
  est incorrecte.
- Du coup la fonction casse avant même d’arriver au routage Brevo/Twilio, donc votre configuration Brevo n’est même pas réellement utilisée pour cet envoi.

Plan de correction

1. Corriger la boucle de messagerie
- Stabiliser `fetchMessages` et `markAllAsRead` dans `useMessaging` pour éviter qu’elles changent à chaque render.
- Modifier l’effet de `MessagingInterface` pour ne marquer comme lu que lorsqu’il y a réellement des messages non lus de l’autre côté.
- Supprimer le `fetchMessages()` systématique après `markAllAsRead`, ou le rendre conditionnel seulement si une vraie mise à jour a été faite.

2. Corriger `send-sms`
- Remplacer l’appel RPC fautif par une gestion correcte du retour `const { error } = await supabase.rpc(...)`.
- Conserver la logique multi-provider existante.
- Ajouter un log clair du provider SMS réellement utilisé pour valider que Brevo est bien pris en compte après le fix.

3. Sécuriser le routage Brevo
- Vérifier que la config déchiffrée Brevo contient bien les champs attendus (`api_key`, `sender_name`).
- Rendre les erreurs Brevo plus explicites côté réponse backend si la clé, l’expéditeur ou l’API renvoient une erreur.

4. Vérification après correction
- Tester un envoi SMS depuis l’interface SAV.
- Vérifier que la console n’affiche plus le message en boucle.
- Vérifier dans les logs Edge Function que `send-sms` passe bien sur `brevo_sms` et ne tombe plus avant routage.
- Vérifier qu’un échec éventuel Brevo affiche enfin la vraie cause au lieu d’un 500 générique.

Fichiers à modifier
- `src/hooks/useMessaging.ts`
- `src/components/sav/MessagingInterface.tsx`
- `supabase/functions/send-sms/index.ts`

Impact attendu
- arrêt immédiat du log quasi infini
- baisse de la charge inutile côté UI / base
- remise en service de l’envoi SMS
- validation réelle de votre configuration Brevo
