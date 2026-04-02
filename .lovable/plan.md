

## Plan : Afficher le numéro de téléphone à côté de l'icône

### Problème
L'icône téléphone s'affiche seule sans le numéro — inutile pour l'utilisateur.

### Modification

**Fichier : `src/pages/SAVList.tsx`** (ligne 599-601)

Remplacer l'icône seule par l'icône + le numéro de téléphone cliquable (lien `tel:`):

```tsx
{savCase.customer?.phone && (
  <a href={`tel:${savCase.customer.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary shrink-0">
    <Phone className="h-4 w-4" />
    <span className="text-xs">{savCase.customer.phone}</span>
  </a>
)}
```

### Fichier impacté
- `src/pages/SAVList.tsx`

