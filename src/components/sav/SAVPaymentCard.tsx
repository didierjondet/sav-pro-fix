import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NumberInput } from '@/components/ui/number-input';
import { Euro } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getPaymentInfo } from '@/lib/quoteActions';

interface Props {
  savCaseId: string;
  totalCost?: number | null;
  takeoverAmount?: number | null;
  takenOver?: boolean | null;
  partialTakeover?: boolean | null;
  depositAmount?: number | null;
}

/**
 * Bloc règlement d'un SAV : total, acompte versé, reste à payer.
 */
export function SAVPaymentCard({
  savCaseId,
  totalCost,
  takeoverAmount,
  takenOver,
  partialTakeover,
  depositAmount,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [value, setValue] = useState<number>(Number(depositAmount || 0));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(Number(depositAmount || 0));
  }, [depositAmount]);

  const takeover = takenOver || partialTakeover
    ? (partialTakeover ? Number(takeoverAmount || 0) : Number(totalCost || 0))
    : 0;
  const netTotal = Math.max(0, Number(totalCost || 0) - takeover);
  const info = getPaymentInfo(netTotal, value);

  const save = async (amount: number) => {
    const clean = Math.max(0, Number(amount) || 0);
    setSaving(true);
    setValue(clean);
    const { error } = await supabase
      .from('sav_cases')
      .update({ deposit_amount: clean })
      .eq('id', savCaseId);
    setSaving(false);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['sav-cases'] });
    queryClient.invalidateQueries({ queryKey: ['sav-case'] });
    toast({
      title: 'Règlement mis à jour',
      description: clean >= netTotal && netTotal > 0
        ? 'Dossier réglé en totalité'
        : `Reste à payer : ${Math.max(0, netTotal - clean).toFixed(2)}€`,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Euro className="h-4 w-4" /> Règlement
          </span>
          <Badge variant={info.state === 'paid' ? 'default' : info.state === 'partial' ? 'secondary' : 'outline'}>
            {info.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Total à régler</p>
            <p className="font-medium">{info.total.toFixed(2)}€</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Acompte / réglé</p>
            <p className="font-medium">{info.deposit.toFixed(2)}€</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reste à payer</p>
            <p className="font-semibold">{info.remaining.toFixed(2)}€</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-32">
            <NumberInput
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
              onBlur={() => {
                if (Number(depositAmount || 0) !== value) save(value);
              }}
              className="text-right h-8"
              placeholder="0.00"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={saving}
            onClick={() => save(Number(netTotal.toFixed(2)))}
          >
            Réglé en totalité
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            disabled={saving}
            onClick={() => save(0)}
          >
            Aucun règlement
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
