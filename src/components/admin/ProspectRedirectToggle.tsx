import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Settings2 } from 'lucide-react';
import { useProspectRedirect, PROSPECT_REDIRECT_SETTING_KEY } from '@/hooks/useProspectRedirect';

export function ProspectRedirectToggle() {
  const { enabled, isLoading } = useProspectRedirect();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      const { error } = await supabase
        .from('app_global_settings')
        .upsert(
          { key: PROSPECT_REDIRECT_SETTING_KEY, value: newValue as any },
          { onConflict: 'key' }
        );
      if (error) throw error;
      return newValue;
    },
    onSuccess: (newValue) => {
      queryClient.setQueryData(
        ['app_global_settings', PROSPECT_REDIRECT_SETTING_KEY],
        newValue
      );
      toast.success(
        newValue
          ? 'Inscriptions redirigées vers le formulaire prospect'
          : 'Inscriptions ouvertes (comportement initial restauré)'
      );
    },
    onError: (err: any) => {
      console.error(err);
      toast.error('Erreur lors de la mise à jour du réglage');
    },
  });

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-[260px]">
          <Settings2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <Label htmlFor="prospect-redirect-toggle" className="text-base font-semibold cursor-pointer">
              Rediriger les inscriptions vers le formulaire prospect
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Quand activé : les boutons « Essai gratuit » et l'onglet « Inscription » de la page de connexion ouvrent le formulaire prospect. Le bouton « Connexion » reste fonctionnel pour les magasins existants.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(isLoading || mutation.isPending) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Switch
            id="prospect-redirect-toggle"
            checked={enabled}
            disabled={isLoading || mutation.isPending}
            onCheckedChange={(checked) => mutation.mutate(checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
