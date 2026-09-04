import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, EyeOff } from 'lucide-react';
import { useLegalVisibility, WHITE_LABEL_SETTING_KEY } from '@/hooks/useLegalVisibility';

export function LegalVisibilityToggle() {
  const { hideLegal, isLoading } = useLegalVisibility();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      const { error } = await supabase
        .from('app_global_settings')
        .upsert(
          { key: WHITE_LABEL_SETTING_KEY, value: newValue as any },
          { onConflict: 'key' }
        );
      if (error) throw error;
      return newValue;
    },
    onSuccess: (newValue) => {
      queryClient.setQueryData(['app_global_settings', WHITE_LABEL_SETTING_KEY], newValue);
      toast.success(
        newValue
          ? 'Mode discret activé : CGU/CGV masquées, mentions remplacées par Didier Jondet'
          : 'Mode discret désactivé : affichage d’origine restauré'
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
          <EyeOff className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <Label htmlFor="white-label-toggle" className="text-base font-semibold cursor-pointer">
              Mode discret (masquer CGU/CGV et mentions HAPICS)
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Quand activé : les liens CGU, CGV et Politique de confidentialité disparaissent du site
              public, et toute mention « HAPICS » affichée (factures, PDF, textes légaux) est remplacée
              par « Didier Jondet ». Aucun contenu n’est supprimé, le réglage est réversible.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(isLoading || mutation.isPending) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Switch
            id="white-label-toggle"
            checked={hideLegal}
            disabled={isLoading || mutation.isPending}
            onCheckedChange={(checked) => mutation.mutate(checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
