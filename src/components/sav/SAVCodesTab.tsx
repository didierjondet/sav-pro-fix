import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatternLock } from '@/components/sav/PatternLock';
import { SecurityCodesDisplay } from '@/components/sav/SecurityCodesDisplay';
import { supabase } from '@/integrations/supabase/client';
import { Lock } from 'lucide-react';

interface SAVCodesTabProps {
  savCase: any;
}

export function SAVCodesTab({ savCase }: SAVCodesTabProps) {
  const isFinalStatus = savCase.status === 'ready' || savCase.status === 'cancelled';

  return (
    <div className="space-y-4">
      {isFinalStatus ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" /> Codes de sécurité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Les codes de sécurité ont été supprimés automatiquement puisque ce dossier est clôturé.
            </p>
          </CardContent>
        </Card>
      ) : (
        <SecurityCodesDisplay
          savCase={savCase}
          onUpdate={async (codes) => {
            await supabase
              .from('sav_cases')
              .update({
                security_codes: (codes.unlock_code || codes.icloud_id || codes.icloud_password || codes.sim_pin || codes.email_id || codes.email_password)
                  ? (codes as any)
                  : null,
              })
              .eq('id', savCase.id);
          }}
        />
      )}

      {savCase.unlock_pattern && savCase.unlock_pattern.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PatternLock pattern={savCase.unlock_pattern} onChange={() => {}} disabled={true} showPattern={true} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schéma de verrouillage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ce schéma de verrouillage a été enregistré lors de la création du dossier SAV.
                Il contient {savCase.unlock_pattern.length} points connectés.
              </p>
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium">Séquence: {savCase.unlock_pattern.join(' → ')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
