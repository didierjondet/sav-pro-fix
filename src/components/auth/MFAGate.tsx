import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMFA } from '@/hooks/useMFA';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck } from 'lucide-react';

export function MFAGate({ children }: { children: React.ReactNode }) {
  const { needsChallenge, loading, challengeAndVerify } = useMFA();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading || !needsChallenge) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await challengeAndVerify(code);
    } catch (err: any) {
      toast({ title: 'Code incorrect', description: err.message ?? 'Réessayez', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Vérification en deux étapes
          </CardTitle>
          <CardDescription>
            Saisissez le code à 6 chiffres de votre application d'authentification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-challenge">Code de vérification</Label>
              <Input
                id="mfa-challenge"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
              Vérifier
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => signOut()}>
              Se déconnecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default MFAGate;
