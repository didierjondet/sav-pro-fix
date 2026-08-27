import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/ui/number-input';
import { Badge } from '@/components/ui/badge';
import { Quote } from '@/hooks/useQuotes';
import { getPaymentInfo, useQuoteActions } from '@/lib/quoteActions';

interface Props {
  quote: Quote;
}

/**
 * Gestion de l'acompte / règlement total d'un devis.
 * Utilisé sur la page Devis et dans l'onglet Devis d'un SAV.
 */
export function SAVQuoteDepositControl({ quote }: Props) {
  const { setQuoteDeposit } = useQuoteActions();
  const [value, setValue] = useState<number>(Number(quote.deposit_amount || 0));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(Number(quote.deposit_amount || 0));
  }, [quote.deposit_amount]);

  const info = getPaymentInfo(quote.total_amount, value);

  const save = async (amount: number) => {
    setSaving(true);
    setValue(amount);
    await setQuoteDeposit(quote, amount);
    setSaving(false);
  };

  return (
    <div className="rounded-md border p-3 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Règlement</span>
        <Badge variant={info.state === 'paid' ? 'default' : info.state === 'partial' ? 'secondary' : 'outline'}>
          {info.label}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-32">
          <NumberInput
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
            onBlur={() => {
              if (Number(quote.deposit_amount || 0) !== value) save(value);
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
          onClick={() => save(Number(Number(quote.total_amount || 0).toFixed(2)))}
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
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Total : <span className="text-foreground font-medium">{info.total.toFixed(2)}€</span></span>
        <span>Acompte : <span className="text-foreground font-medium">{info.deposit.toFixed(2)}€</span></span>
        <span>Reste à payer : <span className="text-foreground font-semibold">{info.remaining.toFixed(2)}€</span></span>
      </div>
    </div>
  );
}
