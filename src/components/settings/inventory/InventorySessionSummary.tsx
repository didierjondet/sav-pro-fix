import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InventorySessionItem } from './types';

function currency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

interface InventorySessionSummaryProps {
  pendingCount: number;
  exactCount: number;
  adjustedCount: number;
  missingCount: number;
  overstockCount: number;
  varianceValue: number;
  overwrittenItems: InventorySessionItem[];
}

export function InventorySessionSummary({
  pendingCount,
  exactCount,
  adjustedCount,
  missingCount,
  overstockCount,
  varianceValue,
  overwrittenItems,
}: InventorySessionSummaryProps) {
  const summaryCards = [
    { label: 'À traiter', value: pendingCount },
    { label: 'Exactes', value: exactCount },
    { label: 'Écarts', value: adjustedCount },
    { label: 'Manquantes', value: missingCount },
    { label: 'Surplus', value: overstockCount },
    { label: 'Valeur d’écart', value: currency(varianceValue) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Synthèse de rapprochement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="font-medium text-foreground">Pièces non traitées</div>
              <div className="mt-1">{pendingCount} ligne(s) demandent encore une décision avant clôture.</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="font-medium text-foreground">Produits manquants</div>
              <div className="mt-1">{missingCount} ligne(s) passeront à 0 si vous appliquez l’inventaire.</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="font-medium text-foreground">Stocks écrasés</div>
              <div className="mt-1">{overwrittenItems.length} ligne(s) modifieront le stock Fixway.</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
