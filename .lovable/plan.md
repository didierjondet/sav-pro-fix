
## Plan : Ajouter une info-bulle explicative sur la page Chat clients

### Modification

**`src/pages/ClientChats.tsx`** — Ajouter un petit bandeau informatif sous le compteur de chats / bouton son, avant la liste des conversations. Utiliser le composant `Alert` existant avec l'icône `Info` pour afficher une phrase concise :

> "Les conversations restent ouvertes tant que le dossier SAV est actif, afin de ne manquer aucun échange."

### Emplacement

Juste après le bloc `<div className="flex items-center justify-between">` (son activé / nombre de chats) et avant le `<ScrollArea>`, insérer un `<Alert>` discret (variante par défaut, petite taille) avec cette phrase.

### Fichier impacté
- `src/pages/ClientChats.tsx` — ajout d'un import `Alert` + `AlertDescription` + icône `Info`, et insertion du bandeau (~5 lignes)
