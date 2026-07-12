import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSupplierReportData } from '@/hooks/useSupplierReportData';
import type { ReportData } from '@/hooks/useReportData';

interface Props {
  reportData: ReportData;
  dateRange: { start: Date; end: Date };
}

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);

export function SupplierPerformanceSection({ reportData, dateRange }: Props) {
  const { rows, totals } = useSupplierReportData(reportData);

  return (
    <Card className="print-supplier-section">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Performance fournisseurs
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Période : {format(dateRange.start, 'dd/MM/yyyy', { locale: fr })} – {format(dateRange.end, 'dd/MM/yyyy', { locale: fr })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            Aucune pièce utilisée sur la période.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead className="text-right">Pièces</TableHead>
                  <TableHead className="text-right">SAV</TableHead>
                  <TableHead className="text-right">Dépenses HT</TableHead>
                  <TableHead className="text-right">CA HT</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead className="text-right">CA TTC</TableHead>
                  <TableHead className="text-right">Marge HT</TableHead>
                  <TableHead className="text-right">% Marge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.supplier_id ?? 'none'}
                    className={cn(!r.supplier_id && 'text-muted-foreground italic')}
                  >
                    <TableCell className="font-medium">{r.supplier_name}</TableCell>
                    <TableCell className="text-right">{r.parts_count}</TableCell>
                    <TableCell className="text-right">{r.sav_count}</TableCell>
                    <TableCell className="text-right text-destructive">{fmtMoney(r.expenses)}</TableCell>
                    <TableCell className="text-right">{fmtMoney(r.revenue)}</TableCell>
                    <TableCell className="text-right text-amber-600">{fmtMoney(r.vat_collected)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmtMoney(r.revenue_ttc)}</TableCell>
                    <TableCell className={cn(
                      'text-right font-semibold',
                      r.margin >= 0 ? 'text-green-600' : 'text-destructive'
                    )}>
                      {fmtMoney(r.margin)}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.revenue > 0 ? `${r.margin_pct.toFixed(1)}%` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">{totals.parts_count}</TableCell>
                  <TableCell className="text-right font-semibold">{totals.sav_count}</TableCell>
                  <TableCell className="text-right font-semibold text-destructive">{fmtMoney(totals.expenses)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtMoney(totals.revenue)}</TableCell>
                  <TableCell className="text-right font-semibold text-amber-600">{fmtMoney(totals.vat_collected)}</TableCell>
                  <TableCell className="text-right font-semibold text-muted-foreground">{fmtMoney(totals.revenue_ttc)}</TableCell>
                  <TableCell className={cn(
                    'text-right font-bold',
                    totals.margin >= 0 ? 'text-green-600' : 'text-destructive'
                  )}>
                    {fmtMoney(totals.margin)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {totals.revenue > 0 ? `${totals.margin_pct.toFixed(1)}%` : '-'}
                  </TableCell>
                </TableRow>
              </TableFooter>

            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
