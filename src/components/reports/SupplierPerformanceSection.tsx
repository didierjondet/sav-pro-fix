import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSupplierReportData } from '@/hooks/useSupplierReportData';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import type { ReportData } from '@/hooks/useReportData';

interface Props {
  reportData: ReportData;
  dateRange: { start: Date; end: Date };
}

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);

const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) =>
  setter(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

export function SupplierPerformanceSection({ reportData, dateRange }: Props) {
  const { rows, totals } = useSupplierReportData(reportData);
  const { allTypes } = useShopSAVTypes();
  const [openSuppliers, setOpenSuppliers] = useState<Set<string>>(new Set());
  const [openTypes, setOpenTypes] = useState<Set<string>>(new Set());
  const getTypeInfo = (key: string) => {
    const t = allTypes.find(x => x.type_key === key);
    return { label: t?.type_label || key, color: t?.type_color || 'hsl(var(--muted-foreground))' };
  };

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
                {rows.map((r) => {
                  const sKey = r.supplier_id ?? 'none';
                  const sOpen = openSuppliers.has(sKey);
                  return (
                    <Fragment key={sKey}>
                      <TableRow
                        onClick={() => toggle(setOpenSuppliers, sKey)}
                        className={cn('cursor-pointer', !r.supplier_id && 'text-muted-foreground italic')}
                      >
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-1">
                            <ChevronRight className={cn('h-4 w-4 transition-transform print:hidden', sOpen && 'rotate-90')} />
                            {r.supplier_name}
                          </span>
                        </TableCell>
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
                      {sOpen && r.types.map((t) => {
                        const tKey = `${sKey}::${t.sav_type}`;
                        const tOpen = openTypes.has(tKey);
                        const info = getTypeInfo(t.sav_type);
                        return (
                          <Fragment key={tKey}>
                            <TableRow
                              onClick={() => toggle(setOpenTypes, tKey)}
                              className="cursor-pointer bg-muted/40 print:hidden"
                            >
                              <TableCell className="pl-8">
                                <span className="inline-flex items-center gap-2 text-sm">
                                  <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', tOpen && 'rotate-90')} />
                                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: info.color }} />
                                  {info.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm">{t.parts_count}</TableCell>
                              <TableCell className="text-right text-sm">{t.sav_count}</TableCell>
                              <TableCell className="text-right text-sm text-destructive">{fmtMoney(t.expenses)}</TableCell>
                              <TableCell className="text-right text-sm">{fmtMoney(t.revenue)}</TableCell>
                              <TableCell />
                              <TableCell />
                              <TableCell className={cn('text-right text-sm', t.margin >= 0 ? 'text-green-600' : 'text-destructive')}>
                                {fmtMoney(t.margin)}
                              </TableCell>
                              <TableCell />
                            </TableRow>
                            {tOpen && t.lines.map((l, i) => (
                              <TableRow key={`${tKey}-${l.sav_id}-${i}`} className="bg-muted/20 print:hidden text-xs">
                                <TableCell className="pl-14" colSpan={2}>
                                  <Link to={`/sav/${l.sav_id}`} className="text-primary underline" onClick={(e) => e.stopPropagation()}>
                                    {l.case_number}
                                  </Link>
                                  <span className="text-muted-foreground"> · {l.customer_name} · {l.part_name} × {l.quantity}</span>
                                </TableCell>
                                <TableCell />
                                <TableCell className="text-right text-destructive">{fmtMoney(l.purchase)}</TableCell>
                                <TableCell className="text-right">{fmtMoney(l.revenue)}</TableCell>
                                <TableCell />
                                <TableCell />
                                <TableCell className={cn('text-right', l.margin >= 0 ? 'text-green-600' : 'text-destructive')}>
                                  {fmtMoney(l.margin)}
                                </TableCell>
                                <TableCell />
                              </TableRow>
                            ))}
                          </Fragment>
                        );
                      })}
                    </Fragment>
                  );
                })}
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
