# Comprendre et corriger l'abandon après inscription

## Constat (données réelles, 6 derniers mois)
- 17 magasins inscrits.
- 6 ont créé au moins un client, 3 seulement ont créé un SAV, aucun n'a atteint 5 SAV.
- 2 magasins seulement ont un utilisateur revenu plus d'un jour après l'inscription.
- Conclusion : la perte se fait dès la première session, avant le premier SAV. Ce n'est pas un problème de prix, c'est un problème de démarrage.

## Causes probables
1. Trop de choses à configurer avant d'être utile (types SAV, statuts, pièces, paramètres en 18 onglets).
2. Pas de « premier succès » rapide : l'utilisateur ne voit pas en 2 minutes ce que le logiciel lui apporte.
3. Interface vide au départ : aucun exemple, rien à manipuler.
4. Aucune relance après inscription (e-mail J+1, J+3, J+7).
5. On ne demande jamais pourquoi la personne part.

## Solutions proposées

### 1. Mesurer le cheminement (indispensable)
- Suivre les étapes clés : inscription, magasin créé, 1er client, 1er SAV, 1er SMS, 1er devis, retour à J+1/J+7, abonnement.
- Tableau « Entonnoir d'activation » dans Super Admin : où chaque inscrit s'arrête, liste des magasins bloqués par étape.
- Replays de sessions des nouveaux inscrits pour voir où ils hésitent.

### 2. Capter les raisons
- Mini-questionnaire à l'inscription : « Combien de SAV par mois ? Quel outil utilisez-vous aujourd'hui ? ».
- Petite question en un clic si inactif 3 jours (e-mail) : « Trop complexe / Pas le temps / Il manque une fonction / Pas pour moi / Autre ».
- Bouton « Une question ? » visible les 7 premiers jours.

### 3. Simplifier le démarrage
- Après inscription, aller directement à « Créez votre premier SAV en 1 minute » (configuration par défaut prête : types et statuts préremplis).
- Checklist de démarrage de 5 étapes visible sur le tableau de bord, avec barre de progression.
- Option « SAV d'exemple » pour découvrir sans rien saisir.
- Vue simplifiée par défaut pour les nouveaux comptes ; paramètres avancés masqués au début.

### 4. Relancer
- E-mails automatiques : J+1 (aide pour le premier SAV), J+3 (question sur la raison), J+7 (rappel des bénéfices), envoyés seulement si l'étape n'est pas faite.

## Ordre conseillé
1. Mesure + entonnoir Super Admin (pour avoir des preuves).
2. Questionnaire de raison + relances.
3. Démarrage simplifié et checklist.

## Détails techniques
- Événements `project.*` (signup_completed, shop_created, first_customer, first_sav_created, first_sms_sent, first_quote, subscription_started) via `window.__lovableEvents`, déclarés dans `.lovable/events.json`.
- Entonnoir Super Admin calculé en base (RPC SECURITY DEFINER super admin) à partir de shops, customers, sav_cases, auth.users.last_sign_in_at.
- Table `churn_feedback` (shop_id, raison, commentaire) + page publique token pour la réponse en un clic.
- Edge function planifiée `onboarding-nudges` (J+1/J+3/J+7) via le fournisseur e-mail existant.
- Valeurs par défaut créées à la création du magasin ; composant `OnboardingChecklist` sur le tableau de bord.
