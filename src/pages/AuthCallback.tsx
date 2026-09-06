import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      // Erreur renvoyée par le fournisseur (query ou hash)
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const providerError =
        params.get('error_description') ||
        params.get('error') ||
        hash.get('error_description') ||
        hash.get('error');

      if (providerError) {
        if (!cancelled) setError(providerError);
        return;
      }

      // Laisser le temps à detectSessionInUrl de traiter le code
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          const simplified = localStorage.getItem('fixway_simplified_view') === 'true';
          navigate(simplified ? '/sav' : '/dashboard', { replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 250));
      }

      if (!cancelled) setError("La connexion n'a pas pu être finalisée.");
    };

    finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
      <div className="text-center space-y-4 max-w-md">
        {error ? (
          <>
            <h1 className="text-xl font-semibold">Connexion impossible</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/auth', { replace: true })}>
              Retour à la connexion
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Connexion en cours...</p>
          </>
        )}
      </div>
    </div>
  );
}
