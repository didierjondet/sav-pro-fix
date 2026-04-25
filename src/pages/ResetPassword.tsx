import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);

  useEffect(() => {
    // Supabase fournit le token soit via le hash (#access_token=...&type=recovery)
    // soit via la session déjà créée par le SDK lors du chargement.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
      }
    });

    // Vérifier après un court délai si la session de récupération est en place.
    const checkTimer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
      } else {
        // Pas de session ni d'event recovery → lien invalide / expiré
        setLinkInvalid(true);
      }
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(checkTimer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit contenir au moins 6 caractères', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({ title: 'Mot de passe réinitialisé', description: 'Vous êtes maintenant connecté.' });
      // Après reset, l'utilisateur a une session valide → on l'envoie au dashboard.
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center">Réinitialiser votre mot de passe</CardTitle>
          <CardDescription className="text-center">
            Saisissez un nouveau mot de passe pour votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkInvalid && !ready ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Ce lien de réinitialisation est invalide ou a expiré. Veuillez en redemander un.
              </p>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Retour à la connexion
              </Button>
            </div>
          ) : !ready ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Réinitialiser mon mot de passe'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
