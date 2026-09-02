import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function MFARecoveryDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-recovery', {
        body: { email, password, backupCode },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      toast({
        title: 'Double authentification retirée',
        description: 'Reconnectez-vous, puis réactivez-la depuis Réglages > Sécurité.',
      });
      setOpen(false);
      await supabase.auth.signOut();
      window.location.replace('/auth');
    } catch (err: any) {
      toast({ title: 'Échec de la récupération', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="link" className="w-full text-xs">
          J'ai perdu mon téléphone — utiliser un code de secours
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Récupération d'accès</DialogTitle>
          <DialogDescription>
            Saisissez vos identifiants et l'un de vos codes de secours. La double authentification sera
            désactivée et devra être réactivée ensuite.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="rec-email">Email</Label>
            <Input id="rec-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-pass">Mot de passe</Label>
            <Input id="rec-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-code">Code de secours</Label>
            <Input
              id="rec-code"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
              placeholder="XXXXX-XXXXX"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>Valider</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default MFARecoveryDialog;
