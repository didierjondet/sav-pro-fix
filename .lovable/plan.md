

## Plan : Rendre la scrollbar du HelpBot visible et utilisable

### Problème
La `ScrollArea` de Radix utilise une scrollbar très fine (`w-2.5` = 10px) avec une couleur `bg-border` quasi invisible. De plus, elle ne s'affiche que au survol par défaut sur certains navigateurs, rendant impossible la navigation dans la conversation.

### Correction (1 fichier : `src/components/help/HelpBot.tsx`)

Remplacer le `<ScrollArea>` Radix par un simple `div` avec `overflow-y-auto` et un style de scrollbar personnalisé visible en permanence. C'est plus fiable et garantit une barre de défilement toujours visible et utilisable (souris + tactile).

```tsx
// Remplacer :
<ScrollArea className="flex-1 min-h-0 max-h-[calc(100vh-12rem)] sm:max-h-[380px]">
  <div className="p-4 space-y-3">
    ...
  </div>
</ScrollArea>

// Par :
<div className="flex-1 min-h-0 max-h-[calc(100vh-12rem)] sm:max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
  <div className="p-4 space-y-3">
    ...
  </div>
</div>
```

Ajouter aussi dans `src/index.css` les styles CSS pour la scrollbar personnalisée du bot (webkit + Firefox) afin qu'elle soit visible, arrondie, et cliquable sur tous les navigateurs.

### Fichiers impactés
- `src/components/help/HelpBot.tsx` — remplacer ScrollArea par div scrollable
- `src/index.css` — ajouter les styles scrollbar custom

