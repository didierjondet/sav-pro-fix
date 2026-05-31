## Correction upload photos retour matériel de prêt

### Problème
L'erreur "Bucket not found" vient du fait que le bucket `loaner-photos` n'existe pas dans Supabase Storage. Le composant `LoanerConditionPhotos` essaie d'uploader vers un bucket qui n'a jamais été créé.

### 1. Migration base de données (création bucket privé)

Création du bucket `loaner-photos` **privé** (pas public), avec des policies isolées qui ne touchent à **aucune autre policy existante** :

- Bucket privé (`public = false`) → accès uniquement via URLs signées (déjà utilisé dans le code via `createSignedUrl`)
- Limite 2 Mo / fichier, MIME `image/*`
- 4 nouvelles policies sur `storage.objects` scopées **uniquement** au bucket `loaner-photos` :
  - SELECT/INSERT/UPDATE/DELETE réservés aux utilisateurs authentifiés dont le `shop_id` correspond au premier segment du chemin (`{shop_id}/uuid.jpg`)
- Vérification via la fonction `get_current_user_shop_id()` déjà existante dans le projet

**Aucune policy publique existante n'est modifiée ou supprimée.** Les pages publiques (QuotePublic, TrackSAV, Satisfaction, RDV) n'utilisent pas ce bucket et continueront de fonctionner normalement.

### 2. Capture photo sur smartphone

Dans `src/components/settings/loaner/LoanerConditionPhotos.tsx`, ajout de l'attribut `capture="environment"` sur le `<input type="file">` :
- Sur mobile : ouvre directement l'appareil photo arrière
- Sur desktop : comportement inchangé (sélecteur de fichier classique, l'attribut est ignoré)

### Détails techniques

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('loaner-photos', 'loaner-photos', false, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/heic']);

CREATE POLICY "loaner_photos_select_own_shop" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'loaner-photos' 
         AND (storage.foldername(name))[1] = get_current_user_shop_id()::text);
-- + INSERT / UPDATE / DELETE équivalents
```

### Hors scope
- Aucune autre policy storage modifiée
- Aucun changement sur les pages publiques
- Aucun changement de logique métier
