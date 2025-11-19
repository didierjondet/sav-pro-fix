import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
}

export function SecurityCodesSection({ codes, onChange, stepNumber }: SecurityCodesSectionProps) {
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
        {/* Code de déverrouillage */}
        <div>
          <Label htmlFor="unlock-code">Code de déverrouillage (max 8 caractères)</Label>
          <Input
            id="unlock-code"
            type="text"
            maxLength={8}
            value={codes.unlock_code}
            onChange={(e) => {
              // Accepter uniquement les caractères alphanumériques
              const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
              onChange({...codes, unlock_code: value});
            }}
            placeholder="Ex: ABC12345"
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
                type="email"
                value={codes.icloud_id}
                onChange={(e) => onChange({...codes, icloud_id: e.target.value})}
                placeholder="email@icloud.com"
              />
            </div>
            <div>
              <Label htmlFor="icloud-password" className="text-sm">Mot de passe iCloud</Label>
              <Input
                id="icloud-password"
                type="password"
                value={codes.icloud_password}
                onChange={(e) => onChange({...codes, icloud_password: e.target.value})}
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        {/* Code PIN SIM */}
        <div>
          <Label htmlFor="sim-pin">Code PIN carte SIM (4 chiffres)</Label>
          <Input
            id="sim-pin"
            type="text"
            maxLength={4}
            value={codes.sim_pin}
            onChange={(e) => {
              // Ne garder que les chiffres
              const value = e.target.value.replace(/\D/g, '');
              onChange({...codes, sim_pin: value});
            }}
            placeholder="1234"
          />
        </div>
      </CardContent>
    </Card>
  );
}
