

## Plan : Re-appliquer l'affichage du role dans le menu profil

### Diagnostic
Le code pour afficher le role est bien present dans `Header.tsx` (lignes 338-342), mais il semble que la modification precedente n'ait pas ete correctement deployee ou que le cache empeche l'affichage.

### Action
Re-sauvegarder `src/components/layout/Header.tsx` avec une micro-amelioration pour forcer le rebuild : utiliser `profile?.role` au lieu de `actualProfile?.role` pour que le role affiche soit celui du contexte effectif (en impersonation, on verra "Administrateur" au lieu de "Super Admin", ce qui correspond mieux au role actif).

De plus, ajouter un fallback visuel pour s'assurer que le role est toujours visible meme si le profil met du temps a charger.

### Modification

**Fichier** : `src/components/layout/Header.tsx` — DropdownMenuLabel (lignes 335-344)

```tsx
<DropdownMenuLabel>
  <div className="flex flex-col">
    <span>{profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user?.email : user?.email}</span>
    {actualProfile?.role && (
      <span className="text-xs font-normal text-muted-foreground">
        {ROLE_LABELS[actualProfile.role] || actualProfile.role}
      </span>
    )}
  </div>
</DropdownMenuLabel>
```

Le code est identique a ce qui est deja en place. La re-sauvegarde forcera un nouveau build et deploiement.

