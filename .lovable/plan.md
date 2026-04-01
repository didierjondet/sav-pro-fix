

## Plan : Corriger le tracking des visites et ajouter le QR code dans les détails du dossier

### Problème 1 : Les visites ne sont pas enregistrées

La page `SimpleTrack.tsx` (accessible via `/track/:slug`, celle utilisée par les QR codes) ne contient **aucun appel** à `recordVisit()` ou à la RPC `record_sav_visit`. Cette fonction existe uniquement dans `TrackSAV.tsx` (l'ancienne page de tracking). Le compteur de visites reste donc toujours à 0.

**Correction** : Ajouter dans `SimpleTrack.tsx` un appel à `supabase.rpc('record_sav_visit', ...)` dans le `useEffect` initial, identique à celui de `TrackSAV.tsx`.

### Problème 2 : QR code absent de la section "Détails du dossier"

Actuellement le QR code n'est accessible que via un bouton qui ouvre un onglet externe. Il n'est pas affiché directement dans le dossier SAV.

**Correction** : Ajouter dans la Card "Détails du dossier" (`SAVDetail.tsx`, après la date de modification) une image QR code inline via l'API `api.qrserver.com`, avec le lien de suivi en dessous.

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/pages/SimpleTrack.tsx` | Ajouter `recordVisit()` avec appel RPC `record_sav_visit` dans le useEffect au chargement |
| `src/pages/SAVDetail.tsx` | Ajouter une section QR code (image inline) dans la Card "Détails du dossier" |

### Détail technique

**SimpleTrack.tsx** — ajouter après `fetchSAVCase()` dans le useEffect :
```typescript
const recordVisit = async () => {
  if (!slug) return;
  try {
    const userAgent = navigator.userAgent;
    await supabase.rpc('record_sav_visit', {
      p_tracking_slug: slug,
      p_visitor_ip: null,
      p_visitor_user_agent: userAgent
    });
  } catch (error) {
    console.error('Error recording visit:', error);
  }
};
recordVisit();
```

**SAVDetail.tsx** — dans la CardContent "Détails du dossier", après le bloc `details_updated_at`, ajouter une section QR code avec l'image inline (128x128) et le lien texte en dessous, visible uniquement si `tracking_slug` existe.

