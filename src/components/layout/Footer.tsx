import { useAuth } from '@/contexts/AuthContext';

export function Footer() {
  const { forceReconnect } = useAuth();

  const handleEmergencyReset = async () => {
    if (window.confirm('⚠️ RESET COMPLET\n\nCela va vous déconnecter et nettoyer toutes les données en cache.\n\nContinuer ?')) {
      await forceReconnect();
    }
  };

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <p className="text-sm text-muted-foreground">
          © 2025 SAV Manager. Tous droits réservés.
        </p>
        
        {/* Bouton de reset d'urgence - discret */}
        <button
          onClick={handleEmergencyReset}
          className="text-xs text-muted-foreground/40 hover:text-destructive transition-colors"
          title="Reset d'urgence - À utiliser uniquement en cas de problème"
        >
          •
        </button>
      </div>
    </footer>
  );
}
