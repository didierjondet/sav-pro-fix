import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { generateBackupCodes, useMFA } from '@/hooks/useMFA';
import { Copy, Download, ShieldCheck, Smartphone } from 'lucide-react';

interface MFASetupProps {
  onDone?: () => void;
  compact?: boolean;
}

export function MFASetup({ onDone, compact }: MFASetupProps) {
  const { enroll, verifyEnrollment, saveBackupCodes } = useMFA();
  const { toast } = useToast();
  const [step, setStep] = useState<'idle' | 'scan' | 'codes'>('idle');
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const start = async () => {
    setBusy(true);
    try {
      const res = await enroll(`Fixway ${new Date().toLocaleDateString('fr-FR')}`);
      setFactorId(res.factorId);
      setQr(res.qrCode);
      setSecret(res.secret);
      setStep('scan');
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message ?? "Impossible de démarrer l'activation", variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!factorId) return;
    setBusy(true);
    try {
      await verifyEnrollment(factorId, code);
      const codes = generateBackupCodes(8);
      await saveBackupCodes(codes);
      setBackupCodes(codes);
      setStep('codes');
      toast({ title: 'Double authentification activée' });
    } catch (e: any) {
      toast({ title: 'Code incorrect', description: e.message ?? 'Vérifiez le code à 6 chiffres', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast({ title: 'Codes copiés' });
  };

  const downloadCodes = () => {
    const blob = new Blob([`Codes de secours Fixway\n\n${backupCodes.join('\n')}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fixway-codes-secours.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const body = (
    <div className="space-y-4">
      {step === 'idle' && (
        <>
          <p className="text-sm text-muted-foreground">
            Protégez votre compte avec une application d'authentification (Google Authenticator, Authy,
            1Password…). Un code à 6 chiffres vous sera demandé à chaque connexion.
          </p>
          <Button onClick={start} disabled={busy}>
            <Smartphone className="h-4 w-4 mr-2" />
            Activer la double authentification
          </Button>
        </>
      )}

      {step === 'scan' && (
        <>
          <p className="text-sm text-muted-foreground">
            1. Scannez ce QR code avec votre application d'authentification.
          </p>
          {qr && (
            <div className="flex justify-center">
              <img src={qr} alt="QR code de double authentification" className="h-48 w-48 bg-white rounded-md p-2" />
            </div>
          )}
          {secret && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Ou saisissez cette clé manuellement :</p>
              <code className="text-xs break-all">{secret}</code>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="mfa-code">2. Saisissez le code à 6 chiffres affiché</Label>
            <Input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={confirm} disabled={busy || code.length < 6}>Valider</Button>
            <Button variant="ghost" onClick={() => setStep('idle')} disabled={busy}>Annuler</Button>
          </div>
        </>
      )}

      {step === 'codes' && (
        <>
          <Alert>
            <AlertDescription>
              Conservez ces 8 codes de secours en lieu sûr (hors de l'application). Chacun ne peut servir
              qu'une seule fois si vous perdez votre téléphone.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((c) => (
              <div key={c} className="rounded-md border px-3 py-2 text-center">{c}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyCodes}><Copy className="h-4 w-4 mr-2" />Copier</Button>
            <Button variant="outline" onClick={downloadCodes}><Download className="h-4 w-4 mr-2" />Télécharger</Button>
            <Button onClick={() => onDone?.()}>Terminer</Button>
          </div>
        </>
      )}
    </div>
  );

  if (compact) return body;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Double authentification
        </CardTitle>
        <CardDescription>Sécurisez l'accès à votre compte Fixway</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

export default MFASetup;
