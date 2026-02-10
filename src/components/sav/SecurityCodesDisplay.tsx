import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Pencil, X, Check, ShieldOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityCodes {
  unlock_code?: string | null;
  icloud_id?: string | null;
  icloud_password?: string | null;
  sim_pin?: string | null;
}

interface SecurityCodesDisplayProps {
  savCase: {
    security_codes?: SecurityCodes | null;
  };
  onUpdate: (codes: SecurityCodes) => Promise<void>;
}

export function SecurityCodesDisplay({ savCase, onUpdate }: SecurityCodesDisplayProps) {
  const codes = savCase.security_codes as SecurityCodes | null;
  const hasAnyCodes = codes && (codes.unlock_code || codes.icloud_id || codes.icloud_password || codes.sim_pin);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editCodes, setEditCodes] = useState<SecurityCodes>({
    unlock_code: '',
    icloud_id: '',
    icloud_password: '',
    sim_pin: '',
  });
  const { toast } = useToast();

  const startEditing = () => {
    setEditCodes({
      unlock_code: codes?.unlock_code || '',
      icloud_id: codes?.icloud_id || '',
      icloud_password: codes?.icloud_password || '',
      sim_pin: codes?.sim_pin || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(editCodes);
      setIsEditing(false);
      toast({ title: 'Codes de sécurité mis à jour' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-orange-600" />
            Codes de sécurité
          </CardTitle>
          {!isEditing && (
            <Button variant="ghost" size="icon" onClick={startEditing} className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-2 p-3 rounded-lg border border-orange-300 bg-orange-50">
          <p className="text-sm text-orange-800 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Ces codes seront automatiquement supprimés lors de la livraison ou annulation du SAV.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div>
              <Label htmlFor="edit-unlock-code">Code de déverrouillage (max 8 caractères)</Label>
              <Input
                id="edit-unlock-code"
                maxLength={8}
                value={editCodes.unlock_code || ''}
                onChange={(e) => setEditCodes({ ...editCodes, unlock_code: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
                placeholder="Ex: ABC12345"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-base">Compte iCloud</Label>
              <div className="pl-4 space-y-3">
                <div>
                  <Label htmlFor="edit-icloud-id" className="text-sm">Identifiant iCloud</Label>
                  <Input
                    id="edit-icloud-id"
                    type="email"
                    value={editCodes.icloud_id || ''}
                    onChange={(e) => setEditCodes({ ...editCodes, icloud_id: e.target.value })}
                    placeholder="email@icloud.com"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-icloud-pwd" className="text-sm">Mot de passe iCloud</Label>
                  <Input
                    id="edit-icloud-pwd"
                    type="text"
                    value={editCodes.icloud_password || ''}
                    onChange={(e) => setEditCodes({ ...editCodes, icloud_password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-sim-pin">Code PIN carte SIM (4 chiffres)</Label>
              <Input
                id="edit-sim-pin"
                maxLength={4}
                value={editCodes.sim_pin || ''}
                onChange={(e) => setEditCodes({ ...editCodes, sim_pin: e.target.value.replace(/\D/g, '') })}
                placeholder="1234"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check className="h-4 w-4 mr-1" />
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            </div>
          </>
        ) : hasAnyCodes ? (
          <>
            {codes?.unlock_code && (
              <div>
                <Label className="text-sm text-muted-foreground">Code de déverrouillage</Label>
                <p className="font-mono text-lg font-semibold">{codes.unlock_code}</p>
              </div>
            )}
            {(codes?.icloud_id || codes?.icloud_password) && (
              <div className="space-y-2">
                <Label className="font-semibold text-base">Compte iCloud</Label>
                {codes?.icloud_id && (
                  <div className="pl-4">
                    <Label className="text-xs text-muted-foreground">Identifiant</Label>
                    <p className="font-mono">{codes.icloud_id}</p>
                  </div>
                )}
                {codes?.icloud_password && (
                  <div className="pl-4">
                    <Label className="text-xs text-muted-foreground">Mot de passe</Label>
                    <p className="font-mono text-lg font-semibold">{codes.icloud_password}</p>
                  </div>
                )}
              </div>
            )}
            {codes?.sim_pin && (
              <div>
                <Label className="text-sm text-muted-foreground">Code PIN SIM</Label>
                <p className="font-mono text-lg font-semibold">{codes.sim_pin}</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3 py-4 text-muted-foreground">
            <ShieldOff className="h-5 w-5" />
            <p className="text-sm italic">Pas d'identifiant et mot de passe renseigné</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
