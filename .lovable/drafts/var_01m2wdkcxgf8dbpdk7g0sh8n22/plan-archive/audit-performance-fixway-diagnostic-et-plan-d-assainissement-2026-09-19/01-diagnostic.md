# Audit performance Fixway — diagnostic et plan d'assainissement

## Ce que montrent les mesures

Vos données sont petites : 1 566 dossiers SAV, 1 727 messages, 862 pièces, 665 clients. Rien de tout cela ne devrait être lent.

Le problème n'est pas le volume, c'est le **nombre d'appels au serveur** :

| Requête | Nombre d'appels | Temps moyen |
|---|---|---|
| Messages d'un dossier | 18 000 000 | 0,6 ms |
| Liste des dossiers (barre latérale) | 2 770 000 | 15 ms |
| Messages non lus | 2 740 000 | 2,7 ms |
| Pièces d'un dossier | 261 000 | **517 ms** |
| Notifications non lues | 137 000 | **682 ms** |

Chaque requête est simple, mais elles sont si nombreuses que le serveur sature : les temps moyens montent à 0,5 – 3 secondes et certaines atteignent 8 secondes (limite d'expiration).

## Les trois symptômes s'expliquent par la même cause

1. **Lenteur des mises à jour** : l'application se rafraîchit en boucle (toutes les 10 s, 15 s, 30 s selon les écrans), ce qui sature le serveur et rend chaque rafraîchissement plus lent.
2. **Perte apparente des données en quittant un dossier** : quand une requête dépasse le délai, le code actuel renvoie **une liste vide au lieu d'une erreur**. L'écran affiche donc « aucune donnée » et la valeur vide remplace ce qui était en mémoire — y compris après rechargement tant que le serveur reste saturé.
3. **Tableau de bord et prix pièces qui s'affichent en retard** : chaque widget lance sa propre requête, sans priorité, dans la file d'attente déjà encombrée.
