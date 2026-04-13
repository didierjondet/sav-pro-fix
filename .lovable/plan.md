

## Plan : Afficher le role sous le nom dans le menu profil

### Modification unique

**Fichier** : `src/components/layout/Header.tsx`

Dans le `DropdownMenuLabel` (lignes 327-329), ajouter une ligne sous le nom affichant le role traduit en francais.

```tsx
<DropdownMenuLabel>
  <div className="flex flex-col">
    <span>{profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user?.email : user?.email}</span>
    {profile?.role && (
      <span className="text-xs font-normal text-muted-foreground">
        {ROLE_LABELS[profile.role] || profile.role}
      </span>
    )}
  </div>
</DropdownMenuLabel>
```

Avec un mapping des labels :
```ts
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  technician: 'Technicien',
  shop_admin: 'Admin Magasin',
  super_admin: 'Super Admin',
};
```

On utilisera `actualProfile?.role` (du hook `useProfile`) pour afficher le vrai role meme en mode impersonation.

### Ce qui ne change pas
- Aucune autre modification
- Le dropdown garde le meme comportement

