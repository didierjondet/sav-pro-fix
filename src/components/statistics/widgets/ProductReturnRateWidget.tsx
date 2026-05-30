import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Repeat, AlertTriangle, RefreshCcw } from 'lucide-react';
import { useProductReturnStats } from '@/hooks/useProductReturnStats';

type Period = '7d' | '30d' | '1m_calendar' | '3m' | '6m' | '1y';

interface Props {
  period: Period;
}

export function ProductReturnRateWidget({ period }: Props) {
  const { data, isLoading } = useProductReturnStats(period);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Repeat className="h-4 w-4" />
          Taux de retour produit
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {isLoading || !data ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCcw className="h-3 w-3" /> Retours
                </div>
                <div className="text-2xl font-semibold">{data.totalReturns}</div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(data.returnRate)}% des SAV
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-destructive" /> Même panne
                </div>
                <div className="text-2xl font-semibold text-destructive">
                  {data.sameIssueReturns}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(data.sameIssueRate)}% des SAV
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Autre panne</div>
                <div className="text-2xl font-semibold">{data.otherIssueReturns}</div>
                <div className="text-xs text-muted-foreground">
                  sur {data.totalCasesInPeriod} SAV
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Top produits récurrents
              </div>
              {data.topProducts.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Aucun retour sur la période.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.topProducts.map((p) => (
                    <div
                      key={p.trackedProductId}
                      className="flex items-center justify-between border rounded-md px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {[p.brand, p.model].filter(Boolean).join(' ') || 'Produit inconnu'}
                        </div>
                        {p.imeiMasked && (
                          <div className="text-xs text-muted-foreground font-mono">
                            IMEI {p.imeiMasked}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">{p.returnCount} retour{p.returnCount > 1 ? 's' : ''}</Badge>
                        {p.sameIssueCount > 0 && (
                          <Badge variant="destructive">{p.sameIssueCount} même panne</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
