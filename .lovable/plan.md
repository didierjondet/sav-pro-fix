

## Plan : Onboarding multi-etapes anime pour les nouveaux utilisateurs

### Ce qui existe
Le `ProfileSetup.tsx` est un formulaire statique avec des onglets "Creer / Rejoindre" sur une seule page. Pas d'animation, pas de parcours guide. Le `ShopNamePromptDialog` dans `Index.tsx` reste inchange (il apparait a la premiere connexion d'une boutique existante avec le nom par defaut).

### Ce qui change

**Remplacement complet de `src/components/auth/ProfileSetup.tsx`** par un parcours en 5 etapes animees. La logique metier (creation shop, recherche invite_code/slug, creation profil) reste identique.

**Etape 1 — Bienvenue**
- Ecran avec emoji festif, message "Bienvenue sur FixWay !" anime (fade-in + scale-in)
- Bouton "C'est parti !" pour demarrer

**Etape 2 — Informations personnelles**
- Prenom, nom, telephone (identique a aujourd'hui)
- Barre de progression en haut (etape 2/5)
- Transition animee entre etapes

**Etape 3 — Choix du parcours**
- Deux grandes cartes cote a cote avec effet hover-scale :
  - "Creer ma boutique" (icone Store)
  - "Rejoindre une boutique" (icone Users)
- Au clic, animation de selection puis passage a l'etape suivante

**Etape 4a — Creation boutique**
- Formulaire : nom du magasin, email, telephone, adresse
- Bouton "Creer" qui execute la meme logique `handleCreateShop`

**Etape 4b — Rejoindre boutique**
- Champ code d'invitation
- Bouton "Rejoindre" qui execute la meme logique `handleJoinShop`

**Etape 5 — Celebration**
- Si creation : animation confettis CSS + message "Votre boutique est prete !" + 3 mini-etapes illustrees (configurer types SAV, ajouter pieces, inviter equipe) + bouton "Decouvrir mon espace"
- Si rejoindre : animation feu d'artifice CSS + message "Bienvenue dans l'equipe !" + bouton "Entrer"
- Apres 3 secondes ou au clic, appel `onComplete()`

### Fichiers modifies

1. **`src/components/auth/ProfileSetup.tsx`** — rewrite complet (multi-etapes avec state `step`, animations CSS)
2. **`tailwind.config.ts`** — ajout des keyframes `confetti` et `firework` pour les animations de celebration

### Ce qui ne change PAS
- `ShopNamePromptDialog` dans `Index.tsx` — conserve tel quel (apparait si le shop s'appelle "Mon Magasin")
- Toute la logique Supabase (creation shop, profil, recherche invite_code)
- Les roles attribues (admin pour createur, technician pour rejoignant)

