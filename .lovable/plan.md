# Démarrage par type d'activité + étapes du bot fiables

## 0. À terminer d'abord (demande précédente)
La protection « deux magasins ne peuvent pas avoir le même nom » est déjà active en base. Il reste l'écran : message clair pendant la saisie du nom et bouton bloqué si le nom est pris.

## 1. Étapes du bot qui ne se valident pas
**Cause constatée :** le bot ne revérifie les étapes que toutes les minutes environ, et rien ne le prévient quand on crée un statut ou un type de SAV. D'où le besoin de recharger la page.
- Le bot se met à jour immédiatement dès qu'un statut, un type de SAV, une pièce, un fournisseur, un horaire ou un membre est ajouté ou modifié.
- Il revérifie aussi à chaque ouverture du panneau et au retour sur l'onglet.
- **Validation manuelle** : cliquer sur le rond d'une étape la coche (un second clic la décoche si elle a été cochée à la main).

## 2. Choix de l'activité à la création du magasin
Juste après le nom du magasin, un écran avec 5 grandes cartes :
- Réparateur téléphone
- Réparateur informatique
- Réparateur électroménager
- Réparateur console
- Réparateur audio
(+ « Je préfère partir de zéro »)

Le magasin est alors préparé automatiquement selon le métier : types de SAV, statuts, familles de produits, quelques pièces et fournisseurs adaptés.

## 3. Mode découverte avec données d'exemple
- Ajout de faux clients et de SAV d'exemple à différents stades (reçu, en réparation, pièce commandée, prêt, rendu), un devis, un rendez-vous, adaptés au métier choisi (ex. écran iPhone cassé / PC lent / lave-linge qui fuit / manette qui dérive / enceinte sans son).
- Bandeau visible en permanence : « Mode découverte : ces données sont fictives. Explorez librement. » avec un bouton « Passer à ma vraie boutique ».
- Les données d'exemple ne comptent pas dans les statistiques, ne consomment aucun SMS et aucun SMS/e-mail n'est envoyé à ces faux clients.

## 4. Passage à la vraie boutique
Bouton « Passer à ma vraie boutique » → fenêtre de confirmation :
- **Supprimé :** faux clients, SAV, devis, rendez-vous, messages d'exemple.
- **Conservé (cases cochables) :** statuts, types de SAV, familles de produits, pièces et fournisseurs d'exemple (décochés par défaut pour pièces/fournisseurs).
- Puis le bot reprend avec une configuration allégée : seules les étapes encore utiles restent (coordonnées du magasin, horaires, équipe, SMS).
- Proposition automatique après quelques jours ou dès que l'utilisateur crée son premier vrai SAV.

## 5. Avertissement rouge repoussé
L'avertissement « boutique supprimée si inactive » ne s'affiche plus pendant le mode découverte : il apparaît seulement après le passage à la vraie boutique.

## Détails techniques
- `useOnboardingProgress` : staleTime 0, refetch au focus/ouverture, invalidation `onboarding-counts` dans les mutations statuts/types/pièces/fournisseurs/horaires/membres ; détection des statuts sur tout changement (pas seulement `is_default=false`). Rond cliquable → `markStepSeen` / retrait.
- Nom unique : RPC `is_shop_name_available` (révoquer anon) avec délai de frappe dans `ShopNamePromptDialog`, `ProfileSetup`, `ShopManagementDialog` ; erreur 23505 traduite ; `src/lib/shopName.ts` + test.
- Colonnes `shops.activity_type`, `shops.demo_mode`; colonne `is_demo` sur customers, sav_cases, quotes, appointments, parts, suppliers.
- Modèles par métier dans `src/lib/activityTemplates.ts` (testé) ; RPC `seed_demo_shop(activity)` et `exit_demo_mode(keep_parts, keep_suppliers)` SECURITY DEFINER limitées à l'admin du magasin.
- `ShopCreationPolicyDialog` masqué tant que `shops.demo_mode` est vrai.
- Exclusion `is_demo` dans `savFinance.ts` et blocage des envois SMS/e-mail pour clients démo.
