import { useId } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Lock, AlertCircle } from 'lucide-react';

export interface SecurityCodes {
  unlock_code: string;
  icloud_id: string;
  icloud_password: string;
  sim_pin: string;
}

interface SecurityCodesSectionProps {
  codes: SecurityCodes;
  onChange: (codes: SecurityCodes) => void;
  stepNumber: number;
  noCode?: boolean;
  onNoCodeChange?: (val: boolean) => void;
}

export function SecurityCodesSection({ codes, onChange, stepNumber, noCode = false, onNoCodeChange }: SecurityCodesSectionProps) {
  const uid = useId().replace(/:/g, '');
  // Noms aléatoires pour éviter le matching des password managers
  const fieldNames = {
    unlock: `f_${uid}_a`,
    icloudId: `f_${uid}_b`,
    icloudPwd: `f_${uid}_c`,
    simPin: `f_${uid}_d`,
  };

  const noAutofillProps = {
    autoComplete: 'off' as const,
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    'data-form-type': 'other',
    'data-lpignore': 'true',
    'data-1p-ignore': 'true',
  };

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader className="relative">
        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shadow-lg">
          {stepNumber}
        </div>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-orange-600" />
          Codes de sécurité
        </CardTitle>
        <Alert className="mt-2 border-orange-300 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            ⚠️ Ces codes seront <strong>automatiquement supprimés</strong> lorsque le SAV 
            sera marqué comme <strong>Prêt</strong> ou <strong>Annulé</strong> pour des raisons de sécurité.
          </AlertDescription>
        </Alert>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Honeypot pour absorber l'autofill */}
        <div style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }} aria-hidden="true">
          <input type="text" name="username" tabIndex={-1} autoComplete="username" />
          <input type="password" name="password" tabIndex={-1} autoComplete="current-password" />
        </div>

        {/* Code de déverrouillage */}
        <div>
          <Label htmlFor="unlock-code">Code de déverrouillage (max 8 caractères)</Label>
          <Input
            id="unlock-code"
            name={fieldNames.unlock}
            type="text"
            maxLength={8}
            value={codes.unlock_code}
            onChange={(e) => {
              const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
              onChange({...codes, unlock_code: value});
            }}
            placeholder="Ex: ABC12345"
            {...noAutofillProps}
          />
        </div>

        {/* Compte iCloud */}
        <div className="space-y-2">
          <Label className="font-semibold text-base">Compte iCloud</Label>
          <div className="pl-4 space-y-3">
            <div>
              <Label htmlFor="icloud-id" className="text-sm">Identifiant iCloud</Label>
              <Input
                id="icloud-id"
                name={fieldNames.icloudId}
                type="text"
                value={codes.icloud_id}
                onChange={(e) => onChange({...codes, icloud_id: e.target.value})}
                placeholder="mail@gmail.com"
                {...noAutofillProps}
              />
            </div>
            <div>
              <Label htmlFor="icloud-password" className="text-sm">Mot de passe iCloud</Label>
              <Input
                id="icloud-password"
                name={fieldNames.icloudPwd}
                type="text"
                style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                value={codes.icloud_password}
                onChange={(e) => onChange({...codes, icloud_password: e.target.value})}
                placeholder="mot de passe"
                {...noAutofillProps}
              />
            </div>
          </div>
        </div>

        {/* Code PIN SIM */}
        <div>
          <Label htmlFor="sim-pin">Code PIN carte SIM (4 à 6 chiffres)</Label>
          <Input
            id="sim-pin"
            name={fieldNames.simPin}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={codes.sim_pin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              onChange({...codes, sim_pin: value});
            }}
            placeholder="123456"
            {...noAutofillProps}
          />
        </div>
      </CardContent>
    </Card>
  );
}
