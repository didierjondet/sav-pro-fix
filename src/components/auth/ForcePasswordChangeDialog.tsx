import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ForcePasswordChangeDialogProps {
  onSuccess: () => void;
}

export function ForcePasswordChangeDialog({ onSuccess }: ForcePasswordChangeDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (!user) {
      toast({ title: 'Erreur', description: 'Utilisateur non identifié', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error: pwdError } = await supabase.auth.updateUser({ password });
      if (pwdError) throw pwdError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('user_id', user.id);
      if (profileError) throw profileError;

      toast({ title: 'Mot de passe mis à jour', description: 'Votre nouveau mot de passe est actif.' });
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => { /* non fermable */ }}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldAlert className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Changement de mot de passe requis</DialogTitle>
          <DialogDescription className="text-center">
            Pour sécuriser votre compte, vous devez choisir un nouveau mot de passe avant de continuer.
          </DialogDescription>
        </DialogHeader>
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mettre à jour mon mot de passe'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
