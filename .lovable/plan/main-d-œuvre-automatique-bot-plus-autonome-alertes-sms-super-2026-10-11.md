# Main d'œuvre automatique + bot plus autonome + alertes SMS Super Admin

## 1. Diagnostic : main d'œuvre qui « se met toute seule » sur les devis

La ligne de main d'œuvre vient d'un réglage du magasin : **Paramètres → Facturation → TVA & MO → « Activer la facturation main d'œuvre »**. Quand il est actif, toute pièce ayant un « Coût MO » ou un « Temps » ajoute automatiquement une ligne MO au devis (et au SAV/PDF). Cet onglet n'est visible que des **admins** — d'où l'impression du prospect que la MO apparaît sans moyen de l'enlever.

**Réponse à donner au prospect** : Paramètres → Facturation → TVA & MO → désactiver « Activer la facturation main d'œuvre » → Enregistrer.

**Correctif** : dans le récapitulatif du devis (`BillingTotalsSummary`), quand une ligne MO automatique est affichée, ajouter une petite mention « Main d'œuvre ajoutée automatiquement — modifiable dans Paramètres → TVA & MO » avec un lien direct (admins uniquement). Aucun changement de calcul.

## 2. Bot Fixy plus autonome

Le bot a déjà des outils pour lire les historiques (SAV, clients, pièces, devis), mais son instruction ne l'oblige pas à les utiliser avant de répondre. Correctifs dans `supabase/functions/help-bot/index.ts` :

- **Règle renforcée** : avant toute réponse sur des données du magasin, le bot DOIT appeler l'outil correspondant (historiques compris) ; interdiction de répondre « je ne sais pas » sans avoir essayé au moins un outil.
- **Orientation paramètres** : pour toute question « comment faire / où régler », le bot cite le chemin exact (ex. Paramètres → Facturation → TVA & MO) au lieu de renvoyer vers une doc vague.

## 3. Option « Parler à un humain »

- Le bot propose spontanément le transfert quand il n'arrive pas à répondre, et répond à toute demande explicite (« je veux un humain », « être rappelé »).
- Il collecte alors **nom, téléphone et motif** dans la conversation, confirme au prospect qu'il sera rappelé.
- La demande est enregistrée (table `support_tickets` existante, type « rappel bot ») et déclenche immédiatement le SMS d'alerte (point 4).

## 4. SMS automatiques au Super Admin

Envoi d'un SMS au numéro du Super Admin dans deux cas :

- **Nouvelle inscription magasin** : nom du magasin, nom du responsable, e-mail, téléphone.
- **Demande d'humain via le bot** : nom du prospect, téléphone, motif résumé, magasin concerné — tout ce qu'il faut pour rappeler directement.

Mise en place :
- Champ « Numéro SMS d'alerte Super Admin » dans les réglages Super Admin (stocké dans `app_global_settings`), réutilisable et modifiable.
- Envoi via la fonction SMS existante (`send-sms` / configuration Twilio déjà en place), débité sur les crédits globaux.
- Déclencheurs : fonction d'inscription magasin existante + nouvelle branche « escalade » du bot.

## Détails techniques

- Fichiers : `src/components/billing/BillingTotalsSummary.tsx`, `supabase/functions/help-bot/index.ts`, réglages Super Admin, fonction d'inscription.
- Migration : aucune table nouvelle (réutilisation de `support_tickets` et `app_global_settings`).
- Vérification : compilation + test du bot (question historique, demande d'humain) et d'un SMS d'alerte.
- Prérequis : le numéro SMS d'alerte devra être renseigné une fois dans le Super Admin.
