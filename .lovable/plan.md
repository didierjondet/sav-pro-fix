
Objectif urgent : rétablir les SMS et supprimer le faux diagnostic sur le secret téléphone.

Diagnostic confirmé
- Le secret `TWILIO_PHONE_NUMBER` existe bien. Les logs montrent même qu’il est lu par la fonction et utilisé comme expéditeur : `From: +18146486990`.
- Le vrai problème est ailleurs : `send-sms` reçoit de Twilio une erreur `401 Authenticate` avec le code Twilio `20003`.
- Donc le bug n’est pas le numéro téléphone, ni le format du SMS, ni la fermeture du SAV.
- La cause la plus probable est l’authentification du connecteur Twilio lié au projet (`Fixway`) : token invalide, connexion cassée, autorisation à reconnecter, ou secret géré par connecteur devenu invalide.
- Les fonctions `twilio-balance`, `sync-twilio-credits` et `check-sms-credits` utilisent exactement le même couple `LOVABLE_API_KEY + TWILIO_API_KEY` vers la même gateway Twilio. Si `send-sms` est en 401, il faut vérifier tout le bloc Twilio, pas seulement l’envoi SMS.

Plan de correction
1. Vérifier et retester tout le bloc Twilio
- Tester `send-sms`, `twilio-balance`, `sync-twilio-credits` et `check-sms-credits` sur les fonctions déployées.
- Lire leurs logs pour confirmer si le `401 Authenticate` est global.
- Si confirmé, lancer une reconnexion du connecteur Twilio `Fixway` au projet, car ce type d’erreur ne se corrige pas par du code seul.

2. Corriger la robustesse backend des fonctions Twilio
- `supabase/functions/send-sms/index.ts`
  - conserver la logique métier actuelle
  - ne plus transformer toutes les erreurs en simple `500`
  - renvoyer proprement les erreurs Twilio/auth (`401`, `403`, `429`, `503`) avec un JSON clair
  - ajouter un message explicite du type “connexion Twilio invalide ou expirée” quand la gateway renvoie `Authenticate`
- Aligner la même gestion d’erreur sur :
  - `supabase/functions/twilio-balance/index.ts`
  - `supabase/functions/sync-twilio-credits/index.ts`
  - `supabase/functions/check-sms-credits/index.ts`
- Résultat attendu : plus de panne “opaque”, et un diagnostic immédiat côté interface si la connexion Twilio est cassée.

3. Corriger le frontend pour ne plus afficher l’erreur générique
- `src/hooks/useSMS.ts`
  - extraire le vrai message renvoyé par l’edge function au lieu d’afficher seulement `Edge Function returned a non-2xx status code`
  - afficher un message précis selon le cas : auth Twilio, crédits épuisés, service indisponible, etc.
- `src/hooks/useTwilioCredits.ts`
  - même amélioration pour que le test du solde et la synchronisation remontent la vraie cause
- Résultat attendu : l’utilisateur voit enfin la vraie erreur utile.

4. Sécuriser les flux métier qui utilisent les SMS
- Vérifier et ajuster les écrans qui envoient des SMS :
  - `src/components/sav/SMSButton.tsx`
  - `src/components/dialogs/PrintConfirmDialog.tsx`
  - `src/components/agenda/AppointmentProposalDialog.tsx`
  - `src/components/sav/SAVCloseUnifiedDialog.tsx`
- Points à garantir :
  - aucun succès visuel si le SMS a échoué
  - aucune action métier critique bloquée inutilement par un SMS optionnel
  - clôture SAV toujours possible même si Twilio est indisponible
  - toasts cohérents et non trompeurs

5. Validation complète après correctif
- Tester de bout en bout :
  - envoi manuel depuis le bouton SMS
  - SMS lors de clôture SAV
  - SMS d’enquête de satisfaction
  - SMS de proposition de rendez-vous
  - SMS après création/impression SAV
  - récupération du solde Twilio
  - synchronisation des crédits Twilio
- Vérifier dans les logs que les réponses Twilio sont redevenues 2xx après reconnexion.
- Vérifier que les erreurs affichées en interface sont explicites si Twilio retombe en panne.

Détails techniques
- Fichiers principaux à modifier :
  - `supabase/functions/send-sms/index.ts`
  - `supabase/functions/twilio-balance/index.ts`
  - `supabase/functions/sync-twilio-credits/index.ts`
  - `supabase/functions/check-sms-credits/index.ts`
  - `src/hooks/useSMS.ts`
  - `src/hooks/useTwilioCredits.ts`
  - éventuellement les composants appelants listés ci-dessus
- Ce que je ne prévois pas de changer dans ce correctif urgent :
  - la logique de formatage des numéros
  - la logique de décompte des crédits SMS
  - la config IA Gemini, qui n’est pas la cause de ce bug SMS

Conclusion
- Le secret téléphone n’est pas la cause.
- Le point critique est la connexion/authentification Twilio.
- Le correctif doit combiner : reconnexion du connecteur + meilleure remontée d’erreurs backend/frontend + validation complète de tous les points d’envoi SMS.
