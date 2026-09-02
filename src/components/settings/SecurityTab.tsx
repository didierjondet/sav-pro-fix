import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMFA } from '@/hooks/useMFA';
import { useProfile } from '@/hooks/useProfile';
import { MFASetup } from '@/components/auth/MFASetup';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react';

export function SecurityTab() {
  const { actualProfile } = useProfile();
  const { factors, isEnabled, loading, unenroll, refresh } = useMFA();
  const { toast } = useToast();
  const [showSetup, setShowSetup] = useState(false);

  const isSuperAdmin = actualProfile?.role === 'super_admin';

  const remove = async (id: string) => {
    try {
      await unenroll(id);
      toast({ title: 'Double authentification désactivée' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEnabled ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-amber-600" />}
            Double authentification (2FA)
            {isEnabled && <Badge variant="outline" className="ml-2">Activée</Badge>}
          </CardTitle>
          <CardDescription>
            Compatible Google Authenticator, Authy, 1Password et toute application TOTP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSuperAdmin && !isEnabled && (
            <Alert variant="destructive">
              <AlertDescription>
                La double authentification est obligatoire pour le compte super admin.
              </AlertDescription>
            </Alert>
          )}

          {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

          {!loading && isEnabled && (
            <div className="space-y-2">
              {factors.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{f.friendly_name || 'Application d\'authentification'}</p>
                    <p className="text-xs text-muted-foreground">
                      Ajoutée le {new Date(f.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(f.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Retirer
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!loading && !isEnabled && !showSetup && (
            <Button onClick={() => setShowSetup(true)}>Activer la double authentification</Button>
          )}

          {!loading && !isEnabled && showSetup && (
            <MFASetup compact onDone={() => { setShowSetup(false); refresh(); }} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SecurityTab;
