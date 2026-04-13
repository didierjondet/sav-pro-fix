

## Plan : Ajouter la creation directe d'utilisateur avec email + mot de passe

### Contexte
Le formulaire actuel n'envoie qu'une invitation par email. L'edge function `admin-user-management` supporte deja l'action `create` avec email + mot de passe. La variable `newUserPassword` existe deja dans le state (ligne 98) mais n'est pas utilisee.

### Modification unique : `src/components/admin/ShopManagementDialog.tsx`

1. **Ajouter des champs** : prenom, nom, mot de passe dans le formulaire (+ variables state `newUserFirstName`, `newUserLastName`)

2. **Ajouter un choix** : deux boutons ou un switch pour choisir entre "Creer directement" (avec mot de passe) et "Envoyer une invitation" (existant)

3. **Nouvelle fonction `handleCreateUserDirect`** : appelle `admin-user-management` avec action `create`, email, password, first_name, last_name, role, shop_id

4. **UI** : Le formulaire affiche conditionnellement le champ mot de passe. Si mot de passe rempli → creation directe. Sinon → invitation par email (comportement actuel)

### Detail technique

```tsx
// Nouveaux states
const [newUserFirstName, setNewUserFirstName] = useState('');
const [newUserLastName, setNewUserLastName] = useState('');

// Logique du bouton : si mot de passe rempli → creation directe
const handleCreateOrInvite = async () => {
  if (newUserPassword) {
    // Creation directe via admin-user-management
    await supabase.functions.invoke('admin-user-management', {
      body: {
        action: 'create',
        email: newUserEmail,
        password: newUserPassword,
        first_name: newUserFirstName,
        last_name: newUserLastName,
        role: newUserRole,
        shop_id: shop.id
      }
    });
  } else {
    // Invitation par email (code existant)
    handleCreateUser();
  }
};
```

### Ce qui ne change pas
- L'invitation par email reste fonctionnelle
- L'edge function `admin-user-management` n'est pas modifiee
- Les autres onglets du dialog restent identiques

