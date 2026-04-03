

## Plan : Corriger le scroll et le responsive du HelpBot

### Probleme
1. **Scroll cassé** : `scrollRef` est placé sur le `div` intérieur, mais Radix ScrollArea scrolle via son propre `Viewport` interne. Donc `scrollRef.current.scrollTop = scrollHeight` ne fait rien — il faut scroller le viewport Radix, pas le div enfant.
2. **Pas responsive** : La largeur est fixée à `w-[380px]`, ce qui déborde sur mobile. Pas d'adaptation mobile.

### Correction (1 fichier : `src/components/help/HelpBot.tsx`)

1. Remplacer `scrollRef` sur le div intérieur par un scroll automatique via un élément sentinelle en bas de la liste (`<div ref={bottomRef} />`) avec `bottomRef.current.scrollIntoView({ behavior: 'smooth' })` — fonctionne avec n'importe quel conteneur scroll parent dont Radix.

2. Rendre le conteneur responsive :
   - `w-[380px]` → `w-[calc(100vw-2rem)] sm:w-[380px]` (pleine largeur mobile avec marge)
   - `max-h-[560px]` → `max-h-[calc(100vh-2rem)] sm:max-h-[560px]` (hauteur adaptée mobile)
   - `max-h-[380px]` sur ScrollArea → `max-h-[calc(100vh-12rem)] sm:max-h-[380px]`

### Fichier impacté
- `src/components/help/HelpBot.tsx`

