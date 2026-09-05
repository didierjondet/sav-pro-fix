# Faire fonctionner le suivi d'usage et la heatmap

## Ce que montre la vérification

Les deux tables de mesure sont vides : 0 page vue, 0 clic enregistré depuis leur création. Ce n'est donc pas un problème d'affichage — rien n'est jamais écrit. Les droits d'accès aux tables sont corrects, l'écriture se fait bien depuis l'application mais elle est envoyée « à l'aveugle » : si elle échoue, personne ne le sait, aucune erreur n'apparaît nulle part. Deux limites s'ajoutent : la mesure n'est active que sur les écrans internes une fois connecté (l'espace super admin, lui, n'est pas mesuré du tout), et la page vue n'est enregistrée qu'au moment où l'on quitte l'écran, ce qui perd la dernière page de chaque visite.

## Ce qui va être fait

1. **Rendre l'enregistrement fiable et visible**
   - L'envoi passe par une fonction serveur dédiée qui rattache elle-même l'utilisateur et le magasin, avec envoi groupé (une écriture pour plusieurs événements) au lieu d'une écriture par clic.
   - Les échecs ne sont plus silencieux : ils remontent dans la console et sont réessayés.
   - Un envoi de secours est déclenché à la fermeture de l'onglet pour ne plus perdre la dernière page consultée.

2. **Couvrir tous les écrans internes** (choix retenu : pas de mesure des pages publiques ni des visiteurs anonymes)
   - La mesure est déplacée à un niveau qui couvre aussi l'espace super admin et les écrans mobiles, tout en restant limitée aux utilisateurs connectés.

3. **Bandeau de diagnostic dans « Usage & activation »**
   - Affiche le nombre d'événements enregistrés sur 24 h et l'horodatage du dernier, pour vérifier d'un coup d'œil que la mesure tourne réellement.

4. **Heatmap exploitable** (choix retenu : points de chaleur + classement des boutons)
   - Calque de chaleur corrigé : positions calculées sur la hauteur réelle de la page, rendu dans un cadre au format de l'appareil sélectionné (ordinateur / mobile), dégradé rouge-jaune plus lisible.
   - Sous le calque, un classement des éléments les plus cliqués (nom du bouton ou du lien, nombre de clics) — c'est ce qui dit concrètement où les gens s'arrêtent.
   - Choix de la page indépendant du tableau des pages, message clair quand aucune donnée n'existe encore.

5. **Purge automatique** des événements de plus de 12 mois, comme prévu au départ.

## Point important

Les données ne remonteront que pour les utilisateurs qui ouvrent l'application **après** la mise en ligne de cette correction. Il faudra donc republier le site, puis compter quelques jours d'usage avant que le tableau et la heatmap deviennent parlants.

## Détails techniques

- Nouvelle fonction `record_usage_events(_events jsonb)` en `security definer`, `search_path = public`, qui insère dans `usage_page_views` / `usage_click_events` en dérivant `user_id` de `auth.uid()` et le `shop_id` depuis `profiles` ; `GRANT EXECUTE` à `authenticated` uniquement, `REVOKE` pour `anon`.
- `useUsageTracking` : file d'attente en mémoire, `flush` toutes les 10 s + sur `visibilitychange`/`pagehide` (`navigator.sendBeacon` en secours), échantillonnage des clics conservé, chemins toujours normalisés (aucun identifiant de dossier stocké).
- Hook remonté dans un composant de suivi monté sous le `Router` et conditionné à la présence d'une session, afin de couvrir `/super-admin` et `/m/*`.
- `get_usage_heatmap` : ajout du regroupement par `element_label` et retour d'un second jeu de données `get_usage_click_labels(_path, _days, _device)`.
- Nouvelle fonction `get_usage_tracking_health()` (24 h : compteurs et dernier horodatage) pour le bandeau de diagnostic.
- Tâche de purge SQL des lignes de plus de 12 mois.
