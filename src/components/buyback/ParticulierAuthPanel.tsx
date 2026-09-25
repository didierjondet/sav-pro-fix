import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  /** Chemin où revenir après Google / confirmation e-mail */
  returnPath: string;
  /** Appelé juste avant de quitter la page (Google) pour sauvegarder la saisie */
  beforeRedirect?: () => Promise<void> | void;
  defaultTab?: 'signup' | 'signin';
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

/** Connexion / création du compte particulier Fixway (Google ou e-mail + mot de passe) */
export function ParticulierAuthPanel({ returnPath, beforeRedirect, defaultTab = 'signup' }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');

  const redirectUrl = `${window.location.origin}${returnPath}`;

  const google = async () => {
    setLoading(true);
    try {
      await beforeRedirect?.();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (e: any) {
      toast({ title: 'Connexion Google impossible', description: e.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  const signUp = async () => {
    if (!email.trim() || password.length < 8) {
      toast({ title: 'E-mail et mot de passe (8 caractères minimum) requis', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await beforeRedirect?.();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectUrl, data: { account_type: 'particulier' } },
      });
      if (error) throw error;
      if (!data.session) {
        setInfo("Compte créé : ouvrez l'e-mail de confirmation que nous venons de vous envoyer. Votre demande est gardée, vous la retrouverez en revenant ici.");
      }
    } catch (e: any) {
      toast({ title: 'Création du compte impossible', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (e: any) {
      toast({ title: 'Connexion impossible', description: 'E-mail ou mot de passe incorrect.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      toast({ title: 'Indiquez votre e-mail', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast({ title: 'Envoi impossible', description: error.message, variant: 'destructive' });
    else setInfo('Un e-mail pour choisir un nouveau mot de passe vient de vous être envoyé.');
  };

  if (info) {
    return <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">{info}</div>;
  }

  const fields = (
    <div className="grid gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="pa-email">E-mail</Label>
        <Input id="pa-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pa-pass">Mot de passe</Label>
        <Input id="pa-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" className="w-full" onClick={google} disabled={loading}>
        <GoogleIcon />Continuer avec Google
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />ou<div className="h-px flex-1 bg-border" />
      </div>
      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signup">Créer mon compte</TabsTrigger>
          <TabsTrigger value="signin">J'ai déjà un compte</TabsTrigger>
        </TabsList>
        <TabsContent value="signup" className="space-y-3 pt-2">
          {fields}
          <Button type="button" className="w-full" onClick={signUp} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Créer mon compte
          </Button>
        </TabsContent>
        <TabsContent value="signin" className="space-y-3 pt-2">
          {fields}
          <Button type="button" className="w-full" onClick={signIn} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Me connecter
          </Button>
          <button type="button" className="text-xs text-primary underline" onClick={forgot}>
            Mot de passe oublié ?
          </button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
